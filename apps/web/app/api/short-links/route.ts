import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { ownedConnection } from "@scheduling/features/bookings/owned-apps/server";
import { ownedLinks, shortenBookingUrl, userLinkStore } from "@scheduling/features/url-shortener/server";
import { changeOwned } from "@scheduling/features/url-shortener/lifecycle";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import prisma from "@scheduling/prisma";
import { requirePramaan } from "@scheduling/pramaan";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
async function owner() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) throw new Error("Sign in first.");
  return session.user.id;
}
async function bookingDestination(userId: number, value: string) {
  const url = new URL(value), own = new URL(WEBAPP_URL);
  if (url.origin !== own.origin || url.username || url.password || url.search || url.hash) throw new Error("Use your own public booking link.");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== user?.username || !await prisma.eventType.findFirst({ where: { userId, slug: segments[1] }, select: { id: true } })) throw new Error("Use your own public booking link.");
  return url.toString();
}
export async function GET() {
  try { const id = await owner(); return Response.json({ links: (await ownedLinks(id)).map(({ id, status, destinationUrl, shortUrl, message }) => ({ id, status, destinationUrl, shortUrl, message })) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ message: "These links could not be accessed." }, { status: 403 }); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin) return Response.json({ message: "This request could not be verified." }, { status: 403 });
  try {
    const id = await owner(), body = await request.json();
    if (body.action === "create") {
      const destinationUrl = await bookingDestination(id, body.destinationUrl);
      return Response.json(await shortenBookingUrl(id, destinationUrl));
    }
    const row = (await ownedLinks(id)).find(row => row.id === body.id);
    if (!row || row.status !== "ready" || !row.ref) throw new Error("Check the previous request first.");
    const connection = await ownedConnection(id, "links");
    if (!connection?.enabled || connection.app !== row.app) throw new Error("Connect your own account first.");
    const client = requirePramaan(), input = { endUserRef: `host_${id}`, ref: row.ref };
    if (body.action === "get") {
      const result = await client.shortLinkGet(input);
      if (result.destinationUrl !== row.destinationUrl || result.shortUrl !== row.shortUrl || !Number.isSafeInteger(result.clicks) || result.clicks < 0) throw new Error("Read not confirmed.");
      return Response.json({ clicks: result.clicks, message: `${result.clicks} lifetime clicks.` });
    }
    if (body.action === "clicks") {
      const result = await client.shortLinkClicksGet(input);
      if (!Number.isSafeInteger(result.totalClicks) || result.totalClicks < 0 || !Array.isArray(result.days)) throw new Error("Read not confirmed.");
      return Response.json({ totalClicks: result.totalClicks, message: `${result.totalClicks} clicks in the last 30 days.` });
    }
    if (["update", "delete"].includes(body.action) && body.approved === true) {
      const destination = body.action === "update" ? await bookingDestination(id, body.destinationUrl) : undefined;
      return Response.json(await changeOwned(userLinkStore(id), client, id, row.id, body.action, destination));
    }
    throw new Error("Review the change first.");
  } catch { return Response.json({ message: "Short links are not available yet. Use the product's own URL; check any previous change in the connected app before trying again." }, { status: 422 }); }
}
