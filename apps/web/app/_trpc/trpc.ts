"use client";

import type { AppRouter } from "@scheduling/trpc/server/routers/_app";

import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>({});
