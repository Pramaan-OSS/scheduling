"use client";
import { useEffect, useState } from "react";
export function MeetingRoomPreference({ id, onSaved }: { id: number; onSaved: (value: { enabled: boolean; fallbackUrl: string }) => void }) {
  const [connected, setConnected] = useState(false), [enabled, setEnabled] = useState(false), [fallbackUrl, setUrl] = useState(""), [approved, setApproved] = useState(false), [message, setMessage] = useState("");
  useEffect(() => { fetch(`/api/event-room/${id}`).then(r => r.json()).then(body => { setConnected(body.connected === true); setEnabled(body.enabled === true); setUrl(body.fallbackUrl || ""); setMessage(body.message || ""); }).catch(() => setMessage("Meeting preferences are not available yet.")); }, [id]);
  async function save() { try { const r = await fetch(`/api/event-room/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, fallbackUrl, approved }) }); const body = await r.json(); setMessage(body.message); if (r.ok) onSaved({ enabled, fallbackUrl }); } catch { setMessage("Meeting preferences could not be saved."); } }
  return <section className="my-3 rounded-xl border p-4"><h3>Meeting room</h3><p>Paste your meeting link is the default. Connect your own meeting app in calendar settings before enabling room creation.</p>
    <label className="block"><input type="checkbox" disabled={!connected} checked={enabled} onChange={e => { setEnabled(e.target.checked); setApproved(false); }} /> Create a meeting room for this event type</label>
    <label className="block">Pasted fallback meeting link<input className="block w-full rounded border p-2" type="url" value={fallbackUrl} onChange={e => { setUrl(e.target.value); setApproved(false); }} /></label>
    <label className="block"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} /> I approve creating and deleting one room per booking. Recording stays off. Private host links are shown only to the room owner.</label>
    <button type="button" disabled={enabled && (!connected || !approved || !fallbackUrl)} onClick={save}>Save meeting preference</button><p role="status">{message}</p>
  </section>;
}
