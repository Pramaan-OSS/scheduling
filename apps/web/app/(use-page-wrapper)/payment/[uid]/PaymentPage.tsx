"use client";
import { useState } from "react";
export default function PaymentPage({ uid, title, amount, currency, paid }: { uid: string; title: string; amount: number; currency: string; paid: boolean }) {
  const [message, setMessage] = useState(paid ? "Payment confirmed." : "Choose Check payment to open the payment request or confirm your payment.");
  const [url, setUrl] = useState("");
  const [confirmed, setConfirmed] = useState(paid);
  const [working, setWorking] = useState(false);
  async function check() {
    setWorking(true);
    try {
      const response = await fetch(`/api/booking-payment/${encodeURIComponent(uid)}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Payment could not be checked.");
      setUrl(result.paymentUrl || ""); setConfirmed(result.confirmed);
      setMessage(result.message || (result.confirmed ? "Payment confirmed." : "Payment has not been confirmed yet."));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Payment could not be checked."); }
    finally { setWorking(false); }
  }
  return <main className="mx-auto my-20 max-w-lg rounded-2xl border border-subtle bg-default p-6">
    <h1 className="text-2xl">Booking payment</h1><p className="my-4">{title}</p>
    <p>{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / (10 ** new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions().maximumFractionDigits!))}</p>
    <p role="status" className="my-4">{message}</p>
    {!confirmed && <p className="mb-4">After paying, return to this page and choose Check payment again.</p>}
    {!confirmed && <button className="rounded-xl bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={working} onClick={check}>{working ? "Checking…" : "Check payment"}</button>}
    {!confirmed && url && <a className="mt-4 block underline" href={url} rel="noreferrer">Continue to payment</a>}
    {confirmed && <a className="mt-4 block underline" href="/">Back to scheduling</a>}
  </main>;
}
