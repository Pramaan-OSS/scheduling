import { createHash } from "node:crypto";
import { Cap, PramaanError, requirePramaan, unavailableMessage, type Pramaan, type Caps } from "@scheduling/pramaan";

type Capability = (typeof Cap)[keyof typeof Cap];
async function callPayment(id: Capability, input: unknown, account: string, identity?: string, client?: Pramaan) {
  if (!/^conn_[a-zA-Z0-9]+$/.test(account)) throw new Error("Connect a payment account first.");
  return (client || requirePramaan()).call(id, input, {
    account,
    ...(identity ? { idempotencyKey: `payment-${createHash("sha256").update(identity).digest("hex")}` } : {}),
  });
}
export async function paymentCall(id: Capability, input: unknown, account: string, identity?: string, client?: Pramaan) {
  try { return await callPayment(id, input, account, identity, client); }
  catch (error) { throw new Error(unavailableMessage(error)); }
}

type BookingPaymentInput = { bookingId: number; amount: number; currency: string; title: string; email: string; successUrl: string; cancelUrl: string };
export type BookingPaymentRequest = { ref: string; paymentUrl: string; kind: "payment-link" | "checkout" };
const UNCONFIRMED = "Payment request could not be confirmed. Check before trying again.";
export function bookingTaxCategory(): Caps.PaymentTaxCategory {
  const category = process.env.PRAMAAN_TAX_CATEGORY?.trim() || "digital_products";
  if (!["digital_products", "saas", "e_book", "edtech", "live_tutoring"].includes(category))
    throw new Error("Set PRAMAAN_TAX_CATEGORY to a supported payment tax category.");
  return category as Caps.PaymentTaxCategory;
}

export async function createBookingPayment(input: BookingPaymentInput, account: string, client?: Pramaan): Promise<BookingPaymentRequest> {
  if (!Number.isInteger(input.amount) || input.amount <= 0 || input.amount > 99999999) throw new Error("Set a positive booking price within the supported range.");
  if (!/^[a-zA-Z]{3}$/.test(input.currency)) throw new Error("Set a three-letter charge currency.");
  const request: Caps.PaymentLinkCreateRequest = {
    taxCategory: bookingTaxCategory(),
    amount: input.amount, currency: input.currency.toUpperCase(), description: input.title.slice(0, 2048) || "Booking",
    reference: `booking-${createHash("sha256").update(input.successUrl).digest("hex")}`,
    customer: { email: input.email }, allowPartial: false, notifyEmail: false, notifySms: false, reminders: false,
  };
  let result: Caps.PaymentLinkResult;
  try {
    result = await callPayment(Cap.paymentsPaymentLinkCreate, request, account, JSON.stringify({ bookingId: input.bookingId, request }), client) as Caps.PaymentLinkResult;
  } catch (error) {
    // A transport failure has no server request identity and may already have acted.
    // A received refusal permits the checkout fallback; never replace an accepted job.
    if (error instanceof PramaanError && error.status !== undefined && error.requestId && !error.jobId &&
      ["upstream_unavailable", "connection_required"].includes(error.code)) return createCheckout(input, account, client);
    throw new Error(unavailableMessage(error));
  }
  if (!isPaymentRef(result?.ref) || !checkoutUrl(result.paymentUrl) || !result.paymentLinkId ||
    !["created", "partially_paid", "paid"].includes(result.status)) throw new Error(UNCONFIRMED);
  return { ref: result.ref, paymentUrl: result.paymentUrl!, kind: "payment-link" };
}

async function createCheckout(input: BookingPaymentInput, account: string, client?: Pramaan): Promise<BookingPaymentRequest> {
  const request: Caps.CheckoutCreateRequest = {
    taxCategory: bookingTaxCategory(),
    lineItems: [{ name: input.title.slice(0, 250), amount: input.amount, currency: input.currency.toLowerCase(), quantity: 1 }],
    mode: "payment", customerEmail: input.email, successUrl: input.successUrl, cancelUrl: input.cancelUrl,
  };
  const result = await paymentCall(Cap.paymentsCheckoutCreate, request, account, JSON.stringify({ bookingId: input.bookingId, request }), client) as Caps.CheckoutCreateResult;
  if (!isPaymentRef(result?.ref) || !checkoutUrl(result.checkoutUrl)) throw new Error(UNCONFIRMED);
  return { ref: result.ref, paymentUrl: result.checkoutUrl, kind: "checkout" };
}

export function checkoutUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? value : undefined; } catch { return undefined; }
}

type Capture = { ref?: string; status?: "captured"; amount: { amount: number; currency: string } };
function matchesCapture(value: unknown, currency: string, link: boolean): value is Capture {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<Capture>;
  return (link ? row.status === undefined : row.status === "captured") &&
    (row.ref === undefined || typeof row.ref === "string") && Number.isSafeInteger(row.amount?.amount) && row.amount!.amount > 0 &&
    typeof row.amount?.currency === "string" && row.amount.currency.toUpperCase() === currency.toUpperCase();
}
export async function checkBookingPayment(
  input: { externalId: string; amount: number; currency: string; checkoutRef?: string; paymentLinkRef?: string; paymentUrl?: string },
  account: string,
  client?: Pramaan
) {
  const unknown = { paid: false, status: "unknown", paymentRef: undefined, capturedPayments: [], paymentUrl: undefined };
  // Stored selectors choose the read path; never guess from a legacy ID or replace a failed read with a new request.
  if ((input.paymentLinkRef !== undefined) === (input.checkoutRef !== undefined)) return unknown;
  const link = input.paymentLinkRef !== undefined;
  const ref = link ? input.paymentLinkRef : input.checkoutRef;
  if (!isPaymentRef(ref)) return unknown;
  const result = await paymentCall(link ? Cap.paymentsPaymentLinkGet : Cap.paymentsCheckoutGet, { ref }, account, undefined, client) as Caps.PaymentLinkGetResult | Caps.CheckoutGetResult;
  if (!result || typeof result !== "object") return unknown;
  const rows: unknown[] = Array.isArray(result.payments) ? result.payments : [];
  const captures = rows.filter((row): row is Capture => matchesCapture(row, input.currency, link));
  const complete = captures.length > 0 && captures.length <= 50 && captures.length === rows.length &&
    captures.reduce((sum, row) => sum + row.amount.amount, 0) === input.amount;
  const totals = result as Caps.PaymentLinkGetResult;
  const matchesTotal = (value: { amount: number; currency: string } | undefined) => value === undefined ||
    value !== null && value.amount === input.amount && typeof value.currency === "string" && value.currency.toUpperCase() === input.currency.toUpperCase();
  const paid = result.status === "paid" && complete && (!link || matchesTotal(totals.amount) && matchesTotal(totals.amountPaid));
  const capturedPayments = paid ? captures.map(row => ({ ...row, status: "captured" as const })) : [];
  const captured = capturedPayments.length === 1 ? capturedPayments[0] : undefined;
  const paymentRef = captured && isPaymentRef(captured.ref) ? captured.ref : undefined;
  const paymentUrl = link
    ? ["created", "partially_paid"].includes(result.status) ? checkoutUrl(totals.paymentUrl) : undefined
    : checkoutUrl(input.paymentUrl);
  return { paymentRef, capturedPayments, paid, status: paid ? "paid" : result.status === "paid" || result.status === "completed" ? "unknown" : result.status, paymentUrl };
}

export function isPaymentRef(value: unknown): value is string {
  return typeof value === "string" && /^(ref_[0-9A-HJKMNP-TV-Z]{26}|rh_[A-Za-z0-9_-]{24,1024})$/.test(value);
}
