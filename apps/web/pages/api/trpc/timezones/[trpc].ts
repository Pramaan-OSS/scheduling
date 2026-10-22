import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { timezonesRouter } from "@scheduling/trpc/server/routers/publicViewer/timezones/_router";

export default createNextApiHandler(timezonesRouter, true);
