"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
export function SetupStatus() {
  const path = usePathname();
  const [state, setState] = useState<{ configured: boolean; mail: boolean; signIn: boolean; billing: boolean; domains: boolean }>();
  useEffect(() => { fetch("/api/setup-status").then(r => r.ok ? r.json() : undefined).then(setState).catch(() => {}); }, []);
  if (!state) return null;
  return <aside className="border-subtle bg-default text-default border-b px-4 py-2 text-sm" aria-label="Setup status">
    {!state.configured && <p role="status">Add PRAMAAN_API_KEY to .env</p>}
    {path?.startsWith("/settings") && <>
      {!state.mail && <p>Email verification is not set up yet. Set EMAIL_FROM to an address your platform can send from. Local password sign-in remains available.</p>}
      {!state.signIn && <p>Connected sign-in is not set up yet. Local sign-in works. Set PRAMAAN_SIGNIN_CONNECTION_REF for enterprise sign-in, or PRAMAAN_SIGNIN_PRODUCT, PRAMAAN_SIGNIN_AUTHORIZATION_URL and PRAMAAN_SIGNIN_CLIENT_ID for social sign-in.</p>}
      {!state.billing && <p>Subscription plans are not set up yet. Set SCHEDULING_BILLING_PLAN_ID to enable plan review. Booking checkouts do not need a subscription plan.</p>}
      {!state.domains && <p>Custom domains are not set up yet. Set SCHEDULING_DOMAIN_REF, SCHEDULING_DOMAIN_SUFFIX and SCHEDULING_DOMAIN_TARGET. The local address works without them.</p>}
    </>}
  </aside>;
}
