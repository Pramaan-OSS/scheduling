// Requests and results for the capabilities this product calls. Shapes follow the
// platform's capability contracts; only the fields this product uses are kept.
// `llm.chat` / `llm.complete` take `messages` (never a bare prompt) and a
// `maxTokens` of 64 or more; tool `parameters` / `jsonSchema` must fit the
// bounded subset enforced in json-schema.ts.

import type { JsonObject } from "./json";

export type Message = {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string;
  readonly toolCallId?: string;
  readonly name?: string;
};

export type ToolDef = {
  readonly name: string;
  readonly description?: string;
  /** Bounded-subset JSON Schema; root must be an object. */
  readonly parameters: Record<string, unknown>;
};

export namespace Caps {
  export interface ManagedAuthResult { status: "ready"; authUrl: string; jwksUrl: string }
  export interface ManagedTokenRequest { token: string; audience?: string; authorizedParties?: string[] }
  export interface ManagedTokenResult { valid: boolean; userId?: string; sessionId?: string; orgId?: string | null; expiresAt?: string }
  export interface DatabaseProvisionResult {
    readonly status: "ready" | "paused" | "transferred" | "held";
    readonly database: "app";
    readonly role: "app_owner";
    readonly created: boolean;
    readonly limits: { maxComputeUnits: number; maxStorageGb: number; monthlyComputeHours: number };
    readonly connectionString?: string;
    readonly directConnectionString?: string;
  }
  export interface LlmRequest {
    readonly messages: ReadonlyArray<Message>;
    /** 64 or more. */
    readonly maxTokens?: number;
    readonly tools?: ReadonlyArray<ToolDef>;
    readonly jsonSchema?: Record<string, unknown>;
  }
  export interface LlmResult {
    readonly text?: string;
    readonly finishReason?: string;
    readonly usage?: { readonly inputTokens: number; readonly outputTokens: number };
    readonly toolCalls?: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly arguments: JsonObject;
    }>;
  }

  // email.send contract adopted from lab e0922353.
  export interface EmailInvitation {
    readonly uid: string;
    readonly title: string;
    readonly start: string;
    readonly end: string;
    readonly timeZone: string;
    readonly organiser: string;
    readonly attendees: ReadonlyArray<string>;
    readonly method: "request" | "cancel";
    readonly location?: string;
    readonly description?: string;
    readonly sequence?: number;
  }

  export interface EmailSendRequest {
    readonly to: ReadonlyArray<string>;
    readonly subject: string;
    readonly text?: string;
    readonly html?: string;
    readonly from: string;
    readonly cc?: string | ReadonlyArray<string>;
    readonly bcc?: string | ReadonlyArray<string>;
    readonly replyTo?: string;
    /** At most 10 uploaded files, 6 MB combined including invitation. */
    readonly attachments?: ReadonlyArray<{ fileId: string; name: string }>;
    readonly invitation?: EmailInvitation;
  }
  export interface EmailSendResult {
    readonly ref?: string;
    readonly id?: string;
    readonly status?: string;
  }

  export interface EmailTemplateSendRequest {
    readonly ref: string;
    readonly from: { email: string; name?: string };
    readonly to: { email: string; name?: string };
    readonly cc?: ReadonlyArray<{ email: string; name?: string }>;
    readonly bcc?: ReadonlyArray<{ email: string; name?: string }>;
    readonly replyTo?: ReadonlyArray<{ email: string; name?: string }>;
    readonly variables?: Readonly<Record<string, string>>;
    readonly attachments?: ReadonlyArray<{ fileId: string; name: string }>;
    readonly autoSubmitted?: "auto-generated" | "auto-replied";
  }

  // Payment-reference contracts adopted from lab 2b0b30e8.
  export interface CapturedPayment { readonly ref?: string; readonly amount: { amount: number; currency: string }; }
  // Payment-link contracts adopted from the offline ddb9398f snapshot.
  export type PaymentTaxCategory = "digital_products" | "saas" | "e_book" | "edtech" | "live_tutoring";
  export interface PaymentLinkCreateRequest {
    readonly taxCategory?: PaymentTaxCategory;
    readonly amount: number; readonly currency: string; readonly description?: string; readonly reference?: string;
    readonly customer?: { readonly email?: string; readonly name?: string; readonly phone?: string };
    readonly allowPartial?: boolean; readonly notifyEmail?: boolean; readonly notifySms?: boolean; readonly reminders?: boolean;
  }
  export interface PaymentLinkResult {
    readonly paymentLinkId: string;
    readonly status: "created" | "partially_paid" | "paid" | "expired" | "canceled" | "unknown";
    readonly ref?: string; readonly paymentUrl?: string; readonly linkExpiresAt?: string; readonly expiresAt?: string;
    readonly amount?: { amount: number; currency: string }; readonly amountPaid?: { amount: number; currency: string };
  }
  export interface PaymentLinkGetResult extends PaymentLinkResult { readonly payments?: ReadonlyArray<CapturedPayment>; }
  export interface PaymentLinkGetRequest { readonly ref?: string; readonly paymentLinkId?: string; }
  export interface CheckoutCreateRequest {
    readonly taxCategory?: PaymentTaxCategory;
    readonly lineItems: ReadonlyArray<{ name: string; amount: number; currency: string; quantity?: number }>;
    readonly successUrl: string; readonly cancelUrl: string; readonly mode?: "payment";
    readonly customerEmail?: string;
  }
  export interface CheckoutCreateResult { readonly ref?: string; readonly checkoutUrl: string; readonly expiresAt?: string; }
  export interface CheckoutGetResult {
    readonly status: "active" | "unpaid" | "paid" | "cancelled" | "completed" | "expired" | "pending" | "refused" | "unknown";
    readonly payments: ReadonlyArray<{ ref?: string; status: "captured" | "authorised" | "pending" | "unknown"; amount?: { amount: number; currency: string } }>;
  }
  export interface CheckoutGetRequest { readonly ref?: string; readonly checkoutId?: string; readonly sessionResult?: string; }
  export interface RefundRequest { readonly ref?: string; readonly transactionId?: string; readonly amount?: { amount: number; currency: string }; readonly reason?: string; }
  export interface ReversePaymentRequest { readonly ref?: string; readonly paymentId?: string; }

  export interface SmsSendRequest {
    readonly to: string;
    readonly body: string;
    readonly from?: string;
  }
  export interface SmsSendResult {
    readonly ref?: string;
    readonly id?: string;
    readonly status?: string;
  }

  export interface AppsCatalogSearchRequest {
    readonly app?: string;
    readonly query?: string;
    readonly cursor?: string;
    readonly limit?: number;
  }
  export interface AppsCatalogSearchResult {
    readonly results?: ReadonlyArray<JsonObject>;
    readonly actions?: ReadonlyArray<JsonObject>;
    readonly nextCursor?: string | null;
  }

  export interface AppsConnectionStartRequest {
    readonly app: string;
    readonly endUserRef: string;
    readonly redirectUrl: string;
    readonly access?: "read" | "read-write";
  }
  export interface AppsConnectionsListRequest {
    readonly endUserRef: string;
  }
  export interface AppsActionExecuteRequest {
    readonly action: string;
    readonly endUserRef: string;
    readonly input: JsonObject;
  }

  export interface ShortLinkCreateRequest { readonly endUserRef: string; readonly app: string; readonly destinationUrl: string; readonly slug?: string; readonly domain?: string; }
  export interface ShortLinkResult { readonly shortUrl: string; readonly destinationUrl: string; readonly ref?: string; readonly slug?: string; readonly createdAt?: string; readonly clicks?: number; }
  export interface ShortLinkReadResult extends ShortLinkResult { readonly clicks: number; }
  export interface ShortLinkUpdateRequest extends RoomRequest { readonly destinationUrl: string; }
  export interface ShortLinkDeleteRequest extends RoomRequest { readonly confirm: true; }
  export interface ShortLinkClicksRequest extends RoomRequest { readonly startDate?: string; readonly endDate?: string; }
  export interface ShortLinkClicksResult { readonly totalClicks: number; readonly days: ReadonlyArray<{ date: string; clicks: number }>; }

  export interface RoomCreateRequest { readonly endUserRef: string; readonly app: string; readonly title: string; readonly start: string; readonly durationMinutes: number; readonly timezone?: string; readonly waitingRoom?: boolean; readonly recording?: "cloud" | "local" | "none"; }
  export interface RoomRequest { readonly endUserRef: string; readonly ref: string; }
  export interface RoomResult { readonly joinUrl: string; readonly hostUrl?: string; readonly dialIn?: string; readonly ref?: string; readonly status?: "scheduled" | "started" | "ended"; }
  export interface RecordingFile { readonly fileId: string; readonly url: string; readonly expiresAt: string; readonly contentType: string; readonly sizeBytes: number; }
  export interface RecordingResult { readonly status: "processing" | "ready" | "failed"; readonly ref?: string; readonly startedAt?: string; readonly durationSeconds?: number; readonly fileType?: string; readonly file?: RecordingFile; }
  export interface RecordingsRequest extends RoomRequest { readonly limit?: number; readonly cursor?: string; }

  export interface FreeBusyRequest {
    readonly calendars: ReadonlyArray<{ inbox: string; calendarName?: string }>;
    readonly after: string; readonly before: string; readonly timezone: string;
  }
  export interface FreeBusyResult { readonly results: ReadonlyArray<{ calendar: number; busy: ReadonlyArray<{ start: string; end: string }> }> }

  export interface CalendarAgendaRequest {
    /** UTC ISO start; default now. One primary calendar per person. */
    readonly inbox: string;
    readonly after?: string;
    /** UTC ISO end; at most 366 days after start. */
    readonly before?: string;
    readonly cursor?: string;
    readonly limit?: number;
  }
  export interface CalendarEventRow {
    readonly id?: string;
    readonly ref?: string;
    readonly title?: string;
    readonly start?: string;
    readonly end?: string;
    readonly startAt?: string;
    readonly endAt?: string;
    readonly status?: string;
    readonly responseStatus?: string;
    readonly location?: string;
    [key: string]: unknown;
  }
  export interface CalendarAgendaResult {
    readonly results?: ReadonlyArray<CalendarEventRow>;
    readonly events?: ReadonlyArray<CalendarEventRow>;
    readonly nextCursor?: string | null;
  }
  export interface CalendarEventCreateRequest {
    readonly inbox: string;
    readonly title: string;
    readonly start: string;
    readonly end: string;
    readonly description?: string;
    /** Free text only; a meeting link goes here (no meeting-link field exists). */
    readonly location?: string;
    readonly attendees?: ReadonlyArray<{ email: string; name?: string }>;
    readonly sendInvites?: boolean;
    readonly recurrence?: { rule: string };
    readonly timezone?: string;
    readonly allDay?: boolean;
  }
  export interface CalendarEventResult {
    readonly ref?: string;
    readonly id?: string;
    readonly version?: string | number;
  }
}
