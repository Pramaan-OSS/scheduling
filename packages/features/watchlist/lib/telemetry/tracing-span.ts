import { startSpan } from "@scheduling/lib/observability";

import type { SpanFn } from "./types";

/**
 * Tracing implementation of telemetry spans
 * Wraps Tracing's startSpan for production use
 */
export const tracingSpan: SpanFn = async (options, callback) => {
  return startSpan({ name: options.name, op: options.op }, callback);
};
