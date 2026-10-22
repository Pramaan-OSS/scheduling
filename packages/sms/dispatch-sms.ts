import { verifyPhone } from "../lib/integrations/verification";
import { createHash } from "node:crypto";
import { Cap, requirePramaan, unavailableMessage, type Pramaan } from "@scheduling/pramaan";

export async function dispatchSms(input: { to: string; body: string; identity: string; hostId?: number }, client?: Pramaan) {
  try {
    const sender = client || requirePramaan();
    const check = await sender.call(Cap.optOutCheck, { address: input.to, channel: "sms" }) as { blocked?: boolean };
    if (check.blocked === true) return { status: "blocked" as const };
    if (check.blocked !== false) throw new Error("Opt-out status could not be confirmed.");
    const phone = await verifyPhone(input.to, sender);
    if (phone.valid !== true) throw new Error("The phone number could not be verified.");
    const body = input.hostId ? await (await import("@scheduling/features/url-shortener/server")).shortenBookingText(input.hostId, input.body) : input.body;
    const idempotencyKey = `sms-${createHash("sha256").update(JSON.stringify(input)).digest("hex")}`;
    const result = await sender.smsSend({ to: input.to, body }, { idempotencyKey });
    if (result.status !== "queued" && result.status !== "sent") throw new Error("Unconfirmed text result.");
    return result;
  } catch (error) {
    throw new Error(error instanceof Error && error.message === "The phone number could not be verified." ? error.message : unavailableMessage(error));
  }
}
