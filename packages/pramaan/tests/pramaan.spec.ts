import { describe, expect, test } from "bun:test";
import { FakePramaan } from "../src/fake";
import {
  Cap,
  Pramaan,
  PramaanClient,
  MissingPramaanKey,
  MISSING_KEY_MESSAGE,
  prepareGenerationRequest,
  busyIntervals,
  isUnavailable,
  unavailableMessage,
  NOT_AVAILABLE,
} from "../src/index";
import { PramaanError } from "../src/sdk/errors";
import { assertBoundedJsonSchema, validateGenerationSchemas } from "../src/json-schema";
import { ALL_SCHEMAS, ALL_TOOLS } from "../src/schemas";
import { CATALOG } from "../src/catalog";

const MODERATION_OK = {
  type: "object",
  properties: { allowed: { type: "boolean" } },
  required: ["allowed"],
  additionalProperties: false,
};

describe("bounded schemas", () => {
  test("every real schema fits the bounded subset", () => {
    for (const schema of ALL_SCHEMAS) assertBoundedJsonSchema(schema, "test");
    for (const tool of ALL_TOOLS) assertBoundedJsonSchema(tool.parameters, `Tool ${tool.name}`);
    validateGenerationSchemas({ tools: ALL_TOOLS, jsonSchema: MODERATION_OK });
  });

  test("a schema outside the subset is refused locally", () => {
    expect(() =>
      assertBoundedJsonSchema({
        type: "object",
        properties: { a: { type: "string", format: "email" } },
      })
    ).toThrow();
    expect(() =>
      assertBoundedJsonSchema({
        type: "object",
        properties: { a: { type: "string", pattern: "^x" } },
      })
    ).toThrow();
    expect(() => assertBoundedJsonSchema("not a schema")).toThrow();
  });

  test("every catalog id is in Cap", () => {
    const capValues = new Set<string>(Object.values(Cap));
    for (const id of Object.keys(CATALOG)) expect(capValues.has(id)).toBe(true);
  });
});

describe("FakePramaan", () => {
  test("routes calls, records them, and validates generation schemas", async () => {
    const fake = new FakePramaan({
      [Cap.emailSend]: async () => ({ ref: "e1" }),
      [Cap.calendarAgendaGet]: async () => ({
        results: [
          { startAt: "2026-01-01T10:00:00Z", endAt: "2026-01-01T11:00:00Z", status: "confirmed" },
          { startAt: "2026-01-01T12:00:00Z", endAt: "2026-01-01T13:00:00Z", status: "cancelled" },
          { startAt: "2026-01-01T14:00:00Z", endAt: "2026-01-01T15:00:00Z", responseStatus: "declined" },
        ],
        nextCursor: null,
      }),
    });
    const sent = await fake.emailSend({ from: "sender@example.test", to: ["a@example.com"], subject: "Hi" }, { idempotencyKey: "fixture-email" });
    expect((sent as { ref: string }).ref).toBe("e1");
    expect(fake.callsTo(Cap.emailSend)).toHaveLength(1);
    await expect(fake.call(Cap.smsSend, { to: "+10000000000", text: "x" })).rejects.toThrow();
  });

  test("busy intervals drop cancelled and declined rows", async () => {
    const fake = new FakePramaan({
      [Cap.calendarAgendaGet]: async () => ({
        results: [
          { startAt: "2026-01-01T10:00:00Z", endAt: "2026-01-01T11:00:00Z", status: "confirmed" },
          { startAt: "2026-01-01T12:00:00Z", endAt: "2026-01-01T13:00:00Z", status: "cancelled" },
          { startAt: "2026-01-01T14:00:00Z", endAt: "2026-01-01T15:00:00Z", responseStatus: "declined" },
        ],
        nextCursor: null,
      }),
    });
    const busy = await busyIntervals(fake, {
      inbox: "fixture@example.test",
      startAt: "2026-01-01T00:00:00Z",
      endAt: "2026-01-02T00:00:00Z",
    });
    expect(busy).toEqual([{ start: "2026-01-01T10:00:00Z", end: "2026-01-01T11:00:00Z" }]);
  });
});

describe("unavailable surfaces", () => {
  test("render one plain sentence, never the raw error", () => {
    expect(unavailableMessage(new PramaanError("upstream_unavailable", "x"))).toBe(NOT_AVAILABLE);
    expect(isUnavailable(new PramaanError("not_found", "x"))).toBe(true);
    expect(unavailableMessage(new Error("raw vendor detail"))).toBe(
      "Could not confirm the result. Check its status before trying again."
    );
  });
});

describe("generation boundary", () => {
  const input = { messages: [{ role: "user", content: "Check this booking." }] };
  test("sends the cleaned schema and a bounded default", async () => {
    let sent: any;
    const client = new Pramaan(
      new PramaanClient({
        apiKey: "fake",
        fetch: async (_url, options) => {
          sent = JSON.parse(String(options?.body));
          return new Response(JSON.stringify({ text: "Ready" }), { status: 200 });
        },
      })
    );
    await client.call(Cap.llmComplete, {
      ...input,
      jsonSchema: {
        type: "object",
        $schema: "unused",
        properties: { email: { type: "string", format: "email" } },
      },
    });
    expect(sent.maxTokens).toBe(1024);
    expect(sent.jsonSchema).toEqual({ type: "object", properties: { email: { type: "string" } } });
    expect(sent.messages).toEqual(input.messages);
  });
  test("refuses unsupported keywords with their tool and path", () => {
    for (const keyword of ["pattern", "oneOf", "allOf"]) {
      expect(() =>
        prepareGenerationRequest({
          ...input,
          tools: [
            {
              name: "booking",
              parameters: {
                type: "object",
                properties: { title: { type: "string", [keyword]: keyword === "pattern" ? "x" : [] } },
              },
            },
          ],
        })
      ).toThrow("booking");
      expect(() =>
        prepareGenerationRequest({
          ...input,
          jsonSchema: { type: "object", properties: { title: { type: "string", [keyword]: [] } } },
        })
      ).toThrow("title");
    }
  });
  test("fake refuses prompt, small budgets and unclean schemas", async () => {
    const fake = new FakePramaan({ [Cap.llmComplete]: () => ({ text: "ok" }) });
    for (const request of [
      { prompt: "x", maxTokens: 64 },
      { ...input, maxTokens: 8 },
      { ...input, maxTokens: 64, jsonSchema: { type: "object", $schema: "unused" } },
    ])
      await expect(fake.call(Cap.llmComplete, request)).rejects.toThrow();
    expect(fake.calls).toHaveLength(0);
  });
  test("honours explicit waits twice and never retries unavailable starts", async () => {
    let attempts = 0;
    const waits: number[] = [];
    const client = new Pramaan(
      new PramaanClient({
        apiKey: "fake",
        fetch: async () => {
          attempts++;
          return new Response(
            JSON.stringify({ error: { code: "rate_limited", message: "Try later", retryable: true } }),
            { status: 429, headers: { "Retry-After": "1" } }
          );
        },
      }),
      async (ms) => {
        waits.push(ms);
      }
    );
    await expect(client.call(Cap.llmChat, input)).rejects.toThrow();
    expect(attempts).toBe(3);
    expect(waits).toEqual([1000, 1000]);
    attempts = 0;
    const unavailable = new Pramaan(
      new PramaanClient({
        apiKey: "fake",
        fetch: async () => {
          attempts++;
          return new Response(
            JSON.stringify({
              error: { code: "upstream_unavailable", message: "Unavailable", retryable: true },
            }),
            { status: 502 }
          );
        },
      })
    );
    await expect(unavailable.call(Cap.llmChat, input)).rejects.toThrow();
    expect(attempts).toBe(1);
  });
  test("missing configuration has one safe message and a client status", () => {
    const error = new MissingPramaanKey();
    expect(error.status).toBe(422);
    expect(unavailableMessage(error)).toBe(MISSING_KEY_MESSAGE);
  });
});
