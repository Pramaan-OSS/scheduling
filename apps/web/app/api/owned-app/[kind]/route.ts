import { startOwnedConnection, CHECK_CONNECTION, CALENDAR_CONNECTION_APPS, type ConnectionIntent } from "@scheduling/features/bookings/owned-apps/connect";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import prisma from "@scheduling/prisma";
import { requirePramaan, pramaanKeySet } from "@scheduling/pramaan";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { ownedConnection, hostReference, type OwnedKind } from "@scheduling/features/bookings/owned-apps/server";
const searches = new Map<string, { expires: number; choices: Map<string, string>; cursors: Set<string>; pages: Map<string, { options: Array<{ choice: string; label: string }>; nextCursor: string | null }> }>();
async function context(kind: string) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id || !["meetings", "links", "calendars"].includes(kind)) throw new Error("Sign in first.");
  return { userId: session.user.id, kind: kind as OwnedKind };
}
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try { const { userId, kind } = await context((await params).kind);
    const connection = pramaanKeySet() ? await ownedConnection(userId, kind).catch(() => null) : null;
    return Response.json({ configured: pramaanKeySet(), connected: Boolean(connection), enabled: connection?.enabled || false });
  } catch { return Response.json({ message: "This connection could not be accessed." }, { status: 403 }); }
}
export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin) return Response.json({ message: "This request could not be verified." }, { status: 403 });
  try {
    const { userId, kind } = await context((await params).kind), body = await request.json();
    const cacheId = `${userId}:${kind}`;
    if (body.action === "search") {
      for (const [id, row] of searches) if (row.expires < Date.now()) searches.delete(id);
      let cache = searches.get(cacheId);
      if (!cache) { if (searches.size >= 100) searches.delete(searches.keys().next().value!); cache = { expires: Date.now() + 20 * 60_000, choices: new Map(), cursors: new Set(), pages: new Map() }; searches.set(cacheId, cache); }
      if (body.cursor && !cache.cursors.has(body.cursor)) throw new Error("Search again.");
      const cached = cache.pages.get(body.cursor || "first"); if (cached) return Response.json(cached);
      if (kind === "calendars") {
        const options = CALENDAR_CONNECTION_APPS.map((app, index) => {
          const choice = createHash("sha256").update(app).digest("hex"); cache.choices.set(choice, app);
          return { choice, label: `Calendar app ${index + 1}` };
        });
        const page = { options, nextCursor: null }; cache.pages.set("first", page);
        return Response.json(page);
      }
      const result = await requirePramaan().appsCatalogSearch({ query: kind === "meetings" ? "create video meeting room" : "create short link", limit: 10, ...(body.cursor ? { cursor: body.cursor } : {}) });
      const options = [];
      for (const row of result.results || []) {
        const app = row.app; if (typeof app !== "string") continue;
        const choice = createHash("sha256").update(app).digest("hex"); cache.choices.set(choice, app);
        options.push({ choice, label: `${kind === "meetings" ? "Meeting" : "Link"} app ${[...cache.choices.keys()].indexOf(choice) + 1}` });
      }
      if (result.nextCursor) cache.cursors.add(result.nextCursor);
      const page = { options, nextCursor: result.nextCursor || null }; cache.pages.set(body.cursor || "first", page);
      return Response.json(page);
    }
    if (body.action === "connect" && body.approved === true) {
      const cache = searches.get(cacheId), app = cache && cache.expires > Date.now() ? cache.choices.get(body.choice) : undefined;
      if (!app) throw new Error("Search again.");
      let credential = await prisma.credential.findFirst({ where: { userId, type: `pramaan_${kind}` }, orderBy: { id: "desc" } });
      const connectUrl = await startOwnedConnection(requirePramaan(), { app, endUserRef: hostReference(userId), redirectUrl: `${WEBAPP_URL}/settings/my-account/calendars` }, {
        async get() { return (credential?.key as { connectionRequest?: ConnectionIntent } | undefined)?.connectionRequest; },
        async save(connectionRequest) {
          const key = { ...(credential?.key as object || {}), connectionRequest };
          credential = credential ? await prisma.credential.update({ where: { id: credential.id }, data: { key } }) : await prisma.credential.create({ data: { type: `pramaan_${kind}`, userId, key } });
        },
      });
      await prisma.credential.update({ where: { id: credential!.id }, data: { key: { ...(credential!.key as object), app, enabled: false } } });
      return Response.json({ connectUrl });
    }
    if (kind === "links" && body.action === "enable") {
      if (body.enabled === true && (body.approved !== true || !await ownedConnection(userId, kind))) throw new Error("Connect first.");
      const credential = await prisma.credential.findFirst({ where: { userId, type: "pramaan_links" }, orderBy: { id: "desc" } });
      if (credential) await prisma.credential.update({ where: { id: credential.id }, data: { key: { ...(credential.key as object), enabled: body.enabled === true } } });
      return Response.json({ enabled: body.enabled === true });
    }
    throw new Error("Review the connection first.");
  } catch (error) { return Response.json({ message: error instanceof Error && [CHECK_CONNECTION, "This connection was already requested. Refresh settings to check it."].includes(error.message) ? error.message : "This connection is not available yet. Keep using the product's existing links." }, { status: 422 }); }
}
