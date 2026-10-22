"use client";
import { ShortLinkManager } from "./ShortLinkManager";
import { OwnedAppConnection } from "./OwnedAppConnection";
import { useEffect, useState } from "react";

export default function PrimaryCalendarSettings() {
  const [state, setState] = useState<{ connected: boolean; configured: boolean; inbox: string; calendars: Array<{ name: string; isPrimary?: boolean }>; checked: string[] }>();
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  useEffect(() => {
    fetch("/api/primary-calendar").then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Calendar settings could not be loaded.");
      setState(result); setMessage(result.message || "");
    }).catch(error => setMessage(error.message));
  }, []);
  async function connect() {
    setWorking(true); setMessage("");
    try {
      const response = await fetch("/api/primary-calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checked: state?.checked }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Your calendar is not available yet.");
      setState(current => current ? { ...current, connected: true } : current);
      setMessage("Your selected calendars are saved. Calendar writes continue to use your primary calendar.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your calendar is not available yet."); }
    finally { setWorking(false); }
  }
  return <section className="rounded-2xl border border-subtle bg-default p-6">
    <h1 className="text-xl">Calendar availability</h1>
    <p className="my-4 text-sm">Choose up to twenty calendars to check for conflicts. Your account connection grants access to read calendar data and change events. Booking writes use your primary calendar. The older-server fallback only covers the primary calendar; other selections cannot be confirmed if that check is unavailable.</p>
    <p className="mb-4 text-sm">{state?.inbox} {state?.connected ? "· Connected" : ""}</p>
    {state && !state.configured && <p className="mb-4 text-sm">Add PRAMAAN_API_KEY to .env</p>}
    <div className="my-4 space-y-2">{state?.calendars?.map(calendar => <label key={calendar.name} className="block text-sm"><input type="checkbox" checked={state.checked.includes(calendar.name)} onChange={event => setState(current => current ? { ...current, checked: event.target.checked ? [...current.checked, calendar.name] : current.checked.filter(name => name !== calendar.name) } : current)} /> {calendar.name}{calendar.isPrimary ? " (Primary)" : ""}</label>)}</div>
    <button className="rounded-xl bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={!state?.configured || working} onClick={connect}>{working ? "Checking…" : state?.connected ? "Save calendar selection" : "Check calendar access"}</button>
    <p role="status" className="mt-4 text-sm">{message}</p>
    <OwnedAppConnection kind="calendars" />
    <OwnedAppConnection kind="meetings" />
      <OwnedAppConnection kind="links" />
      <ShortLinkManager />

  </section>;
}
