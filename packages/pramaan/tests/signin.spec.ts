import { expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import { Cap, PramaanError } from "../src/index";
import { exchangeConnectedSignIn, startConnectedSignIn } from "../../features/auth/lib/connected-signin";
const configuration = { connectionRef: "ref_fixture", redirectUri: "https://booking.example.test/api/auth/callback/connected" };
const state = "fixture-state-value-for-signin";
const checks = { state, nonce: "fixture-nonce-value-for-signin", code_verifier: "v".repeat(43) };
const params = new URLSearchParams({ state, nonce: checks.nonce, code_challenge: "c".repeat(43) });
const result = { providerKey: "enterprise", subjectId: "subject", emailVerified: true, email: "guest@example.test" };

test("enterprise start and exchange preserve state, nonce, verifier and connection identity", async () => {
  const fake = new FakePramaan({ [Cap.authEnterpriseStart]: () => ({ authorizationUrl: "https://signin.example.test/once" }), [Cap.authSocialExchange]: () => result });
  expect(await startConnectedSignIn(configuration, params, fake)).toBe("https://signin.example.test/once");
  expect(fake.calls[0]!.input).toEqual({ connectionRef: configuration.connectionRef, redirectUri: configuration.redirectUri, state, nonce: checks.nonce, codeChallenge: "c".repeat(43) });
  expect((await exchangeConnectedSignIn(configuration, { code: "once", state }, checks, fake)).identity).toBe(JSON.stringify([configuration.connectionRef, result.subjectId]));
  expect(fake.calls[1]!.input).toMatchObject({ expectedNonce: checks.nonce, pkceVerifier: checks.code_verifier, state });
});
test("mismatched state never redeems a code", async () => {
  const fake = new FakePramaan();
  await expect(exchangeConnectedSignIn(configuration, { code: "once", state: "wrong" }, checks, fake)).rejects.toThrow("Start again");
  expect(fake.calls).toHaveLength(0);
});
test("social exchange does not send enterprise-only fields", async () => {
  const fake = new FakePramaan({ [Cap.authSocialExchange]: () => ({ ...result, providerKey: "social" }) });
  await exchangeConnectedSignIn({ redirectUri: configuration.redirectUri, providerKey: "social" }, { code: "once", state }, checks, fake);
  expect(fake.calls[0]!.input).not.toHaveProperty("state");
  expect(fake.calls[0]!.input).not.toHaveProperty("connectionRef");
});
test("unverified and unavailable sign-in fail without a second exchange", async () => {
  for (const route of [() => ({ ...result, emailVerified: false }), () => { throw new PramaanError("upstream_unavailable", "hidden"); }]) {
    const fake = new FakePramaan({ [Cap.authSocialExchange]: route });
    await expect(exchangeConnectedSignIn(configuration, { code: "once", state }, checks, fake)).rejects.toThrow();
    expect(fake.calls).toHaveLength(1);
  }
});

test("connection administration routes to the documented operations with stable identities", async () => {
  const { enterpriseConnections } = await import("../../features/auth/lib/enterprise-connections");
  const fake = new FakePramaan({ [Cap.authEnterpriseConnectionsList]: () => ({ results: [] }), [Cap.authEnterpriseConnectionCreate]: () => ({ status: "ready" }), [Cap.authEnterpriseConnectionDelete]: () => ({ deleted: true }) });
  await enterpriseConnections("list", { organizationRef: "fixture" }, fake);
  await enterpriseConnections("create", { organizationRef: "fixture" }, fake);
  await enterpriseConnections("create", { organizationRef: "fixture" }, fake);
  await enterpriseConnections("delete", { ref: "ref_fixture" }, fake);
  expect(fake.calls[1]!.opts?.idempotencyKey).toBe(fake.calls[2]!.opts?.idempotencyKey);
  expect(fake.calls.map(call => call.id)).toEqual([Cap.authEnterpriseConnectionsList, Cap.authEnterpriseConnectionCreate, Cap.authEnterpriseConnectionCreate, Cap.authEnterpriseConnectionDelete]);
});
