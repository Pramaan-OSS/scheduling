"use client";
import { useState } from "react";
export function BookingRoom({ uid }: { uid: string }) {
  const [data, setData] = useState<any>(), [message, setMessage] = useState("");
  async function read(query = "") { try { const r = await fetch(`/api/meeting-room/${encodeURIComponent(uid)}${query}`); const body = await r.json(); if (!r.ok) { setMessage(body.message); return; }
    if (body.hostUrl) { window.open(body.hostUrl, "_blank", "noopener,noreferrer"); return; }
    if (body.file?.url) { window.open(body.file.url, "_blank", "noopener,noreferrer"); return; }
    setData(body); setMessage(body.message);
  } catch { setMessage("Meeting details or recordings are not available yet."); } }
  return <section className="my-3 rounded-xl border p-3"><button type="button" onClick={() => read()}>Check meeting and recordings</button><p role="status">{message}</p>{data && <>
    {data.hasHostLink && <button type="button" onClick={() => read("?host=true")}>Open private host link</button>}
    {data.dialIn && <p>Dial-in: {data.dialIn}</p>}<p>{data.recordingNote}</p>
    {data.recordings?.map((row: any, index: number) => <button type="button" key={row.ref} onClick={() => read(`?recording=${encodeURIComponent(row.ref)}`)}>Open recording {index + 1}</button>)}
    {data.nextCursor && <button type="button" onClick={() => read(`?cursor=${encodeURIComponent(data.nextCursor)}`)}>More recordings</button>}
  </>}</section>;
}
