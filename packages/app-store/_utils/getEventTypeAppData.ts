import type { z } from "zod";

import type { eventTypeMetaDataSchemaWithTypedApps } from "@scheduling/app-store/zod-utils";
import type { BookerEventForAppData } from "@scheduling/features/bookings/types.server";

import type { CommonAppData } from "./commonAppDataType";

export type EventTypeApps = NonNullable<
  NonNullable<z.infer<typeof eventTypeMetaDataSchemaWithTypedApps>>["apps"]
>;
export type EventTypeAppsList = keyof EventTypeApps;

export const getEventTypeAppData = <T extends EventTypeAppsList>(
  eventType: BookerEventForAppData,
  appId: T,
  forcedGet?: boolean
): EventTypeApps[T] | null => {
  const metadata = eventType.metadata;
  const appMetadata = metadata?.apps && metadata.apps[appId];
  if (appMetadata) {
    const app = appMetadata as CommonAppData;
    const allowDataGet = forcedGet ? true : app.enabled;
    return allowDataGet
      ? {
          ...appMetadata,
          // We should favor eventType's price and currency over appMetadata's price and currency
          price: eventType.price || app.price || null,
          currency: eventType.currency || app.currency || null,
          // trackingId is legacy way to store value for TRACKING_ID. So, we need to support both.
          TRACKING_ID: app.TRACKING_ID || app.trackingId || null,
          TRACKING_EVENT: app.trackingEvent || "Lead",
        }
      : null;
  }
  // Backward compatibility for existing event types.
  // TODO: After the new AppStore EventType App flow is stable, write a migration to migrate metadata to new format which will let us remove this compatibility code
  // Migration isn't being done right now, to allow a revert if needed
  const legacyAppsData = {
    legacyPayment: {
      enabled: !!eventType.price,
      // Price default is 0 in DB. So, it would always be non nullish.
      price: eventType.price,
      // Currency default is "usd" in DB.So, it would also be available always
      currency: eventType.currency,
      paymentOption: "ON_BOOKING",
    },
    media: {
      enabled: !!eventType.metadata?.mediaThankYouPage,
      thankYouPage: eventType.metadata?.mediaThankYouPage || "",
    },
  } as const;

  return null;
};
