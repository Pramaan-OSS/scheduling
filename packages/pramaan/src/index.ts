import { zonedInstant, validateOutgoingDates } from "./dates";
export { zonedInstant, validateOutgoingDates } from "./dates";
// @scheduling/pramaan — the one module through which every outside call in this
// product flows. Built from PRAMAAN_API_KEY and optional PRAMAAN_BASE_URL.
// Nothing else in the repository talks to an outside service. The SDK is
// provided by @pramaan/sdk with product-only compatibility helpers under src/sdk.

import { completeGeneration, completeGenerationStream, generationError } from "./generation-reply";
export { IncompleteGeneration } from "./generation-reply";
import { withModelRateLimit, withStreamRateLimit, type WaitForModel } from "./rate-limit";
import { requireActionKey } from "./action-key";
import { randomUUID } from "node:crypto";
import { CATALOG, capabilityInfo } from "./catalog";
import { normalizeGenerationSchemas, validateGenerationSchemas } from "./json-schema";
import { DEFAULT_BASE_URL, PramaanClient } from "./sdk/client";
import { PramaanError } from "./sdk/errors";
import type {
  CapabilityDescription,
  CapabilityInfo,
  CapabilitySummary,
  Estimate,
  Job,
  JobStatus,
  LlmChatStreamEvent,
  OutcomeDescription,
  OutcomeEstimate,
  OutcomeRun,
  OutcomeRunOptions,
  OutcomeRunStep,
  OutcomeStep,
  OutcomeSummary,
  RunOptions,
  WaitOptions,
} from "./sdk/types";
import type { Caps } from "./capabilities";

export { CATALOG, capabilityInfo };
export {
  assertBoundedJsonSchema,
  normalizeJsonSchema,
  normalizeGenerationSchemas,
  validateGenerationSchemas,
} from "./json-schema";
export {
  firstList,
  firstText,
  type JsonObject,
  type JsonValue,
  list,
  record,
  text,
} from "./json";
export {
  DEFAULT_BASE_URL,
  PRAMAAN_API_URL,
  PramaanClient,
  type PramaanOptions,
} from "./sdk/client";
export { toOutcomeRun } from "./sdk/client";
export { type ErrorCode, PramaanError } from "./sdk/errors";
export type {
  CapabilityDescription,
  CapabilityInfo,
  CapabilitySummary,
  Estimate,
  Job,
  JobStatus,
  LlmChatStreamEvent,
  OutcomeDescription,
  OutcomeEstimate,
  OutcomeRun,
  OutcomeRunOptions,
  OutcomeRunStep,
  OutcomeStep,
  OutcomeSummary,
  RunOptions,
  WaitOptions,
};
export type { Caps, Message, ToolDef } from "./capabilities";

/** Capability ids this product calls, as a const so callers never mistype one. */
export const Cap = {
  databaseProvision: "db.postgres.provision",
  authBackendProvision: "auth.backend.provision",
  authBackendDomainsSet: "auth.backend.domains.set",
  authTokenVerify: "auth.token.verify",
  emailSend: "email.send",
  emailTemplateSend: "email.template.send",
  emailScheduleCreate: "email.message.schedule.create",
  emailScheduleGet: "email.message.schedule.get",
  emailScheduleCancel: "email.message.schedule.cancel",
  scheduleCreate: "schedule.create",
  scheduleGet: "schedule.get",
  scheduleRunsList: "schedule.runs.list",
  emailAttachmentFromUrl: "email.attachment.from-url",
  emailAttachmentGet: "email.attachment.get",
  emailStatus: "email.status",
  smsSend: "sms.send",
  smsSendBulk: "sms.send-bulk",
  smsStatus: "sms.status",
  optOutCheck: "messaging.opt-out.check",
  optOutsList: "messaging.opt-outs.list",
  optOutAdd: "messaging.opt-out.add",
  peoplePhoneVerify: "people.phone.verify",
  phoneNumberParse: "phone.number.parse",
  peopleProfileGet: "people.profile.get",
  authSocialExchange: "auth.social.exchange",
  authEnterpriseStart: "auth.enterprise.start",
  authEnterpriseConnectionCreate: "auth.enterprise-connection.create",
  authEnterpriseConnectionDelete: "auth.enterprise-connection.delete",
  authEnterpriseConnectionsList: "auth.enterprise-connections.list",
  authBotCheckVerify: "auth.bot-check.verify",
  storageObjectPut: "storage.object.put",
  storageObjectGet: "storage.object.get",
  storageObjectUploadUrl: "storage.object.upload-url",
  storageObjectDownloadUrl: "storage.object.download-url",
  storageUploadCreate: "storage.upload.create",
  calendarCalendarsList: "calendar.calendars.list",
  calendarEventsList: "calendar.events.list",
  shortLinkCreate: "links.short.create",
  shortLinkGet: "links.short.get",
  shortLinkUpdate: "links.short.update",
  shortLinkDelete: "links.short.delete",
  shortLinkClicksGet: "links.short.clicks.get",
  meetingRoomCreate: "meetings.room.create",
  meetingRoomGet: "meetings.room.get",
  meetingRoomDelete: "meetings.room.delete",
  meetingRecordingsList: "meetings.recordings.list",
  meetingRecordingGet: "meetings.recording.get",
  calendarFreeBusyGet: "calendar.free-busy.get",
  calendarAgendaGet: "calendar.agenda.get",
  calendarEventCreate: "calendar.event.create",
  calendarEventUpdate: "calendar.event.update",
  calendarEventDelete: "calendar.event.delete",
  calendarEventGet: "calendar.event.get",
  calendarEventInstancesList: "calendar.event.instances.list",
  timeHolidaysList: "time.holidays.list",
  timeBusinessDayCheck: "time.business-day.check",
  timeTimezoneLookup: "time.timezone.lookup",
  weatherForecastGet: "weather.forecast.get",
  weatherForecastDaily: "weather.forecast.daily",
  domainsDnsRecordsList: "domains.dns-records.list",
  domainsDnsRecordsApply: "domains.dns-records.apply",
  domainsList: "domains.list",
  paymentsOrderCreate: "payments.order.create",
  paymentsCheckoutGet: "payments.checkout.get",
  paymentsPaymentCapture: "payments.payment.capture",
  paymentsPaymentReverse: "payments.payment.reverse",
  paymentsPaymentCancel: "payments.payment.cancel",
  paymentsCheckoutCreate: "payments.checkout.create",
  paymentsAccountConnect: "payments.account.connect",
  paymentsAccountStatus: "payments.account.status",
  paymentsPaymentLinkCreate: "payments.payment-link.create",
  paymentsPaymentLinkGet: "payments.payment-link.get",
  paymentsPaymentLinkCancel: "payments.payment-link.cancel",
  billingTransactionsList: "billing.transactions.list",
  billingRefundCreate: "billing.refund.create",
  billingSubscriptionCreate: "billing.subscription.create",
  billingSubscriptionGet: "billing.subscription.get",
  billingSubscriptionCancel: "billing.subscription.cancel",
  billingPlanGet: "billing.plan.get",
  billingCustomerCreate: "billing.customer.create",
  billingPortalCreate: "billing.portal.create",
  billingCreditsBalance: "billing.credits.balance",
  llmChat: "llm.chat",
  llmComplete: "llm.complete",
  appsCatalogSearch: "apps.catalog.search",
  appsConnectionStart: "apps.connection.start",
  appsConnectionsList: "apps.connections.list",
  appsConnectionRevoke: "apps.connection.revoke",
  appsActionExecute: "apps.action.execute",
  notifyMessageSend: "notify.message.send",
  companiesEnrich: "companies.enrich",
  companiesLogoGet: "companies.logo.get",
  peopleEnrich: "people.enrich",
  peopleEmailVerify: "people.email.verify",
  peopleEmailValidate: "people.email.validate",
  peopleEmailThreatCheck: "people.email.threat.check",
  webPageMetadata: "web.page.metadata",
  webRead: "web.read",
  voiceAssistantCreate: "voice.assistant.create",
  voiceAssistantUpdate: "voice.assistant.update",
  voiceCallStartAgent: "voice.call.start-agent",
  voiceToolCreate: "voice.tool.create",
  phoneNumberPurchase: "phone.number.purchase",
  voiceNumberImport: "voice.number.import",
} as const;

export type CapId = (typeof Cap)[keyof typeof Cap];

/** Plain words for a surface that cannot run yet. No service name, no detail. */
export const NOT_AVAILABLE = "This feature is not available yet.";

/** True when an error means the capability is not served yet. */
export function isUnavailable(error: unknown): boolean {
  return (
    error instanceof PramaanError && (error.code === "upstream_unavailable" || error.code === "not_found")
  );
}

/**
 * Message to show for a failed outside call. Unavailable surfaces get one
 * plain sentence; everything else gets a generic line. Never a service name,
 * never a stack trace, never the raw error.
 */
export function unavailableMessage(error: unknown): string {
  if (error instanceof MissingPramaanKey) return MISSING_KEY_MESSAGE;
  if (error instanceof Error && [NOT_AVAILABLE, MISSING_KEY_MESSAGE].includes(error.message)) return error.message;
  return isUnavailable(error)
    ? NOT_AVAILABLE
    : "Could not confirm the result. Check its status before trying again.";
}
export const MISSING_KEY_MESSAGE = "Add PRAMAAN_API_KEY to .env";
export class MissingPramaanKey extends PramaanError {
  constructor() {
    super("unauthorized", MISSING_KEY_MESSAGE, { status: 422 });
  }
}
export function requirePramaan(): Pramaan {
  const client = pramaanFromEnv();
  if (!client) throw new MissingPramaanKey();
  return client;
}

export function validateGenerationRequest(input: unknown): asserts input is Caps.LlmRequest {
  const request = input as Caps.LlmRequest & { prompt?: unknown };
  if (
    !request ||
    typeof request !== "object" ||
    "prompt" in request ||
    !Array.isArray(request.messages) ||
    !request.messages.length
  )
    throw new PramaanError("invalid_request", "Generation requires messages instead of prompt.");
  for (const [index, message] of request.messages.entries())
    if (
      !message ||
      !["system", "user", "assistant", "tool"].includes(message.role) ||
      typeof message.content !== "string"
    )
      throw new PramaanError(
        "invalid_request",
        `Generation messages at #/messages/${index} must contain a role and text.`
      );
  if (!Number.isInteger(request.maxTokens) || request.maxTokens! < 64 || request.maxTokens! > 8192)
    throw new PramaanError("invalid_request", "Generation requires maxTokens from 64 to 8192.");
  validateGenerationSchemas(request);
}
export function prepareGenerationRequest(input: unknown): Caps.LlmRequest {
  const request = normalizeGenerationSchemas({
    ...(input as Record<string, unknown>),
    maxTokens: (input as Caps.LlmRequest)?.maxTokens ?? 1024,
  });
  validateGenerationRequest(request);
  return request;
}

type AnyReq = Record<string, unknown>;

export class Pramaan {
  constructor(
    private readonly client: PramaanClient,
    private readonly waitForRateLimit?: WaitForModel
  ) {}

  get raw(): PramaanClient {
    return this.client;
  }

  async call(id: CapId, input: unknown, opts?: RunOptions): Promise<unknown> {
    validateOutgoingDates(id, input);
    if (id === Cap.llmChat || id === Cap.llmComplete) {
      const prepared = prepareGenerationRequest(input);
      return withModelRateLimit(() => this.client.call(id, prepared, opts), this.waitForRateLimit)
        .then(completeGeneration).catch(error => { throw generationError(error); });
    }
    return this.client.call(id, input, opts);
  }
  async run(id: CapId, input: unknown, opts?: RunOptions): Promise<unknown> {
    validateOutgoingDates(id, input);
    const generation = id === Cap.llmChat || id === Cap.llmComplete;
    try {
      const result = await this.client.run(id, generation ? prepareGenerationRequest(input) : input, opts);
      return generation ? completeGeneration(result) : result;
    } catch (error) { throw generation ? generationError(error) : error; }
  }


  info(id: string) {
    return this.client.info(id);
  }

  get jobs() {
    return this.client.jobs;
  }

  get capabilities() {
    return this.client.capabilities;
  }

  /**
   * Outcomes: fixed recipes of capability steps. Estimate first (the plan is
   * good for 15 minutes), show a person the steps when approval is needed,
   * then run with the plan. A long run answers 202 + a job; cancel through
   * jobs.cancel. Never auto-retry a run: a step with effect "unknown" may
   * already have acted — tell the user to check before retrying.
   */
  get accounts() { return this.client.accounts; }
  get outcomes() {
    return this.client.outcomes;
  }

  llmChatStream(input: Caps.LlmRequest, opts?: RunOptions): AsyncGenerator<LlmChatStreamEvent> {
    const prepared = prepareGenerationRequest(input);
    return completeGenerationStream(withStreamRateLimit(() => this.client.llmChatStream(prepared, opts), this.waitForRateLimit));
  }

  // ── Typed helpers, one per capability family the product uses ─────────────

  shortLinkCreate(input: Caps.ShortLinkCreateRequest, opts?: RunOptions) { return this.call(Cap.shortLinkCreate, input, opts) as Promise<Caps.ShortLinkResult>; }
  shortLinkGet(input: Caps.RoomRequest, opts?: RunOptions) { return this.call(Cap.shortLinkGet, input, opts) as Promise<Caps.ShortLinkReadResult>; }
  shortLinkUpdate(input: Caps.ShortLinkUpdateRequest, opts?: RunOptions) { return this.call(Cap.shortLinkUpdate, input, opts) as Promise<Caps.ShortLinkResult>; }
  shortLinkDelete(input: Caps.ShortLinkDeleteRequest, opts?: RunOptions) { return this.call(Cap.shortLinkDelete, input, opts) as Promise<{ deleted: true }>; }
  shortLinkClicksGet(input: Caps.ShortLinkClicksRequest, opts?: RunOptions) { return this.call(Cap.shortLinkClicksGet, input, opts) as Promise<Caps.ShortLinkClicksResult>; }

  meetingRoomCreate(input: Caps.RoomCreateRequest, opts: RunOptions) { return this.call(Cap.meetingRoomCreate, input, opts) as Promise<Caps.RoomResult>; }
  meetingRoomGet(input: Caps.RoomRequest) { return this.call(Cap.meetingRoomGet, input) as Promise<Caps.RoomResult>; }
  meetingRoomDelete(input: Caps.RoomRequest, opts: RunOptions) { return this.call(Cap.meetingRoomDelete, input, opts) as Promise<{ deleted: boolean }>; }
  meetingRecordingsList(input: Caps.RecordingsRequest) { return this.call(Cap.meetingRecordingsList, input) as Promise<{ results: Caps.RecordingResult[]; nextCursor?: string }>; }
  meetingRecordingGet(input: Caps.RoomRequest) { return this.call(Cap.meetingRecordingGet, input) as Promise<Caps.RecordingResult>; }
  calendarFreeBusy(input: Caps.FreeBusyRequest, opts?: RunOptions) { return this.call(Cap.calendarFreeBusyGet, input, opts) as Promise<Caps.FreeBusyResult>; }
  paymentLinkCreate(input: Caps.PaymentLinkCreateRequest, opts: RunOptions) { return this.call(Cap.paymentsPaymentLinkCreate, input, opts) as Promise<Caps.PaymentLinkResult>; }
  paymentLinkGet(input: Caps.PaymentLinkGetRequest, opts?: RunOptions) { return this.call(Cap.paymentsPaymentLinkGet, input, opts) as Promise<Caps.PaymentLinkGetResult>; }
  checkoutGet(input: Caps.CheckoutGetRequest, opts?: RunOptions) { return this.call(Cap.paymentsCheckoutGet, input, opts); }
  refundPayment(input: Caps.RefundRequest, opts: RunOptions) { return this.call(Cap.billingRefundCreate, input, opts); }
  reversePayment(input: Caps.ReversePaymentRequest, opts: RunOptions) { return this.call(Cap.paymentsPaymentReverse, input, opts); }

  emailSend(input: Caps.EmailSendRequest, opts?: RunOptions) {
    return this.call(Cap.emailSend, input, opts) as Promise<Caps.EmailSendResult>;
  }
  emailTemplateSend(input: Caps.EmailTemplateSendRequest, opts?: RunOptions) {
    return this.call(Cap.emailTemplateSend, input, opts);
  }
  emailScheduleCreate(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.emailScheduleCreate, input, opts);
  }
  smsSend(input: Caps.SmsSendRequest, opts?: RunOptions) {
    return this.call(Cap.smsSend, input, opts) as Promise<Caps.SmsSendResult>;
  }
  smsStatus(input: { ref: string }, opts?: RunOptions) {
    return this.call(Cap.smsStatus, input, opts);
  }
  optOutCheck(input: { address: string; channel: string }, opts?: RunOptions) {
    return this.call(Cap.optOutCheck, input, opts);
  }
  calendarAgenda(input: Caps.CalendarAgendaRequest, opts?: RunOptions) {
    return this.call(Cap.calendarAgendaGet, input, opts) as Promise<Caps.CalendarAgendaResult>;
  }
  calendarEvents(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.calendarEventsList, input, opts) as Promise<Caps.CalendarAgendaResult>;
  }
  calendarEventCreate(input: Caps.CalendarEventCreateRequest, opts?: RunOptions) {
    return this.call(Cap.calendarEventCreate, input, opts) as Promise<Caps.CalendarEventResult>;
  }
  calendarEventUpdate(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.calendarEventUpdate, input, opts);
  }
  calendarEventDelete(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.calendarEventDelete, input, opts);
  }
  calendarEventGet(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.calendarEventGet, input, opts);
  }
  calendarEventInstances(input: AnyReq, opts?: RunOptions) {
    return this.call(Cap.calendarEventInstancesList, input, opts);
  }
  appsCatalogSearch(input: Caps.AppsCatalogSearchRequest, opts?: RunOptions) {
    return this.call(Cap.appsCatalogSearch, input, opts) as Promise<Caps.AppsCatalogSearchResult>;
  }
  appsConnectionStart(input: Caps.AppsConnectionStartRequest, opts?: RunOptions) {
    return this.call(Cap.appsConnectionStart, input, opts);
  }
  appsConnectionsList(input: Caps.AppsConnectionsListRequest, opts?: RunOptions) {
    return this.call(Cap.appsConnectionsList, input, opts);
  }
  appsActionExecute(input: Caps.AppsActionExecuteRequest, opts?: RunOptions) {
    return this.call(Cap.appsActionExecute, input, opts);
  }
  llmChat(input: Caps.LlmRequest, opts?: RunOptions) {
    return this.call(Cap.llmChat, input, opts) as Promise<Caps.LlmResult>;
  }
  llmComplete(input: Caps.LlmRequest, opts?: RunOptions) {
    return this.call(Cap.llmComplete, input, opts) as Promise<Caps.LlmResult>;
  }
}

/**
 * Busy intervals for one person from their primary calendar only. The agenda
 * call reads one calendar per call and has no calendar id; cancelled and
 * declined rows are dropped here. Other calendars on the account are not
 * checked. Window at most 366 days; follows the page cursor.
 */
export async function busyIntervals(
  p: Pramaan,
  input: { inbox: string; startAt: string; endAt: string }
): Promise<Array<{ start: string; end: string }>> {
  const start = Date.parse(zonedInstant(input.startAt)), end = Date.parse(zonedInstant(input.endAt));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 366 * 86400_000)
    throw new PramaanError("invalid_request", "Choose an availability window of at most 366 days.");
  const out = new Map<string, { start: string; end: string }>();
  async function pages(id: CapId, params: Record<string, unknown>) {
    const rows: Caps.CalendarEventRow[] = [], seen = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < 200; page++) {
      const response = await p.call(id, { inbox: input.inbox, ...params, limit: 50, ...(cursor ? { cursor } : {}) }) as Caps.CalendarAgendaResult;
      if (!Array.isArray(response.results)) throw new PramaanError("upstream_unavailable", "Availability could not be checked.");
      rows.push(...response.results);
      cursor = response.nextCursor || undefined;
      if (!cursor) return rows;
      if (seen.has(cursor)) break;
      seen.add(cursor);
    }
    throw new PramaanError("upstream_unavailable", "The complete availability window could not be checked.");
  }
  const window = { after: new Date(start).toISOString(), before: new Date(end).toISOString(), includeOverlapping: true };
  const rows = await pages(Cap.calendarAgendaGet, window);
  if (end > Date.now() + 90 * 86400_000) {
    const events = await pages(Cap.calendarEventsList, {});
    for (const row of events) if (row.kind === "series" && row.status !== "cancelled" && row.responseStatus !== "declined") {
      if (!row.ref) throw new PramaanError("upstream_unavailable", "Recurring availability could not be checked.");
      rows.push(...await pages(Cap.calendarEventInstancesList, { ...window, ref: row.ref }));
    }
  }
  for (const row of rows) {
    if (row.status === "cancelled" || row.responseStatus === "declined" || row.kind === "series") continue;
    const from = row.startAt, to = row.endAt;
    if (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(to) <= Date.parse(from))
      throw new PramaanError("upstream_unavailable", "An event's busy time could not be checked.");
    if (Date.parse(from) < end && Date.parse(to) > start) out.set(`${from}:${to}`, { start: from, end: to });
  }
  return [...out.values()];
}

/** A new key for an `external_*` call: the same key can never run the call twice. */
export function idempotencyKey(): string {
  return randomUUID();
}

/** Builds a client from explicit settings (env loaders pass theirs). */
export function createPramaan(options: {
  apiKey: string;
  baseUrl?: string;
  fetch?: (input: string, init: RequestInit) => Promise<Response>;
  sleep?: (ms: number) => Promise<void>;
  waitForRateLimit?: WaitForModel;
}): Pramaan {
  return new Pramaan(
    new PramaanClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      fetch: options.fetch,
      sleep: options.sleep,
    }),
    options.waitForRateLimit
  );
}

/**
 * The one place `PRAMAAN_API_KEY` is read from the environment. Every consumer
 * gets its client (or its answer about whether one is configured) from here.
 */
export function pramaanFromEnv(): Pramaan | null {
  const apiKey = process.env.PRAMAAN_API_KEY?.trim();
  if (!apiKey) return null;
  return createPramaan({
    apiKey,
    baseUrl: process.env.PRAMAAN_BASE_URL?.trim() || undefined,
    ...(process.env.PRAMAAN_FAKE === "1" ? { fetch: async (input: string, init: RequestInit) => {
      const id = decodeURIComponent(new URL(input).pathname.split("/").pop() || "");
      try { requireActionKey(id, new Headers(init.headers).get("Idempotency-Key")); }
      catch { return Response.json({ error: { code: "invalid_request", message: "Idempotency-Key header is required for this capability.", retryable: false } }, { status: 400 }); }
      if (id === "calendar.calendars.list") return Response.json({ results: [{ name: "Primary calendar", isPrimary: true, readOnly: false }] });
      if (id === "calendar.agenda.get") return Response.json({ results: [] });
      if (id === "auth.backend.provision") return Response.json({ status: "ready", authUrl: "https://signin.example.test/api/auth", jwksUrl: "https://signin.example.test/api/auth/jwks" });
      if (id === "auth.token.verify") {
        const body = JSON.parse(String(init.body || "{}"));
        return Response.json(body.token === "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmaXh0dXJlX3VzZXIiLCJlbWFpbCI6Im1hbmFnZWRAZXhhbXBsZS50ZXN0IiwibmFtZSI6Ik1hbmFnZWQgRml4dHVyZSIsImVtYWlsVmVyaWZpZWQiOnRydWV9.fixture-signature" ? { valid: true, userId: "fixture_user" } : { valid: false });
      }
      if (id === "auth.backend.domains.set") return Response.json({ allowedDomains: JSON.parse(String(init.body || "{}")).domains });
      return Response.json({ error: { code: "upstream_unavailable", message: "This fixture action is not available yet.", retryable: false } }, { status: 503 });
    } } : {}),
  });
}

/** True when a key is configured. */
export function pramaanKeySet(): boolean {
  return Boolean(process.env.PRAMAAN_API_KEY?.trim());
}
