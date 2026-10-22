import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import prisma from "@scheduling/prisma";
import { ownedConnection } from "@scheduling/features/bookings/owned-apps/server";
import { secureUrl } from "@scheduling/features/bookings/meeting-rooms/contracts";
async function context(id: number) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const event = await prisma.eventType.findUnique({ where: { id } });
  if (!session?.user?.id || event?.userId !== session.user.id) throw new Error("Only the event host can change this setting.");
  return { event, userId: session.user.id };
}
export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { event, userId } = await context(Number((await params).id));
    const options = (event.metadata as any)?.pramaanMeetingRoom;
    return Response.json({ connected: Boolean(await ownedConnection(userId, "meetings").catch(() => null)), enabled: options?.enabled === true, fallbackUrl: options?.fallbackUrl || "" });
  } catch { return Response.json({ message: "Only the event host can change this setting." }, { status: 403 }); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin) return Response.json({ message: "This request could not be verified." }, { status: 403 });
  try { const { event, userId } = await context(Number((await params).id)), body = await request.json();
    if (body.enabled === true && (body.approved !== true || !secureUrl(body.fallbackUrl) || Buffer.byteLength(process.env.SCHEDULING_ENCRYPTION_KEY || "") !== 32 || !await ownedConnection(userId, "meetings")))
      return Response.json({ message: "Connect your meeting app, configure private-link encryption, provide a pasted fallback link and approve room creation first." }, { status: 422 });
    await prisma.eventType.update({ where: { id: event.id }, data: { metadata: { ...(event.metadata as object || {}), pramaanMeetingRoom: { enabled: body.enabled === true, fallbackUrl: String(body.fallbackUrl || "") } } } });
    return Response.json({ message: "Meeting-room preference saved." });
  } catch { return Response.json({ message: "Meeting rooms are not available yet. Keep using a pasted link." }, { status: 422 }); }
}
