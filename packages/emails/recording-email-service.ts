import type BaseEmail from "@scheduling/emails/templates/_base-email";
import type { CalendarEvent } from "@scheduling/types/Calendar";
import { formatCalEvent } from "@scheduling/lib/formatCalendarEvent";

import OrganizerMeetingLinkDownloadRecordingEmail from "./templates/organizer-daily-video-download-recording-email";
import AttendeeMeetingLinkDownloadRecordingEmail from "./templates/attendee-daily-video-download-recording-email";
import OrganizerMeetingLinkDownloadTranscriptEmail from "./templates/organizer-daily-video-download-transcript-email";
import AttendeeMeetingLinkDownloadTranscriptEmail from "./templates/attendee-daily-video-download-transcript-email";

const sendEmail = (prepare: () => BaseEmail) => {
  return new Promise((resolve, reject) => {
    try {
      const email = prepare();
      resolve(email.sendEmail());
    } catch (e) {
      reject(console.error(`${prepare.constructor.name}.sendEmail failed`, e));
    }
  });
};

export const sendMeetingLinkRecordingEmails = async (calEvent: CalendarEvent, downloadLink: string) => {
  const calendarEvent = formatCalEvent(calEvent);
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(
    sendEmail(() => new OrganizerMeetingLinkDownloadRecordingEmail(calendarEvent, downloadLink))
  );

  for (const attendee of calendarEvent.attendees) {
    emailsToSend.push(
      sendEmail(() => new AttendeeMeetingLinkDownloadRecordingEmail(calendarEvent, attendee, downloadLink))
    );
  }
  await Promise.all(emailsToSend);
};

export const sendMeetingLinkTranscriptEmails = async (calEvent: CalendarEvent, transcripts: string[]) => {
  const emailsToSend: Promise<unknown>[] = [];

  emailsToSend.push(sendEmail(() => new OrganizerMeetingLinkDownloadTranscriptEmail(calEvent, transcripts)));

  for (const attendee of calEvent.attendees) {
    emailsToSend.push(
      sendEmail(() => new AttendeeMeetingLinkDownloadTranscriptEmail(calEvent, attendee, transcripts))
    );
  }
  await Promise.all(emailsToSend);
};
