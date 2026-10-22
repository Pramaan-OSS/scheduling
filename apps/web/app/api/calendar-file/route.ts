import { readCalendarLink } from "@scheduling/emails/lib/calendar-link";

export async function GET(request: Request) {
  try {
    const content = readCalendarLink(new URL(request.url).searchParams.get("token") || "", process.env.NEXTAUTH_SECRET || "");
    return new Response(content, { headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="event.ics"',
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new Response("Calendar link is invalid or expired.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
