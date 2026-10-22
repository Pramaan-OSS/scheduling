"use client";
import { useEffect, useState } from "react";
import { Button } from "@scheduling/ui/components/button";

type Payment = { id: number; amount: number; currency: string; available: boolean; message: string };
export function BookingRefund({ bookingUid }: { bookingUid: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState("");
  const url = `/api/booking-refund/${encodeURIComponent(bookingUid)}`;
  useEffect(() => { let active = true;
    fetch(url).then(r => r.json()).then(body => { if (active) { setPayments(body.payments || []); setMessage(body.message || ""); } }).catch(() => { if (active) setMessage("Refund details could not be loaded."); });
    return () => { active = false; };
  }, [url]);
  return <div className="mt-3 space-y-3"><p role="status">{message}</p>{payments.map(payment => <RefundRow key={payment.id} payment={payment} url={url} />)}</div>;
}
function RefundRow({ payment, url }: { payment: Payment; url: string }) {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency: payment.currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const scale = 10 ** digits;
  const [amount, setAmount] = useState((payment.amount / scale).toFixed(digits));
  const minorAmount = Math.round(Number(amount) * scale);
  const valid = Number.isFinite(Number(amount)) && Math.abs(Number(amount) * scale - minorAmount) < 0.000001 && minorAmount >= 1 && minorAmount <= payment.amount;
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState(!payment.available);
  const [message, setMessage] = useState(payment.message);
  const [requestId] = useState(() => crypto.randomUUID());
  async function refund() {
    setBusy(true);
    // Lock this intent before sending: lost answers never allow another request from this screen.
    setStopped(true);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id, requestId, approved, amount: minorAmount }) });
      const body = await response.json(); setMessage(body.message || "Check this refund before taking further action.");
    } catch { setMessage("The refund result is uncertain. Check its status before taking further action."); }
    finally { setBusy(false); }
  }
  return <div className="rounded-lg border p-3"><p className="text-sm" role="status">{message}</p>{payment.available && <>
    <label className="mt-2 block text-sm">Refund amount ({payment.currency}; maximum {(payment.amount / scale).toFixed(digits)})
      <input className="block rounded border p-2" type="number" min={1 / scale} max={payment.amount / scale} step={1 / scale} value={amount} disabled={stopped} onChange={e => { setAmount(e.target.value); setApproved(false); }} />
    </label>
    <label className="my-2 block text-sm"><input type="checkbox" checked={approved} disabled={stopped} onChange={e => setApproved(e.target.checked)} /> I approve refunding {payment.currency} {amount}. A request receipt does not confirm completion.</label>
    <Button loading={busy} disabled={stopped || !approved || !valid} onClick={refund}>Request refund</Button>
  </>}</div>;
}
