import { pramaanKeySet } from "@scheduling/pramaan";
import { hasConnectedSignIn, signInConfiguration } from "@scheduling/features/auth/lib/connected-signin";
import { WEBAPP_URL } from "@scheduling/lib/constants";
import { serverConfig } from "@scheduling/lib/serverConfig";
import { managedSettings } from "@scheduling/features/auth/lib/managed-signin";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ configured: pramaanKeySet(), mail: Boolean(serverConfig.from), signIn: Boolean(managedSettings()) || hasConnectedSignIn(signInConfiguration(WEBAPP_URL)), billing: Boolean(process.env.SCHEDULING_BILLING_PLAN_ID), domains: Boolean(process.env.SCHEDULING_DOMAIN_REF && process.env.SCHEDULING_DOMAIN_SUFFIX && process.env.SCHEDULING_DOMAIN_TARGET) }, { headers: { "Cache-Control": "no-store" } });
}
