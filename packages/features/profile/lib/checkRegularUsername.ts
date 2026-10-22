import { ProfileRepository } from "@scheduling/features/profile/repositories/ProfileRepository";
import { isBlacklisted, isUsernameReservedDueToMigration } from "@scheduling/lib/server/username";
import slugify from "@scheduling/lib/slugify";

export async function checkRegularUsername(_username: string, currentOrgDomain?: string | null) {
  const isCheckingUsernameInGlobalNamespace = !currentOrgDomain;
  const username = slugify(_username);

  const premium = false;
  if (await isBlacklisted(username)) return { available: false, premium, message: "Choose another booking address." };

  const profiles = currentOrgDomain
    ? await ProfileRepository.findManyByOrgSlugOrRequestedSlug({
        orgSlug: currentOrgDomain,
        usernames: [username],
      })
    : null;

  const user = profiles?.length ? profiles[0].user : null;

  if (user) {
    return {
      available: false as const,
      premium,
      message: "A user exists with that username",
    };
  }

  const isUsernameAvailable = isCheckingUsernameInGlobalNamespace
    ? !(await isUsernameReservedDueToMigration(username))
    : true;

  return {
    available: isUsernameAvailable,
    premium,
  };
}
