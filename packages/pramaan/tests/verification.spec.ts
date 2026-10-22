import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { verifyChallenge, verifyPhone } from "../../lib/integrations/verification";
test("challenge verification uses the platform and requires a confirmed pass", async () => {
  const fake = new FakePramaan({ [Cap.authBotCheckVerify]: () => ({ passed: true }) });
  expect(await verifyChallenge({ token: "fixture-proof" }, fake)).toEqual({ success: true, checked: true });
  fake.route({ [Cap.authBotCheckVerify]: () => ({ passed: false }) });
  await expect(verifyChallenge({ token: "fixture-proof" }, fake)).rejects.toThrow();
});
test("phone verification and unavailable challenges expose neutral results", async () => {
  const fake = new FakePramaan({ [Cap.peoplePhoneVerify]: () => ({ valid: true, e164: "+14155550100" }), [Cap.authBotCheckVerify]: () => { throw new PramaanError("upstream_unavailable", "hidden"); } });
  expect(await verifyPhone("+14155550100", fake)).toHaveProperty("valid", true);
  await expect(verifyChallenge({ token: "fixture-proof" }, fake)).rejects.toThrow("not available yet");
});
