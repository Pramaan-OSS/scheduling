"use client";
import { useState } from "react";
export default function PaymentSettings() {
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [charges, setCharges] = useState<{ id: string; name: string; status: string }[]>([]);
  const [charge, setCharge] = useState("");
  const [account, setAccount] = useState("");
  const [kind, setKind] = useState("payment-settings");
  const [message, setMessage] = useState("");
  const [review, setReview] = useState(false);
  const [plan, setPlan] = useState<{
    amount?: { amount: number; currency: string };
    interval?: string;
    hash: string;
  }>();
  const [reviewAction, setReviewAction] = useState("connect");
  const [working, setWorking] = useState(false);
  async function action(action: string, confirmed = false) {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirmed, account, hash: plan?.hash, transactionId: charge }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "This action is not available yet.");
      if (result.results) {
        if (action === "transactions") setCharges(result.results);
        else setAccounts(result.results);
      }
      if (result.plan) {
        setPlan({ ...result.plan, hash: result.hash });
        setReviewAction("start");
        setReview(true);
        return;
      }
      if (result.url) window.location.assign(result.url);
      setMessage(result.message || "Choose an account, then review the connection.");
      setReview(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This action is not available yet.");
    } finally {
      setWorking(false);
    }
  }
  return (
    <section className="rounded-2xl border border-subtle bg-default p-6">
      <h1 className="text-xl">Payments and billing</h1>
      <p className="my-4 text-sm">
        An administrator connects an owned account. Booking payments use one payment request, checked on the
        server. Saving cards and automatic no-show charges are not available yet.
      </p>
      <label>
        Account purpose
        <select
          className="mx-3 rounded-xl border p-2"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setAccounts([]);
            setReview(false);
          }}>
          <option value="payment-settings">Booking payments</option>
          <option value="billing">Billing</option>
        </select>
      </label>
      <button
        className="ml-3 rounded-xl border px-4 py-2"
        disabled={working}
        onClick={() => action(kind === "billing" ? "accounts" : "list")}>
        Load accounts
      </button>
      {accounts.length > 0 && (
        <label className="mt-4 block">
          Account
          <select
            className="mx-3 rounded-xl border p-2"
            value={account}
            onChange={(event) => setAccount(event.target.value)}>
            <option value="">Choose an account</option>
            {accounts.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {!review && (
        <button
          className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
          disabled={working || !account}
          onClick={() => {
            setReviewAction("connect");
            setReview(true);
          }}>
          Review connection
        </button>
      )}
      {review && (
        <div role="dialog" aria-label="Review connection" className="mt-4">
          <p>
            {reviewAction === "start"
              ? `Start the configured recurring plan: ${plan?.amount?.amount} minor units ${plan?.amount?.currency} per ${plan?.interval}? Charges continue until canceled.`
              : reviewAction === "refund"
                ? "Request a full refund for this selected billing charge? Completion may remain pending."
                : reviewAction === "cancel"
                  ? "Cancel at the end of the paid period?"
                  : `Use this owned account for ${kind === "billing" ? "billing; a billing customer record will be created" : "booking payments"}?`}
          </p>
          <button
            className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-white"
            disabled={working}
            onClick={() => action(reviewAction, true)}>
            Confirm
          </button>
          <button className="ml-4" onClick={() => setReview(false)}>
            Cancel
          </button>
        </div>
      )}
      {kind === "billing" && (
        <button
          className="ml-4 rounded-xl border px-4 py-2"
          disabled={working}
          onClick={() => action("portal", true)}>
          Open billing portal
        </button>
      )}
      {kind === "billing" && (
        <div className="mt-4 flex gap-4">
          <button disabled={working} onClick={() => action("plan")}>
            Review billing plan
          </button>
          <button disabled={working} onClick={() => action("status")}>
            Check subscription
          </button>
          <button
            disabled={working}
            onClick={() => {
              setReviewAction("cancel");
              setReview(true);
            }}>
            Review cancellation
          </button>
        </div>
      )}
      {kind === "billing" && (
        <div className="mt-4">
          <button disabled={working} onClick={() => action("transactions")}>
            Load billing charges
          </button>
          {charges.map((row) => (
            <div className="mt-2" key={row.id}>
              <span>
                {row.name} · {row.status}
              </span>
              <button
                className="ml-4"
                onClick={() => {
                  setCharge(row.id);
                  setReviewAction("refund");
                  setReview(true);
                }}>
                Review refund
              </button>
            </div>
          ))}
        </div>
      )}
      <p role="status" className="mt-4 text-sm">
        {message}
      </p>
    </section>
  );
}
