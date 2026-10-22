import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap } from "../src/index";
import { changeManagedRecord } from "../../lib/domainManager/managed-dns";
const input = { ref: "ref_fixture", name: "booking.example.test", value: "app.example.test" };
test("managed domains use exact record operations and stable identities", async () => {
  const fake = new FakePramaan({ [Cap.domainsDnsRecordsApply]: () => ({ results: [{ status: "unchanged" }], changed: 0 }) });
  expect(await changeManagedRecord("set", input, fake)).toBe(true);
  await changeManagedRecord("set", input, fake);
  expect(fake.calls[0]!.input).toEqual({ ref: input.ref, set: [{ type: "CNAME", name: input.name, value: input.value, ttl: 300 }] });
  expect(fake.calls[0]!.opts?.idempotencyKey).toBe(fake.calls[1]!.opts?.idempotencyKey);
});
test("refused DNS operations are not reported as configured or resent", async () => {
  const fake = new FakePramaan({ [Cap.domainsDnsRecordsApply]: () => ({ results: [{ status: "refused" }] }) });
  await expect(changeManagedRecord("delete", input, fake)).rejects.toThrow();
  expect(fake.calls).toHaveLength(1);
});
