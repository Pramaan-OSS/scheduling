import type { Mock } from "vitest";
import { vi } from "vitest";

import {
  prismaMock,
  resetPrismaMock,
} from "@scheduling/features/auth/signup/handlers/__tests__/mocks/prisma.mocks";
import {
  createMockTeam,
  createMockFoundToken,
} from "@scheduling/features/auth/signup/handlers/__tests__/mocks/signup.factories";
import type { SignupBody } from "@scheduling/features/auth/signup/handlers/__tests__/mocks/signup.factories";

const mockFindTokenByToken: Mock = vi.fn();
const mockValidateAndGetCorrectedUsernameForTeam: Mock = vi.fn();

vi.mock("next/server", async () => {
  const { createNextServerMock } = await import(
    "@scheduling/features/auth/signup/handlers/__tests__/mocks/next.mocks"
  );
  return createNextServerMock();
});
vi.mock("@scheduling/prisma", async () => {
  const { createPrismaMock } = await import(
    "@scheduling/features/auth/signup/handlers/__tests__/mocks/prisma.mocks"
  );
  return createPrismaMock();
});
vi.mock("@scheduling/prisma/client", async () => {
  const { createPrismaMock } = await import(
    "@scheduling/features/auth/signup/handlers/__tests__/mocks/prisma.mocks"
  );
  return createPrismaMock();
});
vi.mock("@scheduling/lib/logger", () => ({
  default: { getSubLogger: () => ({ warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() }) },
}));
vi.mock("@scheduling/lib/auth/hashPassword", () => ({ hashPassword: vi.fn().mockResolvedValue("hashed") }));
vi.mock("@scheduling/lib/slugify", () => ({ default: vi.fn((s: string) => s.toLowerCase()) }));
vi.mock("@scheduling/lib/constants", () => ({ IS_PREMIUM_USERNAME_ENABLED: false }));
vi.mock("@scheduling/lib/server/username", () => ({
  isUsernameReservedDueToMigration: vi.fn().mockResolvedValue(false),
}));
vi.mock("@scheduling/features/auth/lib/verifyEmail", () => ({ sendEmailVerification: vi.fn() }));
vi.mock("@scheduling/features/auth/signup/utils/createOrUpdateMemberships", () => ({
  createOrUpdateMemberships: vi.fn(),
}));
vi.mock("@scheduling/features/auth/signup/utils/validateUsername", () => ({
  validateAndGetCorrectedUsernameAndEmail: vi.fn().mockResolvedValue({ isValid: true, username: "testuser" }),
}));
vi.mock("@scheduling/features/auth/signup/utils/organization", () => ({ joinAnyChildTeamOnOrgInvite: vi.fn() }));
vi.mock("@scheduling/features/auth/signup/utils/prefillAvatar", () => ({ prefillAvatar: vi.fn() }));
vi.mock("@scheduling/features/auth/signup/utils/token", () => ({
  findTokenByToken: (...args: unknown[]) => mockFindTokenByToken(...args),
  throwIfTokenExpired: vi.fn(),
  validateAndGetCorrectedUsernameForTeam: (...args: unknown[]) =>
    mockValidateAndGetCorrectedUsernameForTeam(...args),
}));

// Import after mocks
import handler from "./selfHostedHandler";
import { runP2002TestSuite } from "@scheduling/features/auth/signup/handlers/__tests__/p2002.test-suite";

function callHandler(body: SignupBody): ReturnType<typeof handler> {
  return handler(body as unknown as Record<string, string>);
}

runP2002TestSuite("selfHostedHandler", callHandler, () => {
  vi.clearAllMocks();
  resetPrismaMock();
  mockFindTokenByToken.mockResolvedValue(createMockFoundToken());
  mockValidateAndGetCorrectedUsernameForTeam.mockResolvedValue("testuser");
  prismaMock.team.findUnique.mockResolvedValue(createMockTeam() as never);
  prismaMock.verificationToken.delete.mockResolvedValue({} as never);
});
