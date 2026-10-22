import prisma from "@scheduling/prisma";
import { Prisma } from "@scheduling/prisma/generated/prisma/client";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import { requirePramaan } from "@scheduling/pramaan";
import { ownedConnection } from "@scheduling/features/bookings/owned-apps/server";
import { shortenOwned, type LinkRecord, type LinkStore } from "./lifecycle";

type Metadata = Record<string, any>;
export async function ownedLinks(owner: number): Promise<LinkRecord[]> {
  const user = await prisma.user.findUnique({ where: { id: owner }, select: { metadata: true } });
  return Object.values((user?.metadata as Metadata)?.pramaanShortLinks || {});
}
export function userLinkStore(owner: number): LinkStore {
  async function alter(id: string, write: (old: LinkRecord | undefined, count: number) => LinkRecord | null) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const user = await prisma.user.findUnique({ where: { id: owner }, select: { metadata: true } });
      if (!user) return false;
      const metadata = (user.metadata || {}) as Metadata, rows = metadata.pramaanShortLinks || {};
      const value = write(rows[id], Object.keys(rows).length); if (!value) return false;
      const saved = await prisma.user.updateMany({ where: { id: owner, metadata: user.metadata === null ? { equals: Prisma.AnyNull } : { equals: user.metadata } }, data: { metadata: { ...metadata, pramaanShortLinks: { ...rows, [id]: value } } } });
      if (saved.count === 1) return true;
    }
    return false;
  }
  return {
    async get(id) { return (await ownedLinks(owner)).find(row => row.id === id) || null; },
    claim(row, previous) { return alter(row.id, (old, count) => previous ? old?.status === "ready" && old.operation === previous ? row : null : !old && count < 100 ? row : null); },
    save(row, expected) { return alter(row.id, old => old?.operation === expected ? row : null); },
  };
}
export async function shortenBookingUrl(owner: number, destinationUrl: string) {
  const own = new URL(WEBAPP_URL), url = new URL(destinationUrl);
  if (url.origin !== own.origin || url.username || url.password) return { shortLink: destinationUrl, message: "Use the product's own booking URL." };
  try {
    const connection = await ownedConnection(owner, "links");
    if (!connection?.enabled) return { shortLink: destinationUrl, message: "" };
    return await shortenOwned(userLinkStore(owner), requirePramaan(), owner, connection.app, destinationUrl);
  } catch { return { shortLink: destinationUrl, message: "Short links are not available yet. Use the product's own URL." }; }
}
export async function shortenBookingText(owner: number, body: string) {
  const urls = [...new Set(body.match(/https?:\/\/[^\s<>]+/g) || [])];
  let result = body;
  for (const url of urls.slice(0, 10)) {
    try { const short = await shortenBookingUrl(owner, url); result = result.split(url).join(short.shortLink); } catch { /* The original URL remains usable. */ }
  }
  return result;
}
