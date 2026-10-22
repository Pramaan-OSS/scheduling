import type { TFunction } from "i18next";

import { guessEventLocationType } from "@scheduling/app-store/locations";
import { getVideoCallUrlFromCalEvent } from "@scheduling/lib/CalEventParser";
import type { CalendarEvent } from "@scheduling/types/Calendar";

import { Info } from "./Info";

export function LocationInfo(props: { calEvent: CalendarEvent; t: TFunction }) {
  const { t } = props;

  const providerName = guessEventLocationType(props.calEvent.location)?.label;

  const location = props.calEvent.location;
  let meetingUrl = location?.search(/^https?:/) !== -1 ? location : undefined;

  if (props.calEvent) {
    meetingUrl = getVideoCallUrlFromCalEvent(props.calEvent) || meetingUrl;
  }

  const isPhone = location?.startsWith("+");

  // Because of location being a value here, we can determine the app that generated the location only for Dynamic Link based apps where the value is integrations:*

  if (meetingUrl) {
    return (
      <Info
        label={t("where")}
        withSpacer
        description={
          <a
            href={meetingUrl}
            target="_blank"
            title={t("meeting_url")}
            style={{ color: "#101010" }}
            rel="noreferrer">
            {providerName || "Link"}
          </a>
        }
        extraInfo={
          meetingUrl && (
            <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
              <>
                {t("meeting_url")}:{" "}
                <a href={meetingUrl} title={t("meeting_url")} style={{ color: "#3E3E3E" }}>
                  {meetingUrl}
                </a>
              </>
            </div>
          )
        }
      />
    );
  }

  if (isPhone) {
    return (
      <Info
        label={t("where")}
        withSpacer
        description={
          <a href={`tel:${location}`} title="Phone" style={{ color: "#3E3E3E" }}>
            {location}
          </a>
        }
      />
    );
  }

  return (
    <Info
      label={t("where")}
      withSpacer
      description={providerName || location}
      extraInfo={
        location?.startsWith("integrations:") && props.calEvent.requiresConfirmation ? (
          <p style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
            <>{t("meeting_url_provided_after_confirmed")}</>
          </p>
        ) : null
      }
    />
  );
}
