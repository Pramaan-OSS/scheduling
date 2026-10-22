import type { NextApiRequest, NextApiResponse } from "next";

import { type TraceContext } from "@scheduling/lib/tracing";
import { TracedError } from "@scheduling/lib/tracing/error";
import { distributedTracing } from "@scheduling/lib/tracing/factory";

import { HttpError } from "../http-error";
import { safeStringify } from "../safeStringify";
import { getServerErrorFromUnknown } from "./getServerErrorFromUnknown";
import { performance } from "./perfObserver";
import { getHTTPStatusCodeFromTRPCErrorLike, isTRPCErrorLike } from "./trpcErrorUtils";

export interface TracedRequest extends NextApiRequest {
  traceContext: TraceContext;
}

type Handle<T> = (req: TracedRequest, res: NextApiResponse) => Promise<T>;

/** Allows us to get type inference from API handler responses */
export function defaultResponder<T>(
  f: Handle<T>,
  /** If set we will wrap the handle with tracing tracing */
  endpointRoute?: string
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let ok = false;
    const operation = endpointRoute ? endpointRoute.replace(/^\//, "").replace(/\//g, "_") : "api_request";
    const traceContext = distributedTracing.createTrace(operation, {
      meta: {
        method: req.method || "",
        url: req.url || "",
      },
    });
    const tracingLogger = distributedTracing.getTracingLogger(traceContext);

    const tracedReq = req as TracedRequest;
    tracedReq.traceContext = traceContext;

    try {
      performance.mark("Start");

      const result = await f(tracedReq, res);

      ok = true;
      if (result && !res.writableEnded) {
        res.setHeader("X-Trace-Id", traceContext.traceId);
        return res.json(result);
      }
    } catch (err) {
      tracingLogger.error(`${operation} request failed`, safeStringify(err));
      const tracedError = TracedError.createFromError(err, traceContext);
      let error: HttpError;
      if (isTRPCErrorLike(err)) {
        const statusCode = getHTTPStatusCodeFromTRPCErrorLike(err);
        error = new HttpError({ statusCode, message: err.message });
      } else {
        error = getServerErrorFromUnknown(tracedError);
      }
      res.setHeader("X-Trace-Id", tracedError.traceId);
      return res
        .status(error.statusCode)
        .json({ message: error.statusCode >= 500 ? "This request could not be completed." : error.message });
    } finally {
      performance.mark("End");
      performance.measure(`[${ok ? "OK" : "ERROR"}][$1] ${req.method} '${req.url}'`, "Start", "End");
    }
  };
}
