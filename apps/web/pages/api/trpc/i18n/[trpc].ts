import { createNextApiHandler } from "@scheduling/trpc/server/createNextApiHandler";
import { i18nRouter } from "@scheduling/trpc/server/routers/viewer/i18n/_router";

export default createNextApiHandler(i18nRouter, true, "i18n");
