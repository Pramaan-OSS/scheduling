import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { FakePramaan } from "../src/fake";
import { PramaanError } from "../src/index";
import { authForStart } from "../../../scripts/managed-auth";
import { verifyManagedSignIn } from "../../features/auth/lib/managed-signin";
const backend = { status: "ready", authUrl: "https://signin.example.test/api/auth", jwksUrl: "https://signin.example.test/api/auth/jwks" };
const settings = { ...backend, origin: "http://localhost:3000" };
const person = { userId: "person_1", email: "person@example.test", emailVerified: true, name: "Person" };
async function sandbox(fn: (root: string) => Promise<void>) { mkdirSync(".scratch/auth-tests", { recursive: true }); const root = mkdtempSync(".scratch/auth-tests/start-"); try { await fn(root); } finally { rmSync(root, { recursive: true, force: true }); } }
test("local managed sign-in provisions once and skips domain registration on every local port", () => sandbox(async root => {
  const client = new FakePramaan({ "auth.backend.provision": () => backend }); const lines: string[] = [];
  expect(await authForStart(root, client, "http://localhost:3000", line => lines.push(line))).toMatchObject(backend);
  expect(await authForStart(root, client, "http://localhost:3300", line => lines.push(line))).toMatchObject({ origin: "http://localhost:3300" });
  expect(client.calls.map(call => call.id)).toEqual(["auth.backend.provision"]);
  expect(statSync(`${root}/.runtime/managed-auth.json`).mode & 0o777).toBe(0o600);
  expect(lines.length).toBe(2);
}));
test("public origin registration uses only the app address and is reused", () => sandbox(async root => {
  const client = new FakePramaan({ "auth.backend.provision": () => backend, "auth.backend.domains.set": () => ({ allowedDomains: [{ domain: "https://booking.example.test" }] }) });
  await authForStart(root, client, "https://booking.example.test"); await authForStart(root, client, "https://booking.example.test");
  expect(client.calls.map(call => call.id)).toEqual(["auth.backend.provision", "auth.backend.domains.set"]);
  expect(client.calls[1].input).toEqual({ domains: ["https://booking.example.test"] });
}));
test("unavailable managed sign-in keeps local sign-in and never reveals upstream details", () => sandbox(async root => {
  const client = new FakePramaan({ "auth.backend.provision": () => { throw new PramaanError("upstream_unavailable", "private diagnostic", { status: 502 }); } }); const lines: string[] = [];
  expect(await authForStart(root, client, settings.origin, line => lines.push(line))).toBeUndefined();
  expect(lines).toEqual(["Managed sign-in is not available yet; local sign-in remains available."]);
  expect(await authForStart(root, null, settings.origin)).toBeUndefined();
}));
const signedToken = (claims: object = { sub: person.userId, email: person.email, emailVerified: true }) => `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
test("verified tokens bind signed email to the verified subject without a user lookup", async () => {
  const client = new FakePramaan({ "auth.token.verify": () => ({ valid: true, userId: person.userId, sessionId: "session_1", orgId: null, expiresAt: "2026-10-18T00:00:00Z" }) });
  expect(await verifyManagedSignIn(signedToken(), settings, client)).toMatchObject({ email: person.email, emailVerified: true });
  expect(client.calls.map(call => call.id)).toEqual(["auth.token.verify"]);
  expect(client.calls[0].input).toEqual({ token: signedToken(), audience: "https://signin.example.test", authorizedParties: [settings.origin] });
});
test("refused tokens never trust payload email", async () => {
  const client = new FakePramaan({ "auth.token.verify": () => ({ valid: false }) });
  await expect(verifyManagedSignIn(signedToken(), settings, client)).rejects.toThrow("could not be verified");
  expect(client.calls.length).toBe(1);
});
test("mismatched subjects, missing email and malformed signed payloads are refused", async () => {
  const client = new FakePramaan({ "auth.token.verify": () => ({ valid: true, userId: person.userId }) });
  for (const token of [signedToken({ sub: "other", email: person.email }), signedToken({ sub: person.userId }), "header.not-json.signature", "opaque-session-cookie"]) {
    await expect(verifyManagedSignIn(token, settings, client)).rejects.toThrow("could not be verified");
  }
});
test("ordinary email signup can remain unverified without claiming an existing identity", async () => {
  const client = new FakePramaan({ "auth.token.verify": () => ({ valid: true, userId: person.userId }) });
  expect((await verifyManagedSignIn(signedToken({ sub: person.userId, email: person.email }), settings, client)).emailVerified).toBe(false);
});
