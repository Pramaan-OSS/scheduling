import { createHmac } from "node:crypto";
import { compile } from "handlebars";

import type { TGetTranscriptAccessLink } from "@scheduling/types/media";
import { getHumanReadableLocationValue } from "@scheduling/app-store/locations";
import type { WebhookSubscriber, PaymentData } from "@scheduling/features/webhooks/lib/dto/types";
import { getUTCOffsetByTimezone } from "@scheduling/lib/dayjs";
import type { CalendarEvent, Person } from "@scheduling/types/Calendar";

// Minimal webhook shape for sending payloads (subset of WebhookSubscriber)
type WebhookForPayload = Pick<WebhookSubscriber, "subscriberUrl" | "appId" | "payloadTemplate" | "version">;

type ContentType = "application/json" | "application/x-www-form-urlencoded";

export type EventTypeInfo = {
  eventTitle?: string | null;
  eventDescription?: string | null;
  requiresConfirmation?: boolean | null;
  price?: number | null;
  currency?: string | null;
  length?: number | null;
};

export type UTCOffset = {
  utcOffset?: number | null;
};

export type WithUTCOffsetType<T> = T & {
  user?: Person & UTCOffset;
} & {
  organizer?: Person & UTCOffset;
} & {
  attendees?: (Person & UTCOffset)[];
};

export type BookingNoShowUpdatedPayload = {
  message: string;
  bookingUid: string;
  bookingId?: number;
  attendees: { email: string; noShow: boolean }[];
};

export type TranscriptionGeneratedPayload = {
  downloadLinks?: {
    transcription: TGetTranscriptAccessLink["transcription"];
    recording: string;
  };
};

export type OOOEntryPayloadType = {
  oooEntry: {
    id: number;
    start: string;
    end: string;
    createdAt: string;
    updatedAt: string;
    notes: string | null;
    reason: {
      emoji?: string;
      reason?: string;
    };
    reasonId: number;
    user: {
      id: number;
      name: string | null;
      username: string | null;
      timeZone: string;
      email: string;
    };
    toUser: {
      id: number;
      name?: string | null;
      username?: string | null;
      timeZone?: string;
      email?: string;
    } | null;
    uuid: string;
  };
};

export type EventPayloadType = Omit<CalendarEvent, "assignmentReason"> &
  TranscriptionGeneratedPayload &
  EventTypeInfo & {
    uid?: string | null;
    metadata?: { [key: string]: string | number | boolean | null };
    bookingId?: number;
    status?: string;
    smsReminderNumber?: string;
    rescheduleId?: number;
    rescheduleUid?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
    downloadLink?: string;
    paymentId?: number;
    rescheduledBy?: string;
    cancelledBy?: string;
    paymentData?: PaymentData;
    requestReschedule?: boolean;
    assignmentReason?:
      | string
      | { reasonEnum: string; reasonString: string }[]
      | { category: string; details?: string | null }
      | null;
  };

export type WebhookPayloadType =
  | EventPayloadType
  | OOOEntryPayloadType
  | BookingNoShowUpdatedPayload;

type WebhookDataType = WebhookPayloadType & { triggerEvent: string; createdAt: string };

function addUTCOffset(data: WebhookPayloadType): WithUTCOffsetType<WebhookPayloadType> {
  if (isEventPayload(data)) {
    if (data.organizer?.timeZone) {
      (data.organizer as Person & UTCOffset).utcOffset = getUTCOffsetByTimezone(
        data.organizer.timeZone,
        data.startTime
      );
    }

    if (data.attendees?.length) {
      (data.attendees as (Person & UTCOffset)[]).forEach((attendee) => {
        attendee.utcOffset = getUTCOffsetByTimezone(attendee.timeZone, data.startTime);
      });
    }
  }

  return data as WithUTCOffsetType<WebhookPayloadType>;
}


function applyTemplate(template: string, data: WebhookDataType | Record<string, unknown>, contentType: ContentType) {
  const compiled = compile(template)(data).replace(/&quot;/g, '"');
  return contentType === "application/json" ? JSON.stringify(jsonParse(compiled)) : compiled;
}

export function jsonParse(jsonString: string) {
  try {
    return JSON.parse(jsonString);
  } catch {
    // don't do anything.
  }
  return false;
}

export function isOOOEntryPayload(data: WebhookPayloadType): data is OOOEntryPayloadType {
  return "oooEntry" in data;
}

export function isNoShowPayload(data: WebhookPayloadType): data is BookingNoShowUpdatedPayload {
  return "message" in data && "bookingUid" in data;
}

export function isEventPayload(data: WebhookPayloadType): data is EventPayloadType {
  return !isNoShowPayload(data) && !isOOOEntryPayload(data);
}

const sendPayload = async (
  secretKey: string | null,
  triggerEvent: string,
  createdAt: string,
  webhook: WebhookForPayload,
  data: WebhookPayloadType
) => {
  const { appId, payloadTemplate: template } = webhook;

  const contentType =
    !template || jsonParse(template) ? "application/json" : "application/x-www-form-urlencoded";

  data = addUTCOffset(data);

  let body;
  // Native webhooks use the reviewed payload template.
  if (isEventPayload(data)) {
    data.description = data.description || data.additionalNotes;

  }

  if (body === undefined) {
    if (
      template &&
      (isOOOEntryPayload(data) || isEventPayload(data) || isNoShowPayload(data))
    ) {
      body = applyTemplate(template, { ...data, triggerEvent, createdAt }, contentType);
    } else {
      body = JSON.stringify({
        triggerEvent: triggerEvent,
        createdAt: createdAt,
        payload: data,
      });
    }
  }

  return _sendPayload(secretKey, webhook, body, contentType);
};

export const sendGenericWebhookPayload = async ({
  secretKey,
  triggerEvent,
  createdAt,
  webhook,
  data,
  rootData,
}: {
  secretKey: string | null;
  triggerEvent: string;
  createdAt: string;
  webhook: WebhookForPayload;
  data: Record<string, unknown>;
  rootData?: Record<string, unknown>;
}) => {
  const { payloadTemplate: template } = webhook;

  const contentType =
    !template || jsonParse(template) ? "application/json" : "application/x-www-form-urlencoded";

  const defaultPayload = {
    // Added rootData props first so that using the known(i.e. triggerEvent, createdAt, payload) properties in rootData doesn't override the known properties
    ...rootData,
    triggerEvent: triggerEvent,
    createdAt: createdAt,
    payload: data,
  };

  let body: string;
  if (template) {
    body = applyTemplate(template, defaultPayload, contentType);
  } else {
    body = JSON.stringify(defaultPayload);
  }

  return _sendPayload(secretKey, webhook, body, contentType);
};

export const createWebhookSignature = (params: { secret?: string | null; body: string }) =>
  params.secret
    ? createHmac("sha256", params.secret).update(`${params.body}`).digest("hex")
    : "no-secret-provided";

const _sendPayload = async (
  secretKey: string | null,
  webhook: WebhookForPayload,
  body: string,
  contentType: "application/json" | "application/x-www-form-urlencoded"
) => {
  const { subscriberUrl, version } = webhook;
  if (!subscriberUrl || !body) {
    throw new Error("Missing required elements to send webhook payload.");
  }

  const response = await fetch(subscriberUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Cal-Signature-256": createWebhookSignature({ secret: secretKey, body }),
      "X-Cal-Webhook-Version": version,
    },
    redirect: "manual",
    body,
  });

  return {
    ok: response.ok,
    status: response.status,
  };
};

export default sendPayload;
