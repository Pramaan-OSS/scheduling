import prisma from "@scheduling/prisma";
import { Cap, requirePramaan } from "@scheduling/pramaan";
export type OwnedKind = "meetings" | "links" | "calendars";
export const hostReference = (id: number) => `host_${id}`;
export async function ownedConnection(userId: number, kind: OwnedKind) {
  const credential = await prisma.credential.findFirst({ where: { userId, type: `pramaan_${kind}` }, orderBy: { id: "desc" } });
  const key = credential?.key as { app?: string; enabled?: boolean } | undefined;
  if (!key?.app) return null;
  const result = await requirePramaan().call(Cap.appsConnectionsList, { endUserRef: hostReference(userId), app: key.app }) as { results?: Array<{ app: string; status: string; access?: string }> };
  if (!result.results?.some(row => row.app === key.app && row.status === "active" && ["read-write", "full"].includes(row.access || ""))) return null;
  return { app: key.app, enabled: key.enabled === true };
}
