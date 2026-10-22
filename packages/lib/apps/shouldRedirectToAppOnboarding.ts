import type { AppMeta } from "@scheduling/types/App";

export const shouldRedirectToAppOnboarding = (appMetadata: AppMeta) => {
  const hasEventTypes = appMetadata?.extendsFeature === "EventType";
  return hasEventTypes;
};
