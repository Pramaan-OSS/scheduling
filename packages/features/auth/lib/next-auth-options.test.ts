import { IdentityProvider, UserPermissionRole } from "@scheduling/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "./ErrorCode";

// Mock dependencies
vi.mock("@scheduling/prisma", () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  default: {
    user: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockFindByEmailAndIncludeProfilesAndPassword = vi.fn();

vi.mock("@scheduling/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: vi.fn().mockImplementation(function () {
      return {
        findByEmailAndIncludeProfilesAndPassword: mockFindByEmailAndIncludeProfilesAndPassword,
      };
    }),
  };
});

vi.mock("./verifyPassword", () => ({
  verifyPassword: vi.fn(),
}));

vi.mock("@scheduling/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@scheduling/lib/server/PiiHasher", () => ({
  hashEmail: vi.fn((email: string) => `hashed_${email}`),
}));

vi.mock("@scheduling/lib/totp", () => ({
  totpAuthenticatorCheck: vi.fn(),
}));

vi.mock("@scheduling/lib/crypto", () => ({
  symmetricDecrypt: vi.fn(),
  symmetricEncrypt: vi.fn(),
}));

vi.mock("@scheduling/lib/auth/isPasswordValid", () => ({
  isPasswordValid: vi.fn(),
}));

vi.mock("@scheduling/lib/env", () => ({
  isENVDev: false,
}));

vi.mock("@scheduling/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@scheduling/lib/constants")>();
  return {
    ...actual,
    IS_TEAM_BILLING_ENABLED: false,
    ENABLE_PROFILE_SWITCHER: false,
    WEBAPP_URL: "http://localhost:3000",
  };
});

vi.mock("@scheduling/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    })),
  },
}));

vi.mock("@scheduling/lib/safeStringify", () => ({
  safeStringify: vi.fn((obj) => JSON.stringify(obj)),
}));

vi.mock("./next-auth-custom-adapter", () => ({
  default: vi.fn(() => ({
    linkAccount: vi.fn(),
  })),
}));

vi.mock("@scheduling/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@scheduling/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findAllProfilesForUserIncludingMovedUser: vi.fn(),
    findByUpIdWithAuth: vi.fn(),
  },
}));

// Additional mocks for signIn/JWT callback tests
const mockCredentialRepoFindFirst = vi.fn();
const mockCredentialRepoFindFirstByUserIdAndType = vi.fn();
const mockCredentialRepoCreate = vi.fn();
const mockBuildCredentialCreateData = vi.fn();
const mockUpdateProfilePhotoMicrosoft = vi.fn();
const mockUpdateProfilePhotoGoogle = vi.fn();
const mockGetIdentityProvider = vi.fn();
const mockWaitUntil = vi.fn();
const mockPrismaUserFindFirst = vi.fn();
const mockPrismaUserCreate = vi.fn();
const mockPrismaUserUpdate = vi.fn();
const mockPrismaTeamFindFirst = vi.fn();
const mockPrismaSelectedCalendarCreate = vi.fn();
const mockLinkAccount = vi.fn();

vi.mock("@scheduling/features/credentials/repositories/CredentialRepository", () => ({
  CredentialRepository: {
    findFirstByAppIdAndUserId: (...args: unknown[]) => mockCredentialRepoFindFirst(...args),
    findFirstByUserIdAndType: (...args: unknown[]) => mockCredentialRepoFindFirstByUserIdAndType(...args),
    create: (...args: unknown[]) => mockCredentialRepoCreate(...args),
  },
}));

vi.mock("@scheduling/features/credentials/services/CredentialDataService", () => ({
  buildCredentialCreateData: (...args: unknown[]) => mockBuildCredentialCreateData(...args),
}));

vi.mock("@scheduling/app-store/_utils/oauth/updateProfilePhotoMicrosoft", () => ({
  updateProfilePhotoMicrosoft: (...args: unknown[]) => mockUpdateProfilePhotoMicrosoft(...args),
}));

vi.mock("@scheduling/app-store/_utils/oauth/updateProfilePhotoGoogle", () => ({
  updateProfilePhotoGoogle: (...args: unknown[]) => mockUpdateProfilePhotoGoogle(...args),
}));

vi.mock("@scheduling/features/auth/lib/identityProviders", () => ({
  getIdentityProvider: (...args: unknown[]) => mockGetIdentityProvider(...args),
}));

vi.mock("@scheduling/features/auth/lib/outlook", () => ({
  OUTLOOK_CLIENT_ID: "mock-client-id",
  OUTLOOK_CLIENT_SECRET: "mock-client-secret",
  OUTLOOK_LOGIN_ENABLED: true,
}));


vi.mock("@scheduling/lib/default-cookies", () => ({
  defaultCookies: vi.fn(() => ({})),
}));

vi.mock("@scheduling/lib/random", () => ({
  randomString: vi.fn(() => "abc123"),
}));

vi.mock("@scheduling/lib/slugify", () => ({
  default: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, "-")),
}));

vi.mock("@scheduling/app-store/googlecalendar/lib/CalendarService", () => ({
  createGoogleCalendarServiceWithGoogleType: vi.fn(),
}));



vi.mock("next-auth/jwt", () => ({
  encode: vi.fn(),
}));

vi.mock("./signJwt", () => ({
  default: vi.fn().mockResolvedValue("mock-jwt"),
}));

vi.mock("./dub", () => ({
  dub: { track: { lead: vi.fn() } },
}));

vi.mock("../signup/utils/getOrgUsernameFromEmail", () => ({
  getOrgUsernameFromEmail: vi.fn((email: string) => email.split("@")[0]),
}));

vi.mock("next-auth/providers/azure-ad", () => ({ default: vi.fn() }));
vi.mock("next-auth/providers/credentials", () => ({ default: vi.fn(() => ({ id: "credentials" })) }));
vi.mock("next-auth/providers/email", () => ({ default: vi.fn() }));
vi.mock("next-auth/providers/google", () => ({ default: vi.fn() }));

describe("CredentialsProvider authorize", () => {
  let authorizeCredentials: typeof import("./next-auth-options").authorizeCredentials;
  let verifyPassword: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFindByEmailAndIncludeProfilesAndPassword.mockReset();

    const verifyPasswordModule = await import("./verifyPassword");
    verifyPassword = verifyPasswordModule.verifyPassword;

    // Import the exported authorize function directly
    const authModule = await import("./next-auth-options");
    authorizeCredentials = authModule.authorizeCredentials;
  });

  const createMockUser = (overrides: Partial<any> = {}) => ({
    id: 1,
    email: "test@example.com",
    name: "Test User",
    username: "testuser",
    role: UserPermissionRole.USER,
    locked: false,
    identityProvider: IdentityProvider.CAL,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    backupCodes: null,
    password: {
      hash: "$2a$10$hashedpassword",
    },
    allProfiles: [
      {
        id: 1,
        upId: "usr_123",
        username: "testuser",
      },
    ],
    teams: [],
    ...overrides,
  });

  describe("Password validation", () => {
    it("should throw error when user has no password hash with CAL identity provider", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.CAL,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash with Google identity provider", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.GOOGLE,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash with SAML identity provider", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.SAML,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash even with TOTP code provided", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.CAL,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
          totpCode: "123456",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash with Google identity provider and TOTP code", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.GOOGLE,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
          totpCode: "123456",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });

    it("should throw error when user has no password hash with SAML identity provider and TOTP code", async () => {
      const mockUser = createMockUser({
        password: null,
        identityProvider: IdentityProvider.SAML,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      await expect(
        authorizeCredentials({
          email: "test@example.com",
          password: "password123",
          totpCode: "123456",
        } as any)
      ).rejects.toThrow(ErrorCode.IncorrectEmailPassword);
    });
  });

  describe("Inactive admin reason", () => {
    it("sets reason to 'both' when password is invalid and 2FA is disabled", async () => {
      const { isPasswordValid } = await import("@scheduling/lib/auth/isPasswordValid");
      vi.mocked(isPasswordValid).mockReturnValue(false);
      vi.mocked(verifyPassword).mockResolvedValue(true);

      const mockUser = createMockUser({
        role: UserPermissionRole.ADMIN,
        identityProvider: IdentityProvider.CAL,
        twoFactorEnabled: false,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      const result = await authorizeCredentials({
        email: mockUser.email,
        password: "password123",
        totpCode: "",
        backupCode: "",
      });

      expect(result?.role).toBe("INACTIVE_ADMIN");
      expect(result?.inactiveAdminReason).toBe("both");
    });

    it("sets reason to '2fa' when password is valid and 2FA is disabled", async () => {
      const { isPasswordValid } = await import("@scheduling/lib/auth/isPasswordValid");
      vi.mocked(isPasswordValid).mockReturnValue(true);
      vi.mocked(verifyPassword).mockResolvedValue(true);

      const mockUser = createMockUser({
        role: UserPermissionRole.ADMIN,
        identityProvider: IdentityProvider.CAL,
        twoFactorEnabled: false,
      });
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

      const result = await authorizeCredentials({
        email: mockUser.email,
        password: "password123",
        totpCode: "",
        backupCode: "",
      });

      expect(result?.role).toBe("INACTIVE_ADMIN");
      expect(result?.inactiveAdminReason).toBe("2fa");
    });

    it("sets reason to 'password' when password is invalid and 2FA is enabled", async () => {
      const originalKey = process.env.SCHEDULING_ENCRYPTION_KEY;
      process.env.SCHEDULING_ENCRYPTION_KEY = "test";

      try {
        const { isPasswordValid } = await import("@scheduling/lib/auth/isPasswordValid");
        vi.mocked(isPasswordValid).mockReturnValue(false);
        vi.mocked(verifyPassword).mockResolvedValue(true);

        const { symmetricDecrypt } = await import("@scheduling/lib/crypto");
        vi.mocked(symmetricDecrypt).mockReturnValue("a".repeat(32));

        const { totpAuthenticatorCheck } = await import("@scheduling/lib/totp");
        vi.mocked(totpAuthenticatorCheck).mockReturnValue(true);

        const mockUser = createMockUser({
          role: UserPermissionRole.ADMIN,
          identityProvider: IdentityProvider.CAL,
          twoFactorEnabled: true,
          twoFactorSecret: "encrypted_secret",
        });
        mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

        const result = await authorizeCredentials({
          email: mockUser.email,
          password: "password123",
          totpCode: "123456",
          backupCode: "",
        });

        expect(result?.role).toBe("INACTIVE_ADMIN");
        expect(result?.inactiveAdminReason).toBe("password");
      } finally {
        process.env.SCHEDULING_ENCRYPTION_KEY = originalKey;
      }
    });

    it("does not set inactiveAdminReason when admin requirements are met", async () => {
      const originalKey = process.env.SCHEDULING_ENCRYPTION_KEY;
      process.env.SCHEDULING_ENCRYPTION_KEY = "test";

      try {
        const { isPasswordValid } = await import("@scheduling/lib/auth/isPasswordValid");
        vi.mocked(isPasswordValid).mockReturnValue(true);
        vi.mocked(verifyPassword).mockResolvedValue(true);

        const { symmetricDecrypt } = await import("@scheduling/lib/crypto");
        vi.mocked(symmetricDecrypt).mockReturnValue("a".repeat(32));

        const { totpAuthenticatorCheck } = await import("@scheduling/lib/totp");
        vi.mocked(totpAuthenticatorCheck).mockReturnValue(true);

        const mockUser = createMockUser({
          role: UserPermissionRole.ADMIN,
          identityProvider: IdentityProvider.CAL,
          twoFactorEnabled: true,
          twoFactorSecret: "encrypted_secret",
        });
        mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(mockUser);

        const result = await authorizeCredentials({
          email: mockUser.email,
          password: "password123",
          totpCode: "123456",
          backupCode: "",
        });

        expect(result?.role).toBe(UserPermissionRole.ADMIN);
        expect(result?.inactiveAdminReason).toBeUndefined();
      } finally {
        process.env.SCHEDULING_ENCRYPTION_KEY = originalKey;
      }
    });
  });
});


describe("managed credentials account boundaries", () => {
  const signedToken = (email = "managed@example.test") => `header.${Buffer.from(JSON.stringify({ sub: "managed_person", email, emailVerified: true, name: "Person" })).toString("base64url")}.signature`;
  const settings = { authUrl: "https://signin.example.test/api/auth", jwksUrl: "https://signin.example.test/api/auth/jwks", origin: "http://localhost:3000" };
  beforeEach(async () => { vi.clearAllMocks(); mockFindByEmailAndIncludeProfilesAndPassword.mockReset(); const db = (await import("@scheduling/prisma")).default; vi.mocked(db.user.findFirst).mockResolvedValue(null); });
  it("opens an ordinary local session only for the verified bound account", async () => {
    const { authorizeManagedCredentials } = await import("./next-auth-options");
    const { FakePramaan } = await import("@scheduling/pramaan/fake");
    const db = (await import("@scheduling/prisma")).default;
    const platform = new FakePramaan({ "auth.token.verify": () => ({ valid: true, userId: "managed_person" }) });
    vi.mocked(db.user.upsert).mockImplementation(async ({ create }: any) => {
      const user = { ...create, id: 42, role: UserPermissionRole.USER, teams: [], allProfiles: [{ id: null, upId: "local-42" }] };
      mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(user); return user as any;
    });
    const result = await authorizeManagedCredentials({ token: signedToken() }, settings, platform);
    expect(result).toMatchObject({ id: 42, role: UserPermissionRole.USER, email: "managed@example.test" });
    expect(vi.mocked(db.user.upsert).mock.calls[0][0].update).toEqual({});
  });
  it("never merges a password account, bypasses a second factor or unlocks an account", async () => {
    const { authorizeManagedCredentials } = await import("./next-auth-options");
    const { verifyManagedSignIn } = await import("./managed-signin");
    const { FakePramaan } = await import("@scheduling/pramaan/fake");
    const db = (await import("@scheduling/prisma")).default;
    const platform = new FakePramaan({ "auth.token.verify": () => ({ valid: true, userId: "managed_person" }) });
    const identity = await verifyManagedSignIn(signedToken(), settings, platform);
    for (const record of [
      { identityProvider: IdentityProvider.CAL, identityProviderId: null },
      { identityProvider: IdentityProvider.SAML, identityProviderId: identity.subject, twoFactorEnabled: true },
      { identityProvider: IdentityProvider.SAML, identityProviderId: identity.subject, locked: true },
    ]) {
      vi.mocked(db.user.upsert).mockResolvedValue(record as any);
      expect(await authorizeManagedCredentials({ token: signedToken() }, settings, platform)).toBeNull();
    }
    expect(mockFindByEmailAndIncludeProfilesAndPassword).not.toHaveBeenCalled();
  });
  it("rejects a forged token before touching the account database", async () => {
    const { authorizeManagedCredentials } = await import("./next-auth-options");
    const { FakePramaan } = await import("@scheduling/pramaan/fake");
    const db = (await import("@scheduling/prisma")).default;
    const platform = new FakePramaan({ "auth.token.verify": () => ({ valid: false }) });
    await expect(authorizeManagedCredentials({ token: "forged" }, settings, platform)).rejects.toThrow("could not be verified");
    expect(db.user.upsert).not.toHaveBeenCalled();
  });
  it("keeps the same local account when the managed email changes", async () => {
    const { authorizeManagedCredentials } = await import("./next-auth-options");
    const { verifyManagedSignIn } = await import("./managed-signin");
    const { FakePramaan } = await import("@scheduling/pramaan/fake");
    const db = (await import("@scheduling/prisma")).default;
    const platform = new FakePramaan({ "auth.token.verify": () => ({ valid: true, userId: "managed_person" }) });
    const identity = await verifyManagedSignIn(signedToken("new@example.test"), settings, platform);
    const local = { id: 42, email: "old@example.test", identityProvider: IdentityProvider.SAML, identityProviderId: identity.subject, role: UserPermissionRole.USER, teams: [], allProfiles: [{ id: null, upId: "local-42" }] };
    vi.mocked(db.user.findFirst).mockResolvedValue(local as any); mockFindByEmailAndIncludeProfilesAndPassword.mockResolvedValue(local);
    expect(await authorizeManagedCredentials({ token: signedToken("new@example.test") }, settings, platform)).toMatchObject({ id: 42, email: "old@example.test" });
    expect(db.user.upsert).not.toHaveBeenCalled();
  });
});
