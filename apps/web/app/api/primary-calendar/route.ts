import { calendarChoices } from "@scheduling/app-store/pramaan-calendar/lib/availability";
import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import prisma from "@scheduling/prisma";
import { Cap, requirePramaan, pramaanFromEnv, unavailableMessage } from "@scheduling/pramaan";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
async function user() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  return session?.user?.id ? prisma.user.findUnique({ where: { id: session.user.id } }) : null;
}
export async function GET() {
  const person = await user();
  if (!person) return Response.json({ message: "Sign in first." }, { status: 401 });
  const credential = await prisma.credential.findFirst({ where: { userId: person.id, type: "pramaan_calendar" } });
  const platform = pramaanFromEnv();
  try {
    const calendars = platform ? await calendarChoices(platform, person.email) : [];
    const key = credential?.key as { checkedCalendars?: string[] } | undefined;
    return Response.json({ connected: Boolean(credential), inbox: person.email, configured: Boolean(platform), calendars,
      checked: key?.checkedCalendars || calendars.filter(row => row.isPrimary).map(row => row.name) });
  } catch { return Response.json({ connected: Boolean(credential), inbox: person.email, configured: Boolean(platform), calendars: [], checked: [], message: "Cannot confirm availability. Calendar names could not be read." }); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin) return Response.json({ message: "This request could not be verified." }, { status: 403 });
  const person = await user();
  if (!person?.emailVerified) return Response.json({ message: "Verify your sign-in email first." }, { status: 403 });
  try {
    const platform = requirePramaan();
    const calendars = await calendarChoices(platform, person.email);
    const body = await request.json().catch(() => ({}));
    const primary = calendars.find(row => row.isPrimary) || (calendars.length === 1 ? calendars[0] : undefined);
    const selected = body.checked || (primary ? [primary.name] : []);
    if (!primary || !Array.isArray(selected) || selected.length < 1 || selected.length > 20 || new Set(selected).size !== selected.length || selected.some(name => typeof name !== "string" || !calendars.some(row => row.name === name)))
      return Response.json({ message: "Choose one to twenty calendars from the exact names shown." }, { status: 422 });
    const key = { inbox: person.email, checkedCalendars: selected as string[], timezone: person.timeZone || "UTC" };
    await prisma.$transaction(async database => {
      await database.app.upsert({ where: { slug: "pramaan-calendar" }, create: { slug: "pramaan-calendar", dirName: "pramaan-calendar", categories: ["calendar"], enabled: true }, update: { enabled: true } });
      const existing = await database.credential.findFirst({ where: { userId: person.id, type: "pramaan_calendar" } });
      const credential = existing ? await database.credential.update({ where: { id: existing.id }, data: { key } }) : await database.credential.create({ data: { type: "pramaan_calendar", key, userId: person.id, appId: "pramaan-calendar" } });
      await database.selectedCalendar.deleteMany({ where: { userId: person.id, integration: "pramaan_calendar" } });
      await database.selectedCalendar.create({ data: { userId: person.id, credentialId: credential.id, integration: "pramaan_calendar", externalId: person.email } });
      await database.destinationCalendar.upsert({ where: { userId: person.id }, create: { userId: person.id, credentialId: credential.id, integration: "pramaan_calendar", externalId: person.email, primaryEmail: person.email }, update: { credentialId: credential.id, integration: "pramaan_calendar", externalId: person.email, primaryEmail: person.email } });
    });
    return Response.json({ connected: true });
  } catch (error) { return Response.json({ message: unavailableMessage(error) }, { status: 422 }); }
}
