import type { Team } from "@scheduling/prisma/client";

/** Use an uploaded image or an application-owned placeholder. */
export function getPlaceholderAvatar(avatar: string | null | undefined, name: string | null | undefined) {
  if (avatar) return avatar;
  const initials = (name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  const safe = initials.replace(/[&<>"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="#ededed"/><text x="32" y="39" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#454545">${safe}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getOrgOrTeamAvatar(
  team: Pick<Team, "logoUrl" | "name"> & { parent?: Pick<Team, "logoUrl"> | null }
) {
  return getPlaceholderAvatar(team.logoUrl || team.parent?.logoUrl, team.name);
}
