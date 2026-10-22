import { z } from "zod";
import { MISSING_KEY_MESSAGE, NOT_AVAILABLE } from "@scheduling/pramaan";

import type { TRPCError } from "@trpc/server";

type ErrorShape = {
  message: string;
  code: number;
  data: {
    code: string;
    httpStatus: number;
    path?: string;
    [key: string]: unknown;
  };
};

type ErrorFormatterOptions = {
  shape: ErrorShape;
  error: TRPCError;
  type: "query" | "mutation" | "subscription" | "unknown";
  path: string | undefined;
  input: unknown;
  ctx: unknown;
};

export function errorFormatter({ shape, error }: ErrorFormatterOptions): ErrorShape {
  const message = error.cause instanceof Error ? error.cause.message : error.message;
  if ([MISSING_KEY_MESSAGE, NOT_AVAILABLE].includes(message)) {
    return { message, code: shape.code, data: { code: "BAD_REQUEST", httpStatus: 422, path: shape.data.path } };
  }
  if (error.cause instanceof z.ZodError) {
    return {
      message: "Invalid input",
      code: 400,
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: shape.data.path,
        zodError: error.cause.flatten(),
      },
    };
  }
  const { stack: _stack, ...data } = shape.data;
  return { ...shape, message: data.httpStatus >= 500 ? "This request could not be completed. Check its status before trying again." : shape.message, data };
}
