// The capabilities this product uses, with the traits the client needs offline: which are
// read_only (safe to retry) and which run as async jobs. Ids are real; see the capabilities
// catalogue. Effect classes per capability family:
//
//   read_only               email.status, sms.status, messaging.opt-out.*, people.*, phone.number.parse,
//                           auth.social.exchange, auth.enterprise.*, auth.bot-check.verify, storage.object.get,
//                           storage.object.download-url, calendar.* reads, time.*, weather.*, domains.* reads,
//                           payments.account.status, billing reads, llm.*, apps.catalog.search, apps.connections.list,
//                           companies.*, web.*
//   external_reversible     email.message.schedule.cancel, schedule.*, auth.enterprise-connection.*,
//                           storage.object.upload-url, storage.upload.create, domains.dns-records.apply,
//                           payments.order.create, payments.account.connect, billing.customer.create, billing.portal.create,
//                           apps.connection.start, voice.assistant.*, voice.tool.create, voice.number.import
//   external_irreversible   email.send, email.template.send, email.message.schedule.create, sms.send,
//                           sms.send-bulk, calendar.event.create/update/delete, payments.*, billing writes,
//                           apps.action.execute, apps.connection.revoke, notify.message.send,
//                           storage.object.put, voice.call.start-agent, phone.number.purchase

import type { CapabilityInfo } from "./sdk/types";

type Entry = {
	description: string;
	effectClass: CapabilityInfo["effectClass"];
	mode: CapabilityInfo["mode"];
	needsConnection: boolean;
};

const R = (description: string): Entry => ({
	description,
	effectClass: "read_only",
	mode: "sync",
	needsConnection: false,
});
const RC = (description: string): Entry => ({
	description,
	effectClass: "read_only",
	mode: "sync",
	needsConnection: true,
});
const REV = (description: string): Entry => ({
	description,
	effectClass: "external_reversible",
	mode: "sync",
	needsConnection: false,
});
const IRR = (description: string): Entry => ({
	description,
	effectClass: "external_irreversible",
	mode: "sync",
	needsConnection: false,
});
const IRRA = (description: string): Entry => ({
	description,
	effectClass: "external_irreversible",
	mode: "async",
	needsConnection: false,
});
const RA = (description: string): Entry => ({
	description,
	effectClass: "read_only",
	mode: "async",
	needsConnection: false,
});

const TABLE: Record<string, Entry> = {
  "db.postgres.provision": REV("Provision the application's managed database."),
  "auth.backend.provision": REV("Provision managed sign-in for this application."),
  "auth.backend.domains.set": REV("Set this application's allowed sign-in origins."),
  "auth.token.verify": R("Check a managed sign-in token."),
	"email.send": IRR("Send one email to up to 50 recipients."),
	"email.template.send": IRR("Send a stored email template to recipients."),
	"email.message.schedule.create": IRR("Schedule an email from an owned mailbox for a future UTC time."),
	"email.message.schedule.get": R("Poll the status of a scheduled email send."),
	"email.message.schedule.cancel": REV("Request cancellation of a scheduled email send."),
	"schedule.create": REV("Run a capability or an outcome on a recurring schedule."),
	"schedule.get": R("Read one schedule: what it runs, when next, what its runs cost."),
	"schedule.runs.list": R("List a schedule's recent runs with status and price."),
	"email.attachment.from-url": R("Fetch a public file as an email attachment object (max 6 MB)."),
	"email.attachment.get": R("Read one attachment of a message as base64 (max 6 MB)."),
	"email.status": R("Delivery status of a sent email."),
	"sms.send": IRR("Send a text message to an E.164 number."),
	"sms.send-bulk": IRRA("Send texts to up to 100 numbers as a background job."),
	"sms.status": R("Delivery status of a sent text message."),
	"messaging.opt-out.check": R("Whether a send to this address on this channel is blocked."),
	"messaging.opt-outs.list": R("List this project's opt-out entries."),
	"messaging.opt-out.add": {
		description: "Add a person to this project's opt-out list.",
		effectClass: "external_reversible",
		mode: "sync",
		needsConnection: false,
	},
	"people.phone.verify": R("Check a phone number is valid and say what kind of line it is."),
	"phone.number.parse": R("Parse a phone number into E.164 with country and line type."),
	"people.profile.get": R("Get a discovered person by their row handle."),
	"auth.social.exchange": RC("Redeem a single-use sign-in code for identity, email, name or picture."),
	"auth.enterprise.start": R("Start sign-in through one customer's identity provider."),
	"auth.enterprise-connection.create": REV("Save one customer's identity provider for enterprise sign-in."),
	"auth.enterprise-connection.delete": REV("Delete an enterprise sign-in connection."),
	"auth.enterprise-connections.list": R("List saved enterprise sign-in connections."),
	"auth.bot-check.verify": R("Verify a single-use client challenge token."),
	"storage.object.put": IRRA("Store a file up to 25 MB in your own bucket."),
	"storage.object.get": RA("Download up to 25 MB from your storage."),
	"storage.object.upload-url": REV("Create a short-lived signed upload URL."),
	"storage.object.download-url": R("Create a short-lived signed download URL."),
	"storage.upload.create": REV("Start a multipart upload."),
	"calendar.calendars.list": RC("List owned calendars in a connected mailbox."),
	"calendar.events.list": RC("List calendar events, ordered by last change."),
	"links.short.create": REV("Create an owned short link."),
	"links.short.get": RC("Read an owned short link."),
	"links.short.update": REV("Change an owned short link destination."),
	"links.short.delete": IRR("Delete an owned short link."),
	"links.short.clicks.get": RC("Read aggregate short-link clicks."),
	"meetings.room.create": REV("Create a booking meeting room on an owned connection."),
	"meetings.room.get": R("Read a booking meeting room."),
	"meetings.room.delete": IRR("Delete a booking meeting room."),
	"meetings.recordings.list": R("Read recordings on owned file storage."),
	"meetings.recording.get": R("Read one recording on owned file storage."),
	"calendar.free-busy.get": R("Read complete busy intervals for up to twenty calendars."),
	"calendar.agenda.get": RC("Read one calendar's agenda, ordered by start time."),
	"calendar.event.create": {
		description: "Create an event on one of your inboxes' calendars.",
		effectClass: "external_irreversible",
		mode: "sync",
		needsConnection: true,
	},
	"calendar.event.update": {
		description: "Edit one calendar event; only fields sent change.",
		effectClass: "external_irreversible",
		mode: "sync",
		needsConnection: true,
	},
	"calendar.event.delete": {
		description: "Delete a calendar event or cancel dates of a series.",
		effectClass: "external_irreversible",
		mode: "sync",
		needsConnection: true,
	},
	"calendar.event.get": RC("Read one calendar event with attendees' answers."),
	"calendar.event.instances.list": RC("List dates of a recurring event."),
	"time.holidays.list": R("Public holidays of a country for a year."),
	"time.business-day.check": R("Whether a date is a business day in a country."),
	"time.timezone.lookup": R("The time zone of a place, country or coordinates."),
	"weather.forecast.get": R("Current weather and a seven-day forecast."),
	"weather.forecast.daily": R("Daily weather forecast for coordinates."),
	"domains.dns-records.list": R("List DNS records of an owned domain."),
	"domains.dns-records.apply": REV("Apply up to 20 DNS records without touching unmentioned records."),
	"domains.list": R("List owned domains."),
	"payments.order.create": REV("Create an order in your connected merchant account."),
	"payments.payment.capture": IRR("Capture an authorized payment; moves money."),
	"payments.payment.reverse": IRR("Request cancellation or a full refund of a payment."),
	"payments.payment.cancel": IRR("Release an uncaptured payment authorization."),
	"payments.checkout.create": IRR("Create a hosted checkout page that charges your customer."),
	"payments.account.connect": REV("Start or resume onboarding of your payment account."),
	"payments.account.status": R("Whether your payment account can take charges and payouts."),
	"payments.checkout.get": R("Read a checkout completion and captured payment references."),
	"payments.payment-link.get": R("Read a payment request."),
  "payments.payment-link.cancel": IRR("Cancel an unpaid request."),
  "billing.transactions.list": R("Read billing charges."),
  "payments.payment-link.create": IRR("Create a payment request link."),
	"billing.refund.create": IRR("Refund all or part of a completed charge."),
	"billing.subscription.create": IRR("Start a subscription in your billing account."),
	"billing.subscription.get": R("Get one subscription's status, price and billing dates."),
	"billing.subscription.cancel": IRR("Cancel a subscription."),
	"billing.plan.get": R("Read a billing plan."),
  "billing.customer.create": REV("Create a customer in your billing account."),
	"billing.portal.create": REV("Create a short-lived link to a customer's billing details."),
	"billing.credits.balance": R("Get a customer's prepaid credit balances."),
	"llm.chat": R("Generate one stateless conversation turn with text and/or tool calls."),
	"llm.complete": R("Generate a text reply to a chat of messages."),
	"apps.catalog.search": R("Find an app's actions on the connector, with action keys and input schemas."),
	"apps.connection.start": REV("Start connecting an end user to a third-party app; returns a hosted sign-in link."),
	"apps.connections.list": R("List one end user's third-party app connections and their status."),
	"apps.connection.revoke": IRR("Disconnect an end user from a third-party app and revoke its access."),
	"apps.action.execute": IRR("Run one action in a connected third-party app as one of your end users."),
	"notify.message.send": IRR("Send one message to one subscriber through one channel."),
	"companies.enrich": R("Company profile from a domain, name or LinkedIn URL."),
	"companies.logo.get": RA("Retrieve a company logo as a job."),
	"people.enrich": R("Professional profile from a work email, LinkedIn URL, or name plus domain."),
	"people.email.verify": R("Check an email address is real and accepts mail."),
	"people.email.validate": R("Check an email address's syntax and mail server."),
	"people.email.threat.check": R("Check security risk signals for an email mailbox."),
	"web.page.metadata": R("Read a page's metadata, social cards and structured data."),
	"web.read": R("Read one web page; returns its clean text and title."),
	"voice.assistant.create": REV("Create a speaking agent configuration."),
	"voice.assistant.update": REV("Update a speaking agent configuration."),
	"voice.call.start-agent": IRRA("Place one agent telephone call as a job, up to 600 seconds."),
	"voice.tool.create": REV("Create a call tool for a speaking agent."),
	"phone.number.purchase": IRR("Buy a phone number after explicit confirmation."),
	"voice.number.import": REV("Connect a telephone number you rent to agent calls."),
};

export const CATALOG: Record<string, CapabilityInfo> = Object.fromEntries(
	Object.entries(TABLE).map(([id, e]) => [
		id,
		{
			id,
			description: e.description,
			effectClass: e.effectClass,
			mode: e.mode,
			needsConnection: e.needsConnection,
		} satisfies CapabilityInfo,
	]),
);

const BY_ID = new Map<string, CapabilityInfo>(Object.entries(CATALOG));

/** Traits of one capability this product uses, or undefined for any other id. */
export function capabilityInfo(id: string): CapabilityInfo | undefined {
	return BY_ID.get(id);
}
