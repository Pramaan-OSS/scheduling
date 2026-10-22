import {
  addEventTypesToDb,
  addTeamsToDb,
  addUsersToDb,
  createCredentials,
} from "@scheduling/testing/lib/bookingScenario/bookingScenario";
import { UserRepository } from "@scheduling/features/users/repositories/UserRepository";
import { describe, expect, test, vi } from "vitest";

vi.mock("@scheduling/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: vi.fn().mockImplementation(function () {
      return {
        enrichUserWithItsProfile: vi.fn(),
      };
    }),
  };
});
describe("getAllCredentialsIncludeServiceAccountKey", () => {
  test("Get an individual's credentials", async () => {
    const mockEnrichUserWithItsProfile = vi.fn().mockReturnValue({
      profile: null,
    });

    const mockUserRepository = vi.mocked(UserRepository);
    if (mockUserRepository && typeof mockUserRepository.mockImplementation === "function") {
      mockUserRepository.mockImplementation(function () {
        return {
          enrichUserWithItsProfile: mockEnrichUserWithItsProfile,
        } as InstanceType<typeof UserRepository>;
      });
    }

    const getAllCredentialsIncludeServiceAccountKey = (await import("./getAllCredentials"))
      .getAllCredentialsIncludeServiceAccountKey;

    const userCredential = {
      id: 1,
      type: "user-credential",
      userId: 1,
      teamId: null,
      key: {},
      appId: "user-credential",
      invalid: false,
    };
    await createCredentials([
      userCredential,
      { type: "other-user-credential", userId: 2, key: {} },
      { type: "team-credential", teamId: 1, key: {} },
    ]);

    const credentials = await getAllCredentialsIncludeServiceAccountKey(
      {
        id: 1,
        username: "test",
        credentials: [{ ...userCredential, user: { email: "test@test.com" } }],
      },
      {
        userId: 1,
        team: null,
        parentId: null,
        metadata: {},
      }
    );

    expect(credentials).toHaveLength(1);

    expect(credentials).toContainEqual(expect.objectContaining({ type: "user-credential" }));
  });

});
