import { SCHEDULING_VERSION } from "@scheduling/lib/constants";
import { trpc } from "@scheduling/trpc/react";

export function useViewerI18n(locale: string) {
  return trpc.viewer.i18n.get.useQuery(
    { locale, SchedulingVersion: SCHEDULING_VERSION },
    {
      /**
       * i18n should never be clubbed with other queries, so that it's caching can be managed independently.
       **/
      trpc: {
        context: { skipBatch: true },
      },
    }
  );
}
