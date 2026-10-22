import { managedSettings } from "@scheduling/features/auth/lib/managed-signin";
export const dynamic = "force-dynamic";
export function GET() {
  const settings = managedSettings();
  return Response.json(settings ? { authUrl: settings.authUrl } : { authUrl: null }, { headers: { "Cache-Control": "no-store" } });
}
