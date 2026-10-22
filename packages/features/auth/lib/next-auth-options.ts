import { connectedProvider } from "./connected-provider";
import { managedSettings, verifyManagedSignIn } from "./managed-signin";
import { pramaanFromEnv } from "@scheduling/pramaan";
import { createHash } from "node:crypto";
import process from "node:process";
import { CredentialRepository } from "@scheduling/features/credentials/repositories/CredentialRepository";
import { ProfileRepository } from "@scheduling/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@scheduling/features/users/repositories/UserRepository";
import { isPasswordValid } from "@scheduling/lib/auth/isPasswordValid";
import { checkRateLimitAndThrowError } from "@scheduling/lib/checkRateLimitAndThrowError";
import { ENABLE_PROFILE_SWITCHER, IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@scheduling/lib/constants";
import { symmetricDecrypt, symmetricEncrypt } from "@scheduling/lib/crypto";
import { defaultCookies } from "@scheduling/lib/default-cookies";
import { isENVDev } from "@scheduling/lib/env";
import logger from "@scheduling/lib/logger";
import { randomString } from "@scheduling/lib/random";
import { safeStringify } from "@scheduling/lib/safeStringify";
import { hashEmail } from "@scheduling/lib/server/PiiHasher";
import slugify from "@scheduling/lib/slugify";
import type { TrackingData } from "@scheduling/lib/tracking";
import prisma from "@scheduling/prisma";
import type { Membership, Team } from "@scheduling/prisma/client";
import { CreationSource, IdentityProvider, MembershipRole, UserPermissionRole } from "@scheduling/prisma/enums";
import { teamMetadataSchema, userMetadata } from "@scheduling/prisma/zod-utils";
import type { UserProfile } from "@scheduling/types/UserProfile";
import type { Account, AuthOptions, Profile, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { encode } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "./email-provider";
import type { Provider } from "next-auth/providers/index";
import { getOrgUsernameFromEmail } from "../signup/utils/getOrgUsernameFromEmail";
import { ErrorCode } from "./ErrorCode";
import SchedulingAdapter from "./next-auth-custom-adapter";
import { verifyPassword } from "./verifyPassword";

type UserWithProfiles = NonNullable<
  Awaited<ReturnType<UserRepository["findByEmailAndIncludeProfilesAndPassword"]>>
>;

interface ExtendedOAuthProfile extends Profile {
  email_verified?: boolean; // Connected-account claim.
  xms_edov?: boolean | string | number; // Azure AD specific
}

// This adapts our internal user model to what NextAuth expects
// NextAuth core requires id to be a string, so we handle that here
const AdapterUserPresenter = {
  fromCalUser: (
    user: UserWithProfiles,
    role: UserPermissionRole | "INACTIVE_ADMIN",
    hasActiveTeams: boolean
  ) => ({
    ...user,
    role: role as UserPermissionRole,
    belongsToActiveTeam: hasActiveTeams,
    profile: user.allProfiles[0],
  }),
};

// Account presenter to handle linkAccount calls
const AdapterAccountPresenter = {
  fromCalAccount: (account: Account, userId: number, providerEmail: string) => {
    return {
      ...account,
      userId: String(userId), // Convert userId to string for Next Auth
      providerEmail,
      // Ensure these required fields are present
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      type: account.type,
    };
  },
};

const log = {
  debug: (..._args: unknown[]) => {},
  warn: (..._args: unknown[]) => {},
  error: (..._args: unknown[]) => {},
};
const ORGANIZATIONS_AUTOLINK =
  process.env.ORGANIZATIONS_AUTOLINK === "1" || process.env.ORGANIZATIONS_AUTOLINK === "true";

const usernameSlug = (username: string) => `${slugify(username)}-${randomString(6).toLowerCase()}`;
const getDomainFromEmail = (email: string): string => email.split("@")[1];

const loginWithTotp = async (email: string) =>
  `/auth/login?totp=${encodeURIComponent(await (await import("./signJwt")).default({ email }))}`;

type UserTeams = {
  teams: (Membership & {
    team: Pick<Team, "metadata">;
  })[];
};

export const checkIfUserBelongsToActiveTeam = <T extends UserTeams>(user: T) =>
  user.teams.some((m: { team: { metadata: unknown } }) => {
    if (!IS_TEAM_BILLING_ENABLED) {
      return true;
    }

    const metadata = teamMetadataSchema.safeParse(m.team.metadata);

    return metadata.success && metadata.data?.subscriptionId;
  });

const checkIfUserShouldBelongToOrg = async (idP: IdentityProvider, email: string) => {
  const [orgUsername, apexDomain] = email.split("@");
  if (!ORGANIZATIONS_AUTOLINK || (idP !== "GOOGLE" && idP !== "AZUREAD"))
    return { orgUsername, orgId: undefined };
  const existingOrg = await prisma.team.findFirst({
    where: {
      organizationSettings: {
        isOrganizationVerified: true,
        orgAutoAcceptEmail: apexDomain,
      },
    },
    select: {
      id: true,
    },
  });
  return { orgUsername, orgId: existingOrg?.id };
};

/**
 * Authorize function for credentials provider
 * Extracted for testability
 */
export async function authorizeCredentials(
  credentials: Record<"email" | "password" | "totpCode" | "backupCode", string> | undefined
): Promise<User | null> {
  log.debug("CredentialsProvider:credentials:authorize", safeStringify({ credentials }));
  if (!credentials) {
    console.error(`For some reason credentials are missing`);
    throw new Error(ErrorCode.InternalServerError);
  }

  const userRepo = new UserRepository(prisma);
  const user = await userRepo.findByEmailAndIncludeProfilesAndPassword({
    email: credentials.email,
  });
  // Don't leak information about it being username or password that is invalid
  if (!user) {
    throw new Error(ErrorCode.IncorrectEmailPassword);
  }

  // Locked users cannot login
  if (user.locked) {
    throw new Error(ErrorCode.UserAccountLocked);
  }

  await checkRateLimitAndThrowError({
    identifier: hashEmail(user.email),
  });
  if (!user.password?.hash) {
    throw new Error(ErrorCode.IncorrectEmailPassword);
  }

  // Always verify password for users who have one
  const isCorrectPassword = await verifyPassword(credentials.password, user.password.hash);
  if (!isCorrectPassword) {
    throw new Error(ErrorCode.IncorrectEmailPassword);
  }

  if (user.twoFactorEnabled && credentials.backupCode) {
    if (!process.env.SCHEDULING_ENCRYPTION_KEY) {
      console.error("Missing encryption key; cannot proceed with backup code login.");
      throw new Error(ErrorCode.InternalServerError);
    }

    if (!user.backupCodes) throw new Error(ErrorCode.MissingBackupCodes);

    const backupCodes = JSON.parse(symmetricDecrypt(user.backupCodes, process.env.SCHEDULING_ENCRYPTION_KEY));

    // check if user-supplied code matches one
    const index = backupCodes.indexOf(credentials.backupCode.replaceAll("-", ""));
    if (index === -1) throw new Error(ErrorCode.IncorrectBackupCode);

    // delete verified backup code and re-encrypt remaining
    backupCodes[index] = null;
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        backupCodes: symmetricEncrypt(JSON.stringify(backupCodes), process.env.SCHEDULING_ENCRYPTION_KEY),
      },
    });
  } else if (user.twoFactorEnabled) {
    if (!credentials.totpCode) {
      throw new Error(ErrorCode.SecondFactorRequired);
    }

    if (!user.twoFactorSecret) {
      console.error(`Two factor is enabled for user ${user.id} but they have no secret`);
      throw new Error(ErrorCode.InternalServerError);
    }

    if (!process.env.SCHEDULING_ENCRYPTION_KEY) {
      console.error(`"Missing encryption key; cannot proceed with two factor login."`);
      throw new Error(ErrorCode.InternalServerError);
    }

    const secret = symmetricDecrypt(user.twoFactorSecret, process.env.SCHEDULING_ENCRYPTION_KEY);
    if (secret.length !== 32) {
      console.error(
        `Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`
      );
      throw new Error(ErrorCode.InternalServerError);
    }

    const isValidToken = (await import("@scheduling/lib/totp")).totpAuthenticatorCheck(
      credentials.totpCode,
      secret
    );
    if (!isValidToken) {
      throw new Error(ErrorCode.IncorrectTwoFactorCode);
    }
  }
  // Check if the user you are logging into has any active teams
  const hasActiveTeams = checkIfUserBelongsToActiveTeam(user);

  // authentication success- but does it meet the minimum password requirements?
  const validateRole = (role: UserPermissionRole) => {
    // User's role is not "ADMIN"
    if (role !== UserPermissionRole.ADMIN) return role;
    // User's identity provider is not "CAL"
    if (user.identityProvider !== IdentityProvider.CAL) return role;

    if (process.env.NEXT_PUBLIC_IS_E2E) {
      console.warn("E2E testing is enabled, skipping password and 2FA requirements for Admin");
      return role;
    }

    // User's password is valid and two-factor authentication is enabled
    if (isPasswordValid(credentials.password, false, true) && user.twoFactorEnabled) return role;
    // Code is running in a development environment
    if (isENVDev) return role;
    // By this point it is an ADMIN without valid security conditions
    return "INACTIVE_ADMIN";
  };

  const role = validateRole(user.role);
  const baseUser = AdapterUserPresenter.fromCalUser(user, role, hasActiveTeams);

  if (role === "INACTIVE_ADMIN") {
    const passwordValid = isPasswordValid(credentials.password, false, true);
    const has2FA = user.twoFactorEnabled;

    let reason: "both" | "password" | "2fa";

    if (!passwordValid && !has2FA) {
      reason = "both";
    } else if (!passwordValid) {
      reason = "password";
    } else {
      reason = "2fa";
    }

    return { ...baseUser, inactiveAdminReason: reason };
  }

  return baseUser;
}

export const SchedulingCredentialsProvider = CredentialsProvider({
  id: "credentials",
  name: "Scheduling",
  type: "credentials",
  credentials: {
    email: { label: "Email Address", type: "email", placeholder: "john.doe@example.com" },
    password: { label: "Password", type: "password", placeholder: "Your super secure password" },
    totpCode: { label: "Two-factor Code", type: "input", placeholder: "Code from authenticator app" },
    backupCode: { label: "Backup Code", type: "input", placeholder: "Two-factor backup code" },
  },
  authorize: authorizeCredentials,
});

const connected = connectedProvider(WEBAPP_URL);
export async function authorizeManagedCredentials(credentials: { token?: string } | undefined, settings = managedSettings(), client = pramaanFromEnv()) {
  if (!settings || !client || !credentials?.token) return null;
  const identity = await verifyManagedSignIn(credentials.token, settings, client);
  const bound = await prisma.user.findFirst({ where: { identityProvider: IdentityProvider.SAML, identityProviderId: identity.subject } });
  const record = bound || await prisma.user.upsert({ where: { email: identity.email }, update: {}, create: {
    email: identity.email, name: identity.name, username: `managed-${createHash("sha256").update(identity.subject).digest("hex").slice(0, 24)}`,
    identityProvider: IdentityProvider.SAML, identityProviderId: identity.subject,
    emailVerified: identity.emailVerified ? new Date() : null, creationSource: CreationSource.WEBAPP,
  } });
  // A valid email claim must never link an existing password account or bypass its second factor.
  if (record.identityProviderId !== identity.subject || record.identityProvider !== IdentityProvider.SAML || record.locked || record.twoFactorEnabled) return null;
  const user = await new UserRepository(prisma).findByEmailAndIncludeProfilesAndPassword({ email: record.email });
  if (!user) return null;
  return AdapterUserPresenter.fromCalUser(user, user.role, checkIfUserBelongsToActiveTeam(user));
}
const managedProvider = CredentialsProvider({
  id: "managed", name: "Managed sign-in", credentials: { token: { type: "password", label: "Session token" } },
  authorize: credentials => authorizeManagedCredentials(credentials),
});
const providers: Provider[] = [SchedulingCredentialsProvider, managedProvider, ...(connected ? [connected] : [])];
type SamlIdpUser = {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  name: string;
  email_verified: boolean;
  profile: UserProfile;
  samlTenant?: string;
};

providers.push(
  EmailProvider({
    type: "email",
    maxAge: 10 * 60 * 60, // Magic links are valid for 10 min only
    // Here we setup the sendVerificationRequest that calls the email template with the identifier (email) and token to verify.
    sendVerificationRequest: async (props) => (await import("./sendVerificationRequest")).default(props),
  })
);

function isNumber(n: string) {
  return !Number.isNaN(parseFloat(n)) && !Number.isNaN(+n);
}

const schedulingAdapter = SchedulingAdapter(prisma);

export const getOptions = ({
  getDubId,
  getTrackingData,
}: {
  /** so we can extract the attribution cookie in both pages and app routers */
  getDubId: () => string | undefined;
  /** Ad tracking data for LegacyPayment customer metadata */
  getTrackingData: () => TrackingData;
}): AuthOptions => ({
  adapter: schedulingAdapter,
  session: {
    strategy: "jwt",
  },
  jwt: {
    // decorate the native JWT encode function
    // Impl. detail: We don't pass through as this function is called with encode/decode functions.
    encode: async ({ token, maxAge, secret }) => {
      log.debug("jwt:encode", safeStringify({ token, maxAge }));
      if (token?.sub && isNumber(token.sub)) {
        const user = await prisma.user.findFirst({
          where: { id: Number(token.sub) },
          select: { metadata: true },
        });
        // if no user is found, we still don't want to crash here.
        if (user) {
          const metadata = userMetadata.parse(user.metadata);
          if (metadata?.sessionTimeout) {
            maxAge = metadata.sessionTimeout * 60;
          }
        }
      }
      return encode({ secret, token, maxAge });
    },
  },
  cookies: defaultCookies(WEBAPP_URL?.startsWith("https://")),
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error", // Error code passed in query string as ?error=
    verifyRequest: "/auth/verify",
    // newUser: "/auth/new", // New users will be directed here on first sign in (leave the property out if not of interest)
  },
  providers,
  callbacks: {
    async jwt({
      // Always available but with a little difference in value
      token,
      // Available only in case of signIn, signUp or useSession().update call.
      trigger,
      // Available when useSession().update is called. The value will be the POST data
      session,
      // Available only in the first call once the user signs in. Not available in subsequent calls
      user,
      // Available only in the first call once the user signs in. Not available in subsequent calls
      account,
    }) {
      log.debug("callbacks:jwt", safeStringify({ token, user, account, trigger, session }));
      // The data available in 'session' depends on what data was supplied in update method call of session
      if (trigger === "update") {
        return {
          ...token,
          profileId: session?.profileId ?? token.profileId ?? null,
          upId: session?.upId ?? token.upId ?? null,
          locale: session?.locale ?? token.locale ?? "en",
          name: session?.name ?? token.name,
          username: session?.username ?? token.username,
          email: session?.email ?? token.email,
        } as JWT;
      }
      const autoMergeIdentities = async () => {
        const existingUser = await prisma.user.findFirst({
          where: { email: token.email! },
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            name: true,
            email: true,
            role: true,
            locale: true,
            movedToProfileId: true,
            teams: {
              include: {
                team: {
                  select: {
                    id: true,
                    metadata: true,
                  },
                },
              },
            },
          },
        });

        if (!existingUser) {
          return token;
        }

        // Check if the existingUser has any active teams
        const belongsToActiveTeam = checkIfUserBelongsToActiveTeam(existingUser);
        const { teams: _teams, ...existingUserWithoutTeamsField } = existingUser;
        const allProfiles = await ProfileRepository.findAllProfilesForUserIncludingMovedUser(existingUser);
        log.debug(
          "callbacks:jwt:autoMergeIdentities",
          safeStringify({
            allProfiles,
          })
        );
        const { upId } = determineProfile({ profiles: allProfiles, token });

        const profile = await ProfileRepository.findByUpIdWithAuth(upId, existingUser.id);
        if (!profile) {
          throw new Error("Profile not found");
        }

        const profileOrg = profile?.organization;
        let orgRole: MembershipRole | undefined;
        // Get users role of org
        if (profileOrg) {
          const membership = await prisma.membership.findUnique({
            where: {
              userId_teamId: {
                teamId: profileOrg.id,
                userId: existingUser.id,
              },
            },
          });
          orgRole = membership?.role;
        }

        return {
          ...existingUserWithoutTeamsField,
          ...token,
          profileId: profile.id,
          upId,
          belongsToActiveTeam,
          orgAwareUsername: profileOrg ? profile.username : existingUser.username,
          // All organizations in the token would be too big to store. It breaks the sessions request.
          // So, we just set the currently switched organization only here.
          // platform org user don't need profiles nor domains
          org:
            profileOrg && !profileOrg.isPlatform
              ? {
                  id: profileOrg.id,
                  name: profileOrg.name,
                  slug: profileOrg.slug ?? "",
                  logoUrl: profileOrg.logoUrl,
                  fullDomain: WEBAPP_URL,
                  domainSuffix: "",
                  role: orgRole as MembershipRole, // It can't be undefined if we have a profileOrg
                }
              : null,
        } as JWT;
      };
      if (!user) {
        return await autoMergeIdentities();
      }
      if (!account) {
        return token;
      }
      if (account.type === "credentials") {
        log.debug("callbacks:jwt:accountType:credentials", safeStringify({ account }));
        // return token if credentials,saml-idp
        if (account.provider === "saml-idp") {
          const samlIdpUser = user as SamlIdpUser;
          const updatedToken = {
            ...token,
            // Server Session explicitly requires sub to be userId. So, override what is set by BoxyHQ
            sub: samlIdpUser.userId.toString(),
            upId: samlIdpUser.profile?.upId ?? token.upId ?? null,
          } as JWT;
          return updatedToken;
        }
        // any other credentials, add user info
        return {
          ...token,
          id: user.id,
          name: user.name,
          username: user.username,
          orgAwareUsername: user?.org ? user.profile?.username : user.username,
          email: user.email,
          role: user.role,
          impersonatedBy: user.impersonatedBy,
          belongsToActiveTeam: user?.belongsToActiveTeam,
          org: user?.org,
          locale: user?.locale,
          profileId: user.profile?.id ?? token.profileId ?? null,
          upId: user.profile?.upId ?? token.upId ?? null,
          inactiveAdminReason: user.inactiveAdminReason,
        } as JWT;
      }

      // The arguments above are from the provider so we need to look up the
      // user based on those values in order to construct a JWT.
      if (account.type === "oauth") {
        if (account.provider !== "connected") throw new Error("This sign-in option is not available yet.");
        const linked = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          include: { user: true },
        });
        if (!linked?.user) throw new Error("Sign-in could not be verified. Start again.");
        user.email = linked.user.email;
        return await autoMergeIdentities();
      }

      if (account.type === "email") {
        return await autoMergeIdentities();
      }

      log.warn(
        "callbacks:jwt - unknown account type",
        safeStringify({ accountType: account.type, accountProvider: account.provider })
      );
      return token;
    },
    async session({ session, token, user }) {
      log.debug("callbacks:session - Session callback called", safeStringify({ session, token, user }));
      const hasValidLicense = false;
      const profileId = token.profileId;
      const schedulingSession: Session = {
        ...session,
        profileId,
        upId: token.upId || session.upId,
        hasValidLicense,
        user: {
          ...session.user,
          id: token.id as number,
          name: token.name,
          username: token.username as string,
          orgAwareUsername: token.orgAwareUsername,
          role: token.role as UserPermissionRole,
          impersonatedBy: token.impersonatedBy,
          belongsToActiveTeam: token?.belongsToActiveTeam as boolean,
          org: token?.org,
          locale: token.locale,
          inactiveAdminReason: token.inactiveAdminReason,
        },
      };
      return schedulingSession;
    },
    async signIn({ user, profile, account }): Promise<boolean | string> {
      if (account?.type === "credentials" || account?.provider === "email") return true;
      if (account?.provider !== "connected") return false;
      const identity = (profile as any)?.result;
      if (!identity?.emailVerified || !identity.email || !user.name) return false;
      const linked = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        include: { user: true },
      });
      if (linked?.user) return linked.user.twoFactorEnabled ? loginWithTotp(linked.user.email) : true;
      // An email claim never links an existing account or grants organization membership.
      if (await prisma.user.findUnique({ where: { email: identity.email } })) return false;
      const created = await prisma.user.create({
        data: {
          username: usernameSlug(user.name),
          name: user.name,
          email: identity.email,
          emailVerified: new Date(),
          identityProvider: IdentityProvider.SAML,
          identityProviderId: account.providerAccountId,
          creationSource: CreationSource.WEBAPP,
        },
      });
      await schedulingAdapter.linkAccount(
        AdapterAccountPresenter.fromCalAccount(account, created.id, created.email)
      );
      return true;
    },
    /**
     * Used to handle the navigation right after successful login or logout
     */
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same domain
      else if (new URL(url).hostname === new URL(WEBAPP_URL).hostname) return url;
      return baseUrl;
    },
  },
});

/**
 * Identifies the profile the user should be logged into.
 */
const determineProfile = ({
  token,
  profiles,
}: {
  token: JWT;
  profiles: { id: number | null; upId: string }[];
}) => {
  // If profile switcher is disabled, we can only show the first profile.
  if (!ENABLE_PROFILE_SWITCHER) {
    return profiles[0];
  }

  if (token.upId) {
    // Otherwise use what's in the token
    return { profileId: token.profileId, upId: token.upId as string };
  }

  // If there is just one profile it has to be the one we want to log into.
  return profiles[0];
};
