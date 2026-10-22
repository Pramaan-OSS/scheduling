"use client";
import { useState } from "react";
export default function AppSettings() {
  const [city, setCity] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  async function prepare() {
    setWorking(true); setMessage(""); setUrl("");
    try {
      const response = await fetch("/api/weather-calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Forecasts are not available yet.");
      setUrl(result.url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Forecasts are not available yet."); }
    finally { setWorking(false); }
  }
  return <div><label>City<input className="my-2 block w-full rounded-xl border p-2" value={city} onChange={event => setCity(event.target.value)} /></label><p className="my-3 text-sm">Download a seven-day forecast snapshot for your calendar. It does not update automatically.</p><button className="rounded-xl bg-blue-700 px-4 py-2 text-white" disabled={working || !city.trim()} onClick={prepare}>Prepare forecast calendar</button>{url && <a className="my-4 block underline" href={url}>Add forecast to calendar</a>}<p role="status">{message}</p></div>;
}
