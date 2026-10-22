import { expect, test } from "bun:test";
import { completeManagedSession } from "../../features/auth/lib/complete-managed-session";

test("social return establishes its cookie before token verification and removes only the verifier", async () => {
  const calls: string[] = [];
  await completeManagedSession("https://signin.example.test/auth", "http://localhost:3197/auth/managed-callback?neon_auth_session_verifier=once&keep=yes#return", url => calls.push(url), (async (url, init) => {
    expect(String(url)).toBe("https://signin.example.test/auth/get-session?neon_auth_session_verifier=once");
    expect(init?.credentials).toBe("include");
    calls.push("session");
    return Response.json({ session: { id: "fixture" } });
  }) as typeof fetch);
  expect(calls).toEqual(["session", "/auth/managed-callback?keep=yes#return"]);
});

test("email returns need no verifier exchange", async () => {
  await completeManagedSession("https://signin.example.test/auth", "http://localhost:3197/auth/managed-callback", () => { throw new Error("unexpected replace"); }, (async () => { throw new Error("unexpected request"); }) as typeof fetch);
});

test("a refused or missing session keeps the verifier and prevents token exchange", async () => {
  for (const response of [new Response("", { status: 401 }), Response.json(null), Response.json({ session: null })]) {
    await expect(completeManagedSession("https://signin.example.test/auth", "http://localhost:3197/auth/managed-callback?neon_auth_session_verifier=once", () => { throw new Error("unexpected replace"); }, (async () => response) as typeof fetch)).rejects.toThrow("could not be verified");
  }
});
