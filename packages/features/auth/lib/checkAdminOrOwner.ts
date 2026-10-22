import { MembershipRole } from "@scheduling/prisma/enums";

export function checkAdminOrOwner(role: MembershipRole | null | undefined): role is "OWNER" | "ADMIN" {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}
