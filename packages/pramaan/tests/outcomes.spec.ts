import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Pramaan, PramaanClient, PramaanError, toOutcomeRun } from "../src/index";
import {
  estimateBookingOutcome,
  startBookingOutcome,
  inspectBookingOutcome,
  reportView,
} from "../../features/bookings/outcomes/service";
const input = { domain: "example.test" };
const opts = { basis: { ground: "contract" as const }, options: {} };
const estimate = {
  outcome: "meeting.brief",
  version: 1,
  plan: "approved-plan",
  ready: true,
  canRun: true,
  priceMinMicro: 100,
  priceMaxMicro: 600,
  balanceMicro: 10000,
  steps: [],
};
const rawReport = {
  outcome: "meeting.brief",
  status: "done",
  completeness: "partial",
  plan: estimate.plan,
  result: {
    company: { name: "Fixture", employeeRange: "8000", location: { country: "San Francisco United States" } },
    brief: ["Checked brief"],
    news: [],
    posts: [],
  },
  steps: [
    { id: "news", status: "failed", effect: "none" },
    { id: "posts", status: "skipped", effect: "none" },
  ],
  missing: [{ detail: "No news" }],
  cost: { hold_micro: 600, charged_micro: 150 },
};
function fake() {
  const client = new FakePramaan();
  client.routeOutcomes({
    get: () => ({ available: true }),
    estimate: () => estimate,
    run: () => toOutcomeRun(rawReport),
  });
  return client;
}
test("estimate and approved start use exactly the same input and options", async () => {
  const client = fake();
  const reviewed = await estimateBookingOutcome(client, "meeting.brief", input, opts);
  await startBookingOutcome(client, "meeting.brief", input, opts, reviewed, "stable-run");
  const planned = client.outcomeCalls.find((call) => call.verb === "estimate")!;
  const started = client.outcomeCalls.find((call) => call.verb === "start")!;
  expect(started.input).toEqual(planned.input);
  expect(started.opts).toEqual({ ...opts, plan: estimate.plan, idempotencyKey: "stable-run" });
});
test("availability is checked again at start and never falls through to a run", async () => {
  const client = fake();
  await estimateBookingOutcome(client, "meeting.brief", input, opts);
  client.routeOutcomes({ get: () => ({ available: false }) });
  await expect(
    startBookingOutcome(client, "meeting.brief", input, opts, estimate, "stable-run")
  ).rejects.toThrow("not available yet");
  expect(client.outcomeCalls.filter((call) => call.verb === "start")).toHaveLength(0);
});
test("partial reports keep findings, actual charges and source failure reasons", () => {
  const view = reportView(toOutcomeRun(rawReport));
  expect(view.partial).toBe(true);
  expect(view.chargedMicro).toBe(150);
  expect(view.sections.find((section) => section.label === "Company")!.text).toContain("8000");
  expect(view.sections.find((section) => section.label === "Company")!.text).toContain(
    "San Francisco United States"
  );
  expect(view.sections.find((section) => section.label === "Company news")!.text).toContain("unavailable");
  expect(JSON.stringify(view)).not.toContain("No news");
});
test("202 starts return a job for polling; cancel and the 35-minute deadline finish it", async () => {
  const client = fake();
  client.routeOutcomes({
    run: () => ({ id: "job-fixture", capability: "meeting.brief", status: "running" }),
  });
  expect(
    await startBookingOutcome(client, "meeting.brief", input, opts, estimate, "stable-run")
  ).toHaveProperty("id", "job-fixture");
  client.routeJobs({
    get: () => ({ id: "job-fixture", capability: "meeting.brief", status: "running" }),
    cancel: () => ({
      id: "job-fixture",
      capability: "meeting.brief",
      status: "cancelled",
      result: { ...rawReport, status: "cancelled" },
    }),
  });
  expect(await inspectBookingOutcome(client, "job-fixture", 0, false, 100)).toEqual({ status: "running" });
  expect(await inspectBookingOutcome(client, "job-fixture", 0, false, 35 * 60_000)).toHaveProperty(
    "status",
    "failed"
  );
  expect(await inspectBookingOutcome(client, "job-fixture", 0, true)).toHaveProperty("status", "cancelled");
});
test("unknown effects require a check and never trigger a second start", async () => {
  const client = fake();
  client.routeOutcomes({
    run: () =>
      toOutcomeRun({
        ...rawReport,
        status: "failed",
        steps: [{ id: "send", status: "failed", effect: "unknown" }],
      }),
  });
  const report = await startBookingOutcome(client, "meeting.brief", input, opts, estimate, "stable-run");
  expect(reportView(report as any).message).toContain("Check before retrying");
  expect(client.outcomeCalls.filter((call) => call.verb === "start")).toHaveLength(1);
});
test("403, 409, 502 and 429 starts are not retried", async () => {
  for (const [status, code] of [
    [403, "unauthorized"],
    [409, "conflict"],
    [502, "upstream_unavailable"],
    [429, "rate_limited"],
  ] as const) {
    const client = fake();
    client.routeOutcomes({
      run: () => {
        throw new PramaanError(code, "fixture", { status });
      },
    });
    await expect(
      startBookingOutcome(client, "meeting.brief", input, opts, estimate, "stable-run")
    ).rejects.toThrow();
    expect(client.outcomeCalls.filter((call) => call.verb === "start")).toHaveLength(1);
  }
});
test("wire start sends the plan without account or end-user headers, then polls the job", async () => {
  const requests: { url: string; options: RequestInit }[] = [];
  const client = new Pramaan(
    new PramaanClient({
      apiKey: "fake",
      fetch: async (url, options) => {
        requests.push({ url, options });
        return options.method === "POST"
          ? new Response(JSON.stringify({ job_id: "job-fixture", status: "running" }), { status: 202 })
          : new Response(JSON.stringify({ job_id: "job-fixture", status: "done", result: rawReport }), {
              status: 200,
            });
      },
    })
  );
  expect(
    await client.outcomes.start("meeting.brief", input, {
      ...opts,
      plan: estimate.plan,
      idempotencyKey: "stable",
    })
  ).toHaveProperty("id", "job-fixture");
  expect(await inspectBookingOutcome(client, "job-fixture", Date.now())).toHaveProperty("status", "done");
  const headers = new Headers(requests[0]!.options.headers);
  expect(headers.get("Pramaan-Plan")).toBe(estimate.plan);
  expect(headers.has("Pramaan-Account")).toBe(false);
  expect(headers.has("Pramaan-End-User")).toBe(false);
  expect(JSON.parse(String(requests[0]!.options.body))).toEqual({ input, ...opts });
});
