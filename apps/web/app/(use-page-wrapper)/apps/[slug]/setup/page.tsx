import { getServerSession } from "@scheduling/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import WeatherSettings from "@scheduling/app-store/weather_in_your_calendar/components/AppSettingsInterface";

export const metadata = { title: "Connection setup · Scheduling" };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) redirect("/auth/login");
  const { slug } = await params;
  if (slug === "pramaan-calendar") redirect("/settings/my-account/calendars");
  if (slug === "pramaan-payment") redirect("/settings/my-account/payments");
  if (slug === "weather_in_your_calendar") return <section className="rounded-xl border p-6"><h1>Forecast calendar</h1><WeatherSettings /></section>;
  return <section className="rounded-xl border p-6"><h1>Connection setup</h1><p>This connection is not available yet. Use your connected calendar in settings.</p><a href="/settings/my-account/calendars">Calendar settings</a></section>;
}
