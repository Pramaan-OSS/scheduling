import { cookies, headers } from "next/headers";
import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { weatherCalendar } from "@scheduling/lib/integrations/weather";
import { calendarLink } from "@scheduling/emails/lib/calendar-link";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(WEBAPP_URL).origin) return Response.json({ message: "This request could not be verified." }, { status: 403 });
  if (!(await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) }))) return Response.json({ message: "Sign in first." }, { status: 401 });
  try {
    const { city } = await request.json();
    if (typeof city !== "string" || !city.trim() || city.length > 200) return Response.json({ message: "Enter a city." }, { status: 400 });
    return Response.json({ url: calendarLink(await weatherCalendar(city), WEBAPP_URL, process.env.NEXTAUTH_SECRET || "") });
  } catch (error) { return Response.json({ message: error instanceof Error ? error.message : "Forecasts are not available yet." }, { status: 422 }); }
}
