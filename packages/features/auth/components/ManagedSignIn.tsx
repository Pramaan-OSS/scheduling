"use client";
import { useEffect, useState, useRef } from "react";
import { createAuthClient } from "better-auth/client";
import { jwtClient } from "better-auth/client/plugins";
import { signIn } from "next-auth/react";
import { completeManagedSession } from "../lib/complete-managed-session";

export function ManagedSignIn({ callback = false }: { callback?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);
  useEffect(() => { fetch("/api/managed-signin/config", { cache: "no-store" }).then(r => r.json()).then(value => { setUrl(value.authUrl); if (callback && !value.authUrl) setError("Managed sign-in is not available yet. Use local sign-in."); }).catch(() => setError("Managed sign-in is not available yet. Use local sign-in.")); }, [callback]);
  async function finish(baseURL: string) {
    await completeManagedSession(baseURL, window.location.href, url => window.history.replaceState(null, "", url));
    const client = createAuthClient({ baseURL, plugins: [jwtClient()] });
    const result = await client.token();
    if (result.error || !result.data?.token) throw new Error();
    // The backend's own session cookie is not a signed token. Only the token endpoint supplies one.
    const local = await signIn("managed", { token: result.data.token, redirect: false, callbackUrl: "/" });
    if (!local?.ok || local.error) throw new Error();
    window.location.assign("/");
  }
  useEffect(() => {
    if (!callback || !url || started.current) return;
    started.current = true;
    finish(url).catch(() => setError("Managed sign-in could not be verified. Start sign-in again."));
  }, [callback, url]);
  if (!url && !callback) return null;
  const client = url ? createAuthClient({ baseURL: url, plugins: [jwtClient()] }) : null;
  const returnTo = typeof window === "undefined" ? "" : `${window.location.origin}/auth/managed-callback`;
  return <section aria-label="Managed sign-in" className="mb-6 space-y-3">
    <p className="text-sm">Managed sign-in</p>
    {error && <p role="alert" className="text-sm">{error}</p>}
    {callback ? <>{!error && <p>Checking sign-in…</p>}<a href="/auth/login">Back to sign-in</a></> : <>
      <button type="button" disabled={!client || busy} className="w-full rounded-md border p-2" onClick={async () => {
        setBusy(true); setError("");
        try { const response = await client!.signIn.social({ provider: "google", callbackURL: returnTo }); if (response.error) throw new Error(); }
        catch { setError("Managed sign-in is not available yet. Try email or local sign-in."); setBusy(false); }
      }}>Continue with social sign-in</button>
      <form className="space-y-2" onSubmit={async event => {
        event.preventDefault(); setBusy(true); setError("");
        const fields = new FormData(event.currentTarget);
        const email = String(fields.get("managed-email") || ""), password = String(fields.get("managed-password") || "");
        try {
          const response = mode === "signup" ? await client!.signUp.email({ email, password, name: String(fields.get("managed-name") || email), callbackURL: returnTo }) : await client!.signIn.email({ email, password, callbackURL: returnTo });
          if (response.error) throw new Error();
          await finish(url!);
        } catch { setError("Managed sign-in could not be completed. Check your details or use local sign-in."); setBusy(false); }
      }}>
        {mode === "signup" && <label className="block">Name<input name="managed-name" required autoComplete="name" className="block w-full rounded border p-2" /></label>}
        <label className="block">Email<input name="managed-email" required type="email" autoComplete="email" className="block w-full rounded border p-2" /></label>
        <label className="block">Password<input name="managed-password" required type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} className="block w-full rounded border p-2" /></label>
        <button disabled={!client || busy} type="submit" className="w-full rounded-md border p-2">{mode === "signup" ? "Create managed account" : "Sign in with email"}</button>
      </form>
      <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Use an existing managed account" : "Create an account"}</button>
      <p className="text-sm">Or use local sign-in below.</p>
    </>}
  </section>;
}
