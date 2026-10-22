import {
  PramaanError,
  toOutcomeRun,
  type Pramaan,
  type OutcomeEstimate,
  type OutcomeRun,
  type OutcomeRunOptions,
} from "@scheduling/pramaan";
export const BOOKING_OUTCOMES = ["meeting.brief", "lead.enrich", "lead.qualify", "notify.send"] as const;
export type BookingOutcome = (typeof BOOKING_OUTCOMES)[number];
export async function estimateBookingOutcome(
  client: Pramaan,
  id: BookingOutcome,
  input: unknown,
  opts: OutcomeRunOptions
) {
  if (!(await client.outcomes.get(id)).available)
    throw new PramaanError("upstream_unavailable", "This feature is not available yet.");
  const estimate = await client.outcomes.estimate(id, input, opts);
  if (!estimate.canRun || !estimate.ready || !estimate.plan)
    throw new PramaanError("invalid_request", "This request cannot run yet. Check its inputs and balance.");
  return estimate;
}
export async function startBookingOutcome(
  client: Pramaan,
  id: BookingOutcome,
  input: unknown,
  opts: OutcomeRunOptions,
  estimate: OutcomeEstimate,
  identity: string
) {
  if (!(await client.outcomes.get(id)).available)
    throw new PramaanError("upstream_unavailable", "This feature is not available yet.");
  return client.outcomes.start(id, input, { ...opts, plan: estimate.plan, idempotencyKey: identity });
}
export async function inspectBookingOutcome(
  client: Pramaan,
  jobId: string,
  startedAt: number,
  cancel = false,
  now = Date.now()
) {
  const job = cancel ? await client.jobs.cancel(jobId) : await client.jobs.get(jobId);
  if (job.result) {
    const report = toOutcomeRun(job.result);
    return {
      status: job.status === "failed" || job.status === "cancelled" ? job.status : report.status,
      report,
    };
  }
  if (job.status === "running" && now - startedAt < 35 * 60_000) return { status: "running" };
  return {
    status: job.status === "running" ? "failed" : job.status,
    error: "The run did not finish. Check what happened before retrying.",
  };
}
export function reportView(report: OutcomeRun) {
  const result = (report.result || {}) as Record<string, any>;
  const sections: { label: string; text: string }[] = [];
  for (const [key, label] of [
    ["company", "Company"],
    ["person", "Attendee"],
  ]) {
    const value = result[key];
    if (value && typeof value === "object") {
      const fields = [
        value.name,
        value.fullName,
        value.title,
        value.industry,
        value.employeeRange,
        value.foundedYear,
        value.location &&
          Object.values(value.location)
            .filter((v) => typeof v === "string")
            .join(", "),
      ].filter((v) => typeof v === "string" || typeof v === "number");
      if (fields.length) sections.push({ label, text: fields.join(" · ") });
    }
  }
  if (Array.isArray(result.brief) && result.brief.length)
    sections.push({
      label: "Meeting brief",
      text: result.brief.filter((v: unknown) => typeof v === "string").join("\n"),
    });
  if (Array.isArray(result.criteria))
    for (const criterion of result.criteria) {
      const backed =
        Array.isArray(criterion.basedOn) &&
        criterion.basedOn.length &&
        criterion.basedOn.every((id: string) =>
          report.steps.some((step) => step.id === id && step.status === "ok")
        );
      sections.push({
        label: String(criterion.text),
        text: !backed
          ? "Unavailable or not checked."
          : criterion.verdict === "met"
            ? `Met: ${criterion.reason}`
            : criterion.verdict === "not_met"
              ? `Not met: ${criterion.reason}`
              : "Unavailable or not checked.",
      });
    }
  if (report.outcome === "meeting.brief") {
    for (const [field, label] of [
      ["news", "Company news"],
      ["posts", "Public posts"],
    ]) {
      const entries = result[field];
      const available = report.steps.some((step) => step.id.includes(field) && step.status === "ok");
      sections.push({
        label,
        text:
          Array.isArray(entries) && entries.length
            ? entries
                .map((row) => row.title || row.text)
                .filter((value: unknown) => typeof value === "string")
                .join("\n")
            : available
              ? "No items were returned by this check."
              : "This source was unavailable or not requested and could not be checked.",
      });
    }
  }
  if (result.sent)
    sections.push({
      label: "Notification",
      text:
        result.sent.status === "sent"
          ? "Sent. Delivery is not confirmed."
          : result.sent.status === "queued"
            ? "Accepted for delivery; completion is not confirmed."
            : "Sending was not confirmed.",
    });
  const unknownEffect = report.steps.some((step) => step.effect === "unknown");
  const unavailable = report.steps.some((step) => step.status === "failed" || step.status === "skipped");
  return {
    sections,
    status: report.status,
    partial: report.completeness === "partial",
    chargedMicro: report.cost.chargedMicro,
    message: unknownEffect
      ? "A step may already have acted. Check before retrying."
      : unavailable
        ? "Some sources were unavailable or could not be checked. Missing results are not negative findings."
        : sections.length
          ? ""
          : "No result was returned.",
    unknownEffect,
  };
}
