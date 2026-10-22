import { addEventTypesToDb, mockNoTranslations } from "@scheduling/testing/lib/bookingScenario/bookingScenario";
import { PrismaAppRepository } from "@scheduling/features/apps/repository/PrismaAppRepository";
import { DestinationCalendarRepository } from "@scheduling/features/calendars/repositories/DestinationCalendarRepository";
import { CredentialRepository } from "@scheduling/features/credentials/repositories/CredentialRepository";
import { EventTypeRepository } from "@scheduling/features/eventtypes/repositories/eventTypeRepository";
import { UserRepository } from "@scheduling/features/users/repositories/UserRepository";
import { prisma } from "@scheduling/prisma";
import { beforeEach, describe, expect, test } from "vitest";
const testUser = {
  email: "test@test.com",
  username: "test-user",
  organizationId: null,
};

const setupCredential = async (credentialInput) => {
  const exampleCredential = {
    id: 123,
    type: "test-credential",
    appId: "test-credential",
    userId: null,
    teamId: null,
  };

  return await CredentialRepository.create({ ...exampleCredential, ...credentialInput });
};

describe("deleteCredential", () => {
  beforeEach(async () => {
    mockNoTranslations();
  });

  describe("individual credentials", () => {
    test("Delete calendar credential", async () => {
      const handleDeleteCredential = (await import("./handleDeleteCredential")).default;

      const user = await new UserRepository(prisma).create({
        ...testUser,
      });

      const eventTypes = await addEventTypesToDb([
        {
          id: 1,
          userId: testUser.id,
        },
      ]);

      await PrismaAppRepository.seedApp("pramaan-calendar");

      const credential = await setupCredential({
        userId: user.id,
        type: "pramaan_calendar",
        appId: "pramaan-calendar",
      });

      await DestinationCalendarRepository.create({
        id: 1,
        integration: "pramaan_calendar",
        externalId: "test@google.com",
        primaryId: "test@google.com",
        userId: user.id,
        credentialId: credential.id,
      });

      await DestinationCalendarRepository.create({
        id: 2,
        integration: "pramaan_calendar",
        externalId: "test@google.com",
        primaryId: "test@google.com",
        eventTypeId: eventTypes[0].id,
        credentialId: credential.id,
      });

      const userCalendar = await DestinationCalendarRepository.getByUserId(user.id);
      expect(userCalendar).toBeDefined();

      const eventTypeCalendar = await DestinationCalendarRepository.getByEventTypeId(eventTypes[0].id);
      expect(eventTypeCalendar).toBeDefined();

      await handleDeleteCredential({ userId: user.id, userMetadata: user.metadata, credentialId: 123 });

      const userCalendarAfter = await DestinationCalendarRepository.getByUserId(user.id);
      expect(userCalendarAfter).toBeNull();

      const eventTypeCalendarAfter = await DestinationCalendarRepository.getByEventTypeId(eventTypes[0].id);
      expect(eventTypeCalendarAfter).toBeNull();
    });

    // TODO: Add test for payment apps
    // TODO: Add test for event type apps
  });
});
