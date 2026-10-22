import type { Params } from "app/_types";
import { ApiError } from "next/dist/server/api-utils";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { HttpError } from "@scheduling/lib/http-error";
import { getServerErrorFromUnknown } from "@scheduling/lib/server/getServerErrorFromUnknown";
import { performance } from "@scheduling/lib/server/perfObserver";

import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

type Handler<T extends NextResponse | Response = NextResponse> = (
  req: NextRequest,
  { params }: { params: Promise<Params> }
) => Promise<T>;

export const defaultResponderForAppDir = <T extends NextResponse | Response = NextResponse>(
  handler: Handler<T>,
  endpointRoute?: string
) => {
  return async (req: NextRequest, { params }: { params: Promise<Params> }) => {
    let ok = false;
    try {
      performance.mark("Start");
      const result = await handler(req, { params });

      ok = true;
      if (result) {
        return result;
      }

      return NextResponse.json({});
    } catch (error) {
      let serverError: HttpError;

      if (error instanceof TRPCError) {
        const statusCode = getHTTPStatusCodeFromError(error);
        serverError = new HttpError({ statusCode, message: error.message });
      } else if (error instanceof ApiError) {
        serverError = new HttpError({
          message: error.message,
          statusCode: error.statusCode,
          url: req.url,
          method: req.method,
        });
      } else {
        serverError = getServerErrorFromUnknown(error);
      }

      return NextResponse.json(
        {
          message: serverError.statusCode >= 500 ? "This request could not be completed." : serverError.message,
        },
        {
          status: serverError.statusCode,
        }
      );
    } finally {
      performance.mark("End");
      performance.measure(`[${ok ? "OK" : "ERROR"}][${req.method}] '${req.url}'`, "Start", "End");
    }
  };
};
