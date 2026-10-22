import { validateOutgoingDates } from "./dates";
// A fake Pramaan for tests: no network, no key. Route handlers answer each
// capability; anything unrouted throws, so a test fails loudly when code
// reaches for the network. Generation schemas are validated exactly as the
// real client validates them.

import { requireActionKey } from "./action-key";
import { type CapId, Pramaan, PramaanClient, validateGenerationRequest } from "./index";
import { completeGeneration, completeGenerationStream, generationError } from "./generation-reply";
import { validateEmailSend } from "./email-validation";
import type { Job, OutcomeRunOptions, LlmChatStreamEvent, RunOptions } from "./sdk/types";

export type RouteHandler = (input: unknown, opts: RunOptions | undefined) => unknown | Promise<unknown>;

export type OutcomeRoutes = {
  list?: () => unknown[] | Promise<unknown[]>;
  get?: (id: string) => unknown | Promise<unknown>;
  estimate?: (id: string, input: unknown, opts?: OutcomeRunOptions) => unknown | Promise<unknown>;
  run?: (id: string, input: unknown, opts?: OutcomeRunOptions) => unknown | Promise<unknown>;
};

export class FakePramaan extends Pramaan {
  readonly calls: { id: string; input: unknown; opts: RunOptions | undefined }[] = [];
  #routes: Readonly<Record<string, RouteHandler>>;

  constructor(routes: Record<string, RouteHandler> = {}) {
    // The parent only wraps a real client for its typed helpers; no call ever
    // reaches it because `call` is overridden below.
    super(
      new PramaanClient({
        apiKey: "fake",
        fetch: () => Promise.reject(new Error("FakePramaan never reaches the network.")),
      })
    );
    this.#routes = routes;
  }

  override async call(id: CapId, input: unknown, opts?: RunOptions): Promise<unknown> {
    requireActionKey(id, opts?.idempotencyKey);
    validateOutgoingDates(id, input);
    if (id === "payments.payment-link.create" || id === "payments.checkout.create") {
      const category = (input as Record<string, unknown>)?.taxCategory;
      if (category !== undefined && !["digital_products", "saas", "e_book", "edtech", "live_tutoring"].includes(category as string))
        throw new Error("Invalid payment tax category.");
    }
    if (id === "payments.payment-link.create") {
      const row = input as Record<string, any>;
      const allowed = ["amount", "currency", "description", "reference", "customer", "allowPartial", "notifyEmail", "notifySms", "reminders", "taxCategory"];
      if (!row || Array.isArray(row) || Object.keys(row).some(key => !allowed.includes(key)) ||
        !Number.isInteger(row.amount) || row.amount < 1 || row.amount > 99999999 || typeof row.currency !== "string" || !/^[A-Za-z]{3}$/.test(row.currency) ||
        ["allowPartial", "notifyEmail", "notifySms", "reminders"].some(key => row[key] !== undefined && typeof row[key] !== "boolean") ||
        ["description", "reference"].some(key => row[key] !== undefined && (typeof row[key] !== "string" || !row[key].length || row[key].length > (key === "description" ? 2048 : 128))) ||
        (row.customer !== undefined && (!row.customer || Array.isArray(row.customer) || typeof row.customer !== "object" ||
          (row.customer.email !== undefined && (typeof row.customer.email !== "string" || !/^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/.test(row.customer.email))) ||
          ["name", "phone"].some(key => row.customer[key] !== undefined && (typeof row.customer[key] !== "string" || !row.customer[key].length || row.customer[key].length > (key === "name" ? 200 : 30))))))
        throw new Error("Invalid booking payment-link request.");
    }
    if (id === "payments.payment-link.get") {
      const row = input as Record<string, any>;
      if (!row || Array.isArray(row) || Object.keys(row).some(key => !["ref", "paymentLinkId"].includes(key)) || Boolean(row.ref) === Boolean(row.paymentLinkId) ||
        (row.ref && (typeof row.ref !== "string" || !/^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$/.test(row.ref))) ||
        (row.paymentLinkId && (typeof row.paymentLinkId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(row.paymentLinkId))))
        throw new Error("Invalid payment-link read request.");
    }
    if (id.startsWith("auth.backend.") || id === "auth.token.verify") {
      const row = input as Record<string, unknown>;
      const fields = id === "auth.backend.provision" ? [] : id === "auth.backend.domains.set" ? ["domains"] : ["token", "audience", "authorizedParties"];
      if (!row || Array.isArray(row) || Object.keys(row).some(key => !fields.includes(key))) throw new Error("Invalid managed sign-in input.");
      if (id.startsWith("auth.backend.") && !opts?.idempotencyKey) throw new Error("Save the sign-in setup Idempotency-Key.");
      if (id === "auth.backend.domains.set" && (!Array.isArray(row.domains) || row.domains.length > 20 || row.domains.some(value => { try { const url = new URL(String(value)); return url.protocol !== "https:" || url.origin !== value || url.hostname === "localhost"; } catch { return true; } }))) throw new Error("Register public secure origins only.");
      if (id === "auth.token.verify" && (typeof row.token !== "string" || !row.token || row.token.length > 8192)) throw new Error("Invalid session token.");
    }
    if (id === "payments.checkout.create") {
      const row = input as Record<string, any>;
      const allowed = ["lineItems", "successUrl", "cancelUrl", "mode", "customerEmail", "platformFeeAmount", "taxCategory"];
      if (!row || Object.keys(row).some(key => !allowed.includes(key)) || !Array.isArray(row.lineItems) || row.lineItems.length < 1 || row.lineItems.length > 100 ||
        ![undefined, null, "payment", "subscription"].includes(row.mode) ||
        (row.customerEmail !== undefined && (typeof row.customerEmail !== "string" || row.customerEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.customerEmail))) ||
        (row.platformFeeAmount !== undefined && (!Number.isInteger(row.platformFeeAmount) || row.platformFeeAmount < 0 || row.platformFeeAmount > 99999999)) ||
        ![row.successUrl, row.cancelUrl].every(value => typeof value === "string" && value.length > 0) ||
        row.lineItems.some((item: any) => !item || Object.keys(item).some(key => !["name", "amount", "currency", "quantity", "interval"].includes(key)) ||
          typeof item.name !== "string" || !item.name.length || item.name.length > 250 || !Number.isInteger(item.amount) || item.amount < 1 || item.amount > 99999999 ||
          typeof item.currency !== "string" || !/^[a-z]{3}$/.test(item.currency) || item.currency !== row.lineItems[0].currency ||
          (item.quantity !== undefined && (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000)) ||
          (row.mode === "subscription" ? !["day", "week", "month", "year"].includes(item.interval) : item.interval !== undefined)))
        throw new Error("Invalid checkout request.");
    }
    if (id === "payments.checkout.get") {
      const row = input as Record<string, any>;
      if (!row || Object.keys(row).some(key => !["ref", "checkoutId", "sessionResult"].includes(key)) || Boolean(row.ref) === Boolean(row.checkoutId) ||
        (row.ref && (typeof row.ref !== "string" || !/^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$/.test(row.ref))) ||
        (row.checkoutId && (typeof row.checkoutId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(row.checkoutId) || typeof row.sessionResult !== "string" || !row.sessionResult.length || row.sessionResult.length > 20000)))
        throw new Error("Invalid checkout read request.");
    }
    if (id === "db.postgres.provision") {
      if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length || !opts?.idempotencyKey)
        throw new Error("Database provision requires an empty input and a saved Idempotency-Key.");
    }
    if (id === "llm.chat" || id === "llm.complete") validateGenerationRequest(input);
    if (id === "email.send") validateEmailSend(input);
    if (id === "billing.refund.create" || id === "payments.payment.reverse") {
      const request = input as { ref?: string; transactionId?: string; paymentId?: string; amount?: { amount: number; currency: string } };
      if (!opts?.idempotencyKey) throw new Error("Refunds require an Idempotency-Key.");
      if (Boolean(request.ref) === Boolean(id === "billing.refund.create" ? request.transactionId : request.paymentId))
        throw new Error("Send exactly one payment reference or legacy identifier.");
      if (id === "payments.payment.reverse" && request.amount) throw new Error("Full reversal has no amount field.");
      if (request.ref && (!/^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$/.test(request.ref) || request.transactionId || request.paymentId))
        throw new Error("Send a valid payment ref without a legacy identifier.");
      if (request.amount && (!Number.isInteger(request.amount.amount) || request.amount.amount < 1 || request.amount.amount > 99999999 || !/^[a-zA-Z]{3}$/.test(request.amount.currency)))
        throw new Error("Refund amount must use whole minor units and the charge currency.");
    }
    if (id === "apps.connection.start") {
      const request = input as Record<string, any>;
      if (!request.app || !request.redirectUrl || !/^[A-Za-z0-9_.-]{1,128}$/.test(request.endUserRef) || request.access && !["read", "read-write"].includes(request.access)) throw new Error("Invalid owned connection request.");
    }
    if (id.startsWith("links.short.")) {
      const row = input as Record<string, any>;
      const allowed = id === "links.short.create" ? ["endUserRef", "app", "destinationUrl", "slug", "domain"] : id === "links.short.update" ? ["endUserRef", "ref", "destinationUrl"] : id === "links.short.delete" ? ["endUserRef", "ref", "confirm"] : id === "links.short.clicks.get" ? ["endUserRef", "ref", "startDate", "endDate"] : ["endUserRef", "ref"];
      if (Object.keys(row).some(key => !allowed.includes(key)) || !/^[A-Za-z0-9_.-]{1,128}$/.test(row.endUserRef)) throw new Error("Invalid short-link input field or host reference.");
      if (id === "links.short.create" && (!/^[a-z0-9_-]{1,64}$/.test(row.app) || row.slug && !/^[A-Za-z0-9_-]{1,128}$/.test(row.slug) || row.domain && !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(row.domain))) throw new Error("Invalid short-link app, slug or domain.");
      if (id !== "links.short.create" && !/^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$/.test(row.ref)) throw new Error("Invalid short-link reference.");
      if (["links.short.create", "links.short.update", "links.short.delete"].includes(id) && !opts?.idempotencyKey) throw new Error("Short-link changes require an Idempotency-Key.");
      if (id === "links.short.delete" && row.confirm !== true) throw new Error("Approve permanent deletion first.");
      if (id === "links.short.create" || id === "links.short.update") { const url = new URL(row.destinationUrl); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid destination URL."); }
      if (id === "links.short.clicks.get") {
        for (const field of ["startDate", "endDate"]) if (row[field] && (!/^\d{4}-\d{2}-\d{2}$/.test(row[field]) || !Number.isFinite(Date.parse(row[field])) || new Date(row[field]).toISOString().slice(0, 10) !== row[field])) throw new Error("Invalid click date.");
        const end = Date.parse(row.endDate || new Date().toISOString().slice(0, 10)), start = Date.parse(row.startDate || new Date(end - 29 * 86400_000).toISOString().slice(0, 10));
        if (end < start || end - start > 89 * 86400_000) throw new Error("Click windows must be at most 90 days inclusive.");
      }
    }
    if (id.startsWith("meetings.")) {
      const request = input as Record<string, any>;
      if (!/^[A-Za-z0-9_.-]{1,128}$/.test(request.endUserRef)) throw new Error("A private host reference is required.");
      if (id === "meetings.room.create") {
        if (!opts?.idempotencyKey || !request.app || !request.title || !Number.isFinite(Date.parse(request.start)) || request.durationMinutes < 1 || request.durationMinutes > 1440) throw new Error("Invalid meeting creation request.");
      } else if (!request.ref) throw new Error("A meeting reference is required.");
      if (id === "meetings.room.delete" && !opts?.idempotencyKey) throw new Error("Meeting deletion requires an Idempotency-Key.");
    }
    if (id === "calendar.free-busy.get") {
      const request = input as { calendars: Array<{ inbox: string; calendarName?: string }>; after: string; before: string; timezone: string };
      if (!Array.isArray(request.calendars) || request.calendars.length < 1 || request.calendars.length > 20 || request.calendars.some(row => !row.inbox || Object.keys(row).some(key => !["inbox", "calendarName"].includes(key))) ||
        !/Z$/.test(request.after) || !/Z$/.test(request.before) || !Number.isFinite(Date.parse(request.after)) || !Number.isFinite(Date.parse(request.before)) || Date.parse(request.before) <= Date.parse(request.after) || Date.parse(request.before) - Date.parse(request.after) > 62 * 86400_000)
        throw new Error("Invalid free-busy calendar selection or window.");
      new Intl.DateTimeFormat("en", { timeZone: request.timezone });
    }
    this.calls.push({ id, input, opts });
    const route = this.#routes[id];
    if (!route) {
      throw new Error(`FakePramaan has no route for "${id}". Add one in the test.`);
    }
    try {
      const result = await route(input, opts);
      return id === "llm.chat" || id === "llm.complete" ? completeGeneration(result) : result;
    } catch (error) { throw id === "llm.chat" || id === "llm.complete" ? generationError(error) : error; }
  }

  /** Route one or more capability calls after construction. */
  route(routes: Record<string, RouteHandler>): void {
    this.#routes = { ...this.#routes, ...routes };
  }

  /** Every call made to a capability id, in order. */
  callsTo(id: CapId): unknown[] {
    return this.calls.filter((entry) => entry.id === id).map((entry) => entry.input);
  }

  readonly outcomeCalls: { verb: string; id?: string; input: unknown; opts?: OutcomeRunOptions }[] = [];
  #outcomeRoutes: OutcomeRoutes = {};

  routeOutcomes(routes: OutcomeRoutes): void {
    this.#outcomeRoutes = { ...this.#outcomeRoutes, ...routes };
  }

  override get outcomes() {
    type Outcomes = PramaanClient["outcomes"];
    return {
      list: async (): Promise<Awaited<ReturnType<Outcomes["list"]>>> => {
        this.outcomeCalls.push({ verb: "list", input: null });
        if (!this.#outcomeRoutes.list)
          throw new Error("FakePramaan has no outcomes.list route. Add one in the test.");
        return (await this.#outcomeRoutes.list()) as Awaited<ReturnType<Outcomes["list"]>>;
      },
      get: async (id: string): Promise<Awaited<ReturnType<Outcomes["get"]>>> => {
        this.outcomeCalls.push({ verb: "get", id, input: null });
        if (!this.#outcomeRoutes.get) throw new Error(`FakePramaan has no outcomes.get route for "${id}".`);
        return (await this.#outcomeRoutes.get(id)) as Awaited<ReturnType<Outcomes["get"]>>;
      },
      estimate: async (
        id: string,
        input: unknown,
        opts?: OutcomeRunOptions
      ): Promise<Awaited<ReturnType<Outcomes["estimate"]>>> => {
        this.outcomeCalls.push({ verb: "estimate", id, input, opts });
        if (!this.#outcomeRoutes.estimate)
          throw new Error(`FakePramaan has no outcomes.estimate route for "${id}".`);
        return (await this.#outcomeRoutes.estimate(id, input, opts)) as Awaited<
          ReturnType<Outcomes["estimate"]>
        >;
      },
      start: async (
        id: string,
        input: unknown,
        opts?: OutcomeRunOptions
      ): Promise<Awaited<ReturnType<Outcomes["start"]>>> => {
        this.outcomeCalls.push({ verb: "start", id, input, opts });
        if (!this.#outcomeRoutes.run) throw new Error(`FakePramaan has no outcomes.start route for "${id}".`);
        return (await this.#outcomeRoutes.run(id, input, opts)) as Awaited<ReturnType<Outcomes["start"]>>;
      },
      run: async (
        id: string,
        input: unknown,
        opts?: OutcomeRunOptions
      ): Promise<Awaited<ReturnType<Outcomes["run"]>>> => {
        this.outcomeCalls.push({ verb: "run", id, input, opts });
        if (!this.#outcomeRoutes.run) throw new Error(`FakePramaan has no outcomes.run route for "${id}".`);
        return (await this.#outcomeRoutes.run(id, input, opts)) as Awaited<ReturnType<Outcomes["run"]>>;
      },
    };
  }

  #jobRoutes: { get?: (id: string) => Promise<Job> | Job; cancel?: (id: string) => Promise<Job> | Job } = {};
  readonly jobCalls: { verb: string; id: string }[] = [];
  routeJobs(routes: {
    get?: (id: string) => Promise<Job> | Job;
    cancel?: (id: string) => Promise<Job> | Job;
  }) {
    this.#jobRoutes = routes;
  }
  override get jobs() {
    return {
      get: async (id: string): Promise<Job> => {
        this.jobCalls.push({ verb: "get", id });
        if (!this.#jobRoutes.get) throw new Error("FakePramaan has no jobs.get route.");
        return this.#jobRoutes.get(id);
      },
      cancel: async (id: string): Promise<Job> => {
        this.jobCalls.push({ verb: "cancel", id });
        if (!this.#jobRoutes.cancel) throw new Error("FakePramaan has no jobs.cancel route.");
        return this.#jobRoutes.cancel(id);
      },
      wait: async (id: string): Promise<Job> => {
        const job = await this.jobs.get(id);
        if (job.status === "running") throw new Error("Route a finished job for a fake wait.");
        return job;
      },
    };
  }

  readonly streamCalls: { id: string; input: unknown }[] = [];
  readonly estimateCalls: { id: string; input: unknown; opts?: RunOptions }[] = [];
  private estimateRoute?: (id: string, input: unknown, opts?: RunOptions) => unknown | Promise<unknown>;
  routeEstimate(route: NonNullable<FakePramaan["estimateRoute"]>) { this.estimateRoute = route; }
  override get capabilities() {
    return { ...super.capabilities, estimate: async (id: string, input: unknown, opts?: RunOptions) => {
      this.estimateCalls.push({ id, input, opts });
      if (!this.estimateRoute) throw new Error("Add an estimate route to this fixture.");
      return await this.estimateRoute(id, input, opts) as Awaited<ReturnType<Pramaan["capabilities"]["estimate"]>>;
    } };
  }
  override async run(id: CapId, input: unknown, opts?: RunOptions): Promise<unknown> { return this.call(id, input, opts); }

  #streamRoutes: {
    route?: (input: unknown) => AsyncGenerator<LlmChatStreamEvent>;
  } = {};

  routeStream(route: (input: unknown) => AsyncGenerator<LlmChatStreamEvent>): void {
    this.#streamRoutes = { route };
  }

  override llmChatStream(input: unknown, _opts?: RunOptions): AsyncGenerator<LlmChatStreamEvent> {
    const self = this;
    async function* routed(): AsyncGenerator<LlmChatStreamEvent> {
      validateGenerationRequest(input);
      self.streamCalls.push({ id: "llm.chat", input });
      if (!self.#streamRoutes.route)
        throw new Error('FakePramaan has no stream route for "llm.chat". Add one in the test.');
      yield* self.#streamRoutes.route(input);
    }
    return completeGenerationStream(routed());
  }
}
