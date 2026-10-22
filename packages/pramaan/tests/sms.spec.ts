import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { dispatchSms } from "../../sms/dispatch-sms";
const input = { to: "+14155550100", body: "Booking confirmed", identity: "booking-fixture" };

test("checks opt-out before a send with stable identity and contract body", async () => {
  const fake = new FakePramaan({ [Cap.optOutCheck]: () => ({ blocked: false }), [Cap.peoplePhoneVerify]: () => ({ valid: true }), [Cap.smsSend]: () => ({ status: "queued" }) });
  await dispatchSms(input, fake);
  expect(fake.calls.map(call => call.id)).toEqual([Cap.optOutCheck, Cap.peoplePhoneVerify, Cap.smsSend]);
  expect(fake.calls[0]!.input).toEqual({ address: input.to, channel: "sms" });
  expect(fake.calls[2]!.input).toEqual({ to: input.to, body: input.body });
  await dispatchSms(input, fake);
  expect(fake.calls[5]!.opts?.idempotencyKey).toBe(fake.calls[2]!.opts?.idempotencyKey);
});
test("opt-out or an unconfirmed check prevents sending", async () => {
  const blocked = new FakePramaan({ [Cap.optOutCheck]: () => ({ blocked: true }) });
  expect(await dispatchSms(input, blocked)).toEqual({ status: "blocked" });
  expect(blocked.callsTo(Cap.smsSend)).toHaveLength(0);
  const unknown = new FakePramaan({ [Cap.optOutCheck]: () => ({}) });
  await expect(dispatchSms(input, unknown)).rejects.toThrow();
  expect(unknown.callsTo(Cap.smsSend)).toHaveLength(0);
});
test("unavailable text delivery has a plain message and is never resent", async () => {
  const fake = new FakePramaan({ [Cap.optOutCheck]: () => ({ blocked: false }), [Cap.peoplePhoneVerify]: () => ({ valid: true }), [Cap.smsSend]: () => { throw new PramaanError("upstream_unavailable", "hidden"); } });
  await expect(dispatchSms(input, fake)).rejects.toThrow("not available yet");
  expect(fake.callsTo(Cap.smsSend)).toHaveLength(1);
});


test("an unverified phone number prevents the text send", async () => {
  const fake = new FakePramaan({ [Cap.optOutCheck]: () => ({ blocked: false }), [Cap.peoplePhoneVerify]: () => ({ valid: false }) });
  await expect(dispatchSms(input, fake)).rejects.toThrow("phone number could not be verified");
  expect(fake.callsTo(Cap.smsSend)).toHaveLength(0);
});

test("an opted-out recipient does not create any short links", async () => {
  const fake = new FakePramaan({ [Cap.optOutCheck]: () => ({ blocked: true }) });
  expect(await dispatchSms({ ...input, hostId: 1, body: "Booking https://booking.example.test/host/visit" }, fake)).toEqual({ status: "blocked" });
  expect(fake.calls).toHaveLength(1);
});
