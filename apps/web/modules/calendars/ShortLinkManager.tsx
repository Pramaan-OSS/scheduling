"use client";
import { useState } from "react";
type Row = { id: string; status: string; destinationUrl: string; shortUrl?: string; message?: string };
export function ShortLinkManager() {
  const [rows, setRows] = useState<Row[]>([]), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [approved, setApproved] = useState(false);
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  async function load() { const r = await fetch("/api/short-links"); const data = await r.json(); if (r.ok) setRows(data.links); else setMessage(data.message); }
  async function action(body: object) {
    setBusy(true);
    try { const r = await fetch("/api/short-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await r.json(); setMessage(data.message || "Use the original link."); await load(); }
    catch { setMessage("This request could not be confirmed. Check the connected app before further action."); }
    finally { setBusy(false); setApproved(false); }
  }
  return <section className="my-5 rounded-xl border p-4"><h2>Your booking short links</h2>
    <p className="text-sm">Links are created only for booking sharing and text messages after you enable your connected app. Click counts are aggregate only. Changing a destination affects existing shared links; deleting a link cannot be undone.</p>
    <button type="button" disabled={busy} onClick={() => load().catch(() => setMessage("Links could not be loaded."))}>Show saved links</button>
    <label className="block"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} /> I approve the next destination change or permanent deletion.</label>
    {rows.map(row => <div key={row.id} className="my-3 rounded border p-3 break-all"><p>{row.destinationUrl}</p><p>{row.status === "ready" ? row.shortUrl : row.message || "Use the original URL and check the connected app."}</p>
      {row.status === "ready" && <><button type="button" disabled={busy} onClick={() => action({ action: "get", id: row.id })}>Check link</button><button type="button" disabled={busy} onClick={() => action({ action: "clicks", id: row.id })}>Check recent clicks</button>
        <input aria-label="New booking destination" type="url" value={destinations[row.id] || ""} onChange={e => setDestinations(old => ({ ...old, [row.id]: e.target.value }))} placeholder="Your own public booking URL" />
        <button type="button" disabled={busy || !approved || !destinations[row.id]} onClick={() => action({ action: "update", id: row.id, destinationUrl: destinations[row.id], approved })}>Change destination</button>
        <button type="button" disabled={busy || !approved} onClick={() => action({ action: "delete", id: row.id, approved })}>Delete short link</button></>}
    </div>)}<p role="status">{message}</p>
  </section>;
}
