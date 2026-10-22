import { prisma } from "@scheduling/prisma/__mocks__/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@scheduling/features/watchlist/lib/utils/normalization", () => ({
  normalizeEmail: vi.fn(),
  extractDomainFromEmail: vi.fn(),
  normalizeDomain: vi.fn(),
}));
vi.mock("@scheduling/features/watchlist/lib/service/GlobalBlockingService", () => ({
  GlobalBlockingService: vi.fn(),
}));
vi.mock("@scheduling/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: vi.fn(),
}));
vi.mock("@scheduling/features/watchlist/operations/check-if-users-are-blocked.controller", () => ({
  checkIfUsersAreBlocked: vi.fn(),
}));
vi.mock("@scheduling/features/watchlist/lib/telemetry", () => ({
  tracingSpan: vi.fn(),
}));
vi.mock("@scheduling/lib/i18n", () => ({
  locales: ["en"],
  localeOptions: [{ value: "en", label: "English" }],
  defaultLocaleOption: { value: "en", label: "English" },
}));

import process from "node:process";
import { CredentialRepository } from "@scheduling/features/credentials/repositories/CredentialRepository";
import { symmetricDecrypt } from "@scheduling/lib/crypto";
import type { DestinationCalendar } from "@scheduling/prisma/client";
import type { CredentialForCalendarService } from "@scheduling/types/Credential";
import EventManager from "./EventManager";

vi.mock("@scheduling/prisma", () => ({
  prisma,
}));

vi.mock("@scheduling/lib/crypto", () => ({
  symmetricDecrypt: vi.fn(),
}));

vi.mock("@scheduling/features/credentials/repositories/CredentialRepository", () => ({
  CredentialRepository: {
    findCredentialForCalendarServiceById: vi.fn(),
  },
}));

vi.mock("@scheduling/app-store/delegationCredential", () => ({
  enrichHostsWithDelegationCredentials: vi.fn(),
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
  getCredentialForSelectedCalendar: vi.fn(),
}));

const mockedSymmetricDecrypt = vi.mocked(symmetricDecrypt);
const mockedCredentialRepository = vi.mocked(CredentialRepository);

function buildCalDAVCredential(data: {
  id: number;
  key: string;
  userId?: number;
}): CredentialForCalendarService {
  return {
    id: data.id,
    type: "pramaan_calendar",
    key: data.key,
    userId: data.userId || 1,
    user: { email: "test@example.com" },
    teamId: null,
    appId: "caldav-calendar",
    invalid: false,
    delegatedTo: null,
    delegationCredentialId: null,
  };
}

function buildDestinationCalendar(data: {
  id: number;
  integration: string;
  externalId: string | null;
}): DestinationCalendar {
  return {
    id: data.id,
    integration: data.integration,
    externalId: data.externalId || "",
    userId: 1,
    eventTypeId: null,
    credentialId: null,
    primaryEmail: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    delegationCredentialId: null,
  };
}

function buildCalendarCredential(data: {
  id: number;
  type?: string;
  userId?: number;
  delegatedToId?: string | null;
}): CredentialForCalendarService {
  return {
    id: data.id,
    type: data.type || "pramaan_calendar",
    key: {},
    userId: data.userId || 1,
    user: { email: "test@example.com" },
    teamId: null,
    appId: "pramaan-calendar",
    invalid: false,
    delegatedTo: null,
    delegationCredentialId: null,
    delegatedToId: data.delegatedToId || null,
  };
}

function buildVideoCredential(data: {
  id: number;
  type?: string;
  userId?: number;
}): CredentialForCalendarService {
  return {
    id: data.id,
    type: data.type || "resize_video",
    key: {},
    userId: data.userId || 1,
    user: { email: "test@example.com" },
    teamId: null,
    appId: "resize",
    invalid: false,
    delegatedTo: null,
    delegationCredentialId: null,
  };
}

describe("EventManager credential lookup methods", () => {
  let eventManager: EventManager;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCalendarCredential", () => {
    it("prefers delegation credentials when delegationCredentialId is provided", async () => {
      const delegatedCredential = buildCalendarCredential({
        id: 10,
        delegatedToId: "delegation-123",
      });
      eventManager = new EventManager({
        credentials: [delegatedCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getCalendarCredential(
        99,
        "pramaan_calendar",
        "delegation-123"
      );

      expect(result).toMatchObject({ id: 10, delegatedToId: "delegation-123" });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });

    it("fetches credential from repository when local cache misses", async () => {
      const dbCredential = buildCalendarCredential({ id: 5, type: "pramaan_calendar" });
      eventManager = new EventManager({
        credentials: [],
        destinationCalendar: null,
      });
      mockedCredentialRepository.findCredentialForCalendarServiceById.mockResolvedValue(dbCredential as any);

      const result = await (eventManager as any).getCalendarCredential(5, "pramaan_calendar");

      expect(result).toEqual(dbCredential);
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).toHaveBeenCalledWith({ id: 5 });
    });

    it("falls back to matching credential type when credentialId is absent", async () => {
      const calendarCredential = buildCalendarCredential({ id: 22, type: "pramaan_calendar" });
      eventManager = new EventManager({
        credentials: [calendarCredential],
        destinationCalendar: null,
      });

      const result = await (eventManager as any).getCalendarCredential(null, "pramaan_calendar");

      expect(result).toMatchObject({ id: 22, type: "pramaan_calendar" });
      expect(mockedCredentialRepository.findCredentialForCalendarServiceById).not.toHaveBeenCalled();
    });
  });
});
