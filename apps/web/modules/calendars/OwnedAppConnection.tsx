"use client";
import { useEffect, useState } from "react";
export function OwnedAppConnection({ kind }: { kind: "meetings" | "links" | "calendars" }) {
  const url = `/api/owned-app/${kind}`;
  const [state, setState] = useState({ configured: false, connected: false, enabled: false });
  const [options, setOptions] = useState<Array<{ choice: string; label: string }>>([]), [choice, setChoice] = useState(""), [cursor, setCursor] = useState<string | null>(null);
  const [approved, setApproved] = useState(false), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { fetch(url).then(r => r.json()).then(setState).catch(() => setMessage("Connection could not be checked.")); }, [url]);
  async function action(body: object) { setBusy(true); try { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await r.json(); if (!r.ok) { setMessage(result.message); return; }
    if (result.options) { setOptions(previous => { const rows = new Map<string, { choice: string; label: string }>(); for (const row of [...previous, ...result.options]) rows.set(row.choice, row); return [...rows.values()]; }); setCursor(result.nextCursor); }
    if (result.connectUrl) window.location.assign(result.connectUrl);
    if (typeof result.enabled === "boolean") setState(old => ({ ...old, enabled: result.enabled }));
  } catch { setMessage("Connection is not available yet."); } finally { setBusy(false); } }
  return <section className="my-5 rounded-xl border p-4"><h2>{kind === "meetings" ? "Your meeting app" : kind === "calendars" ? "Your calendar app" : "Your short-link app"}</h2>
    <p className="my-2 text-sm">This requests the app's standard account access. Review the permissions on its consent screen. Features that change data stay off until change access is confirmed. {kind === "meetings" ? "Private host links are encrypted and shown only to the room owner. Paste a meeting link remains the default." : kind === "calendars" ? "Return here after consent, then check calendar access before selecting calendars. Starting consent alone does not confirm calendar access." : "Original product URLs remain the fallback. Shortening is off by default."}</p>
    {!state.configured && <p>Add PRAMAAN_API_KEY to .env</p>}
    <p>{state.connected ? "Connected with change access." : "Connect your own account before enabling this feature."}</p>
    <button type="button" disabled={!state.configured || busy} onClick={() => action({ action: "search" })}>Find connection apps</button>
    {cursor && <button type="button" disabled={busy} onClick={() => action({ action: "search", cursor })}>Load more</button>}
    <select aria-label="Connection app" value={choice} onChange={e => { setChoice(e.target.value); setApproved(false); }}><option value="">Choose an app</option>{options.map(row => <option key={row.choice} value={row.choice}>{row.label}</option>)}</select>
    <label className="block"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} /> I approve the account access described above.</label>
    <button type="button" disabled={busy || !choice || !approved} onClick={() => action({ action: "connect", choice, approved })}>Connect own account</button>
    {kind === "links" && <label className="block"><input type="checkbox" disabled={busy || !state.enabled && (!state.connected || !approved)} checked={state.enabled} onChange={e => action({ action: "enable", enabled: e.target.checked, approved })} /> Use short links for booking links and text messages</label>}
    <p role="status">{message}</p>
  </section>;
}
