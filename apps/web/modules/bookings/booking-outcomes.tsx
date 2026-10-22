"use client";
import { useEffect, useState } from "react";
import { EstimatePrice } from "./estimate-price";
const actions = {
  "meeting.brief": "Prepare meeting brief",
  "lead.enrich": "Look up attendee",
  "lead.qualify": "Check company fit",
  "notify.send": "Send a booking message",
};
export default function BookingOutcomes({ uid }: { uid: string }) {
  const [configured, setConfigured] = useState(false);
  const [outcome, setOutcome] = useState("meeting.brief");
  const [domain, setDomain] = useState("");
  const [text, setText] = useState("");
  const [ground, setGround] = useState("contract");
  const [review, setReview] = useState<any>();
  const [report, setReport] = useState<any>();
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    let disposed = false;
    fetch(`/api/booking-outcomes/${encodeURIComponent(uid)}`).then(async response => {
      if (!response.ok) return;
      const result = await response.json();
      if (!disposed) setConfigured(result.configured === true);
      if (!disposed && result.reviewId) { setReview({ reviewId: result.reviewId }); setReport(result); setStarted(true); setMessage(result.message || ""); }
    }).catch(() => { if (!disposed) setMessage("Could not check previous runs. Reload before starting another action."); });
    return () => { disposed = true; };
  }, [uid]);
  async function action(action: string) {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/booking-outcomes/${encodeURIComponent(uid)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          outcome,
          domain,
          ground,
          message: text,
          criteria: text.split("\n").filter(Boolean),
          reviewId: review?.reviewId,
          confirmed: action === "run",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "This feature is not available yet.");
      if (action === "acknowledge") { setReview(undefined); setReport(undefined); setStarted(false); }
      else if (action === "estimate") {
        setReview(result);
        setReport(undefined);
        setStarted(false);
      } else {
        setReport(result);
        setStarted(true);
      }
      setMessage(result.message || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This feature is not available yet.");
      if (action === "run") setStarted(true);
    } finally {
      setWorking(false);
    }
  }
  const money = (micro: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(micro / 1_000_000);
  return (
    <section
      className="mx-auto my-6 max-w-xl rounded-2xl border border-subtle bg-default p-6"
      aria-label="Booking actions">
      <h2 className="text-xl">Booking actions</h2>
      <p className="my-3 text-sm">
        These actions run only after you review an estimate. Research results do not change the booking or
        route anyone automatically.
      </p>
      {!configured && <p role="status">Add PRAMAAN_API_KEY to .env</p>}
      {!started && !review && (
        <>
          <label>
            Action
            <select
              className="my-2 block w-full rounded-xl border p-2"
              value={outcome}
              onChange={(event) => {
                setOutcome(event.target.value);
                setText("");
              }}>
              {Object.entries(actions).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {["meeting.brief", "lead.qualify"].includes(outcome) && (
            <label>
              Company website domain
              <input
                className="my-2 block w-full rounded-xl border p-2"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="example.com"
              />
            </label>
          )}
          {["lead.qualify", "notify.send"].includes(outcome) && (
            <label>
              {outcome === "notify.send" ? "Message to the attendee" : "Criteria, one per line"}
              <textarea
                className="my-2 block w-full rounded-xl border p-2"
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
          )}
          <label>
            Basis for using attendee details
            <select
              className="my-2 block w-full rounded-xl border p-2"
              value={ground}
              onChange={(event) => setGround(event.target.value)}>
              <option value="contract">Booking contract</option>
              <option value="consent">Attendee consent</option>
              <option value="legitimate_interest">Legitimate interest</option>
            </select>
          </label>
          <button
            className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
            disabled={working || !configured}
            onClick={() => action("estimate")}>
            Get estimate
          </button>
        </>
      )}
      {review && !started && (
        <div role="dialog" aria-label="Review booking action">
          <h3>Review {actions[outcome as keyof typeof actions]}</h3>
          <p className="my-3">
            <EstimatePrice estimate={review.estimate} money={money} fallback={<>Estimated charge: {money(review.estimate.priceMinMicro)}–{money(review.estimate.priceMaxMicro)}</>} />
          </p>
          <pre className="overflow-auto whitespace-pre-wrap break-all text-sm">
            {JSON.stringify(review.input, null, 2)}
          </pre>
          <ol className="my-3">
            {review.estimate.steps.map((step: string, index: number) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          <p className="my-3 text-sm">
            Confirm these inputs and steps. The estimate expires after 15 minutes.
          </p>
          <button
            className="rounded-xl bg-blue-700 px-4 py-2 text-white"
            disabled={working || !configured}
            onClick={() => action("run")}>
            Confirm run
          </button>
          <button className="ml-4" onClick={() => setReview(undefined)}>
            Cancel
          </button>
        </div>
      )}
      {started && (
        <>
          <p className="my-3">
            {report?.status === "running"
              ? "Working or waiting its turn."
              : report?.status === "failed"
                ? "This run failed. Check the result before retrying."
              : report?.partial
                ? "Finished with partial results."
                : report?.status === "done"
                  ? "Finished."
                  : "Check this run before retrying."}
          </p>
          {report?.chargedMicro !== undefined && <p>Charged: {money(report.chargedMicro)}</p>}
          {report?.sections?.map((section: { label: string; text: string }, index: number) => (
            <div className="my-3" key={index}>
              <h3>{section.label}</h3>
              <p className="whitespace-pre-wrap text-sm">{section.text}</p>
            </div>
          ))}
          <button
            className="mr-4 rounded-xl border px-4 py-2"
            disabled={working || !configured}
            onClick={() => action("status")}>
            Check status
          </button>
          {report?.status === "running" && (
            <button disabled={working || !configured} onClick={() => action("cancel")}>
              Stop run
            </button>
          )}
          {report?.status !== "running" && (
            <button
              className="mt-3 block underline"
              onClick={() => action("acknowledge")}>
              I checked this run — review a fresh estimate
            </button>
          )}
        </>
      )}
      <p role="status" className="mt-4 text-sm">
        {message}
      </p>
    </section>
  );
}
