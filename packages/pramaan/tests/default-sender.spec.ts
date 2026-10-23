import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { serverConfig } from "@scheduling/lib/serverConfig";
import sendVerificationRequest from "../../features/auth/lib/sendVerificationRequest";

const originalKey = process.env.PRAMAAN_API_KEY;
const cwd = process.cwd();

test("a sign-in link sent without a configured sender uses the product's own address", async () => {
  const originalFake = process.env.PRAMAAN_FAKE;
  const originalFrom = process.env.EMAIL_FROM;
  // This test supplies its own fake transport to inspect the email request.
  delete process.env.PRAMAAN_FAKE;
  process.env.EMAIL_FROM = "";
  process.env.PRAMAAN_API_KEY = "fixture-key";
  expect(serverConfig.from).toBe("noreply@updates.pramaan.one");
  const requests: { url: string; init: RequestInit }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify({ status: "queued", ref: "fixture-ref" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    // The sign-in email template is read from the shared emails package relative to the web app.
    process.chdir(resolve(import.meta.dir, "../../../apps/web"));
    await sendVerificationRequest({
      identifier: "guest@example.test",
      url: "https://booking.example.test/api/auth/callback/email?callbackUrl=%2F",
    });
  } finally {
    process.chdir(cwd);
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.PRAMAAN_API_KEY;
    else process.env.PRAMAAN_API_KEY = originalKey;
    if (originalFake === undefined) delete process.env.PRAMAAN_FAKE;
    else process.env.PRAMAAN_FAKE = originalFake;
    if (originalFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = originalFrom;
  }
  expect(requests).toHaveLength(1);
  expect(requests[0]!.url).toContain("/v1/capabilities/email.send");
  const headers = new Headers(requests[0]!.init.headers as Record<string, string>);
  expect(headers.get("idempotency-key")).toBeTruthy();
  const body = JSON.parse(String(requests[0]!.init.body)) as { from: string };
  expect(body.from).toBe("Scheduling <noreply@updates.pramaan.one>");
});

test("the operator's sender override replaces the default address", () => {
  process.env.EMAIL_FROM = "host@example.test";
  expect(serverConfig.from).toBe("host@example.test");
  process.env.EMAIL_FROM = "   ";
  expect(serverConfig.from).toBe("noreply@updates.pramaan.one");
  delete process.env.EMAIL_FROM;
  expect(serverConfig.from).toBe("noreply@updates.pramaan.one");
});
