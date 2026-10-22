// The real schemas this product sends to generation calls. One test runs
// every one of them through the bounded-subset validator, so a schema the
// service would refuse fails here first.

import type { ToolDef } from "./capabilities";

export const MODERATION_SCHEMA = {
	type: "object",
	properties: {
		allowed: { type: "boolean" },
		reason: { type: "string" },
	},
	required: ["allowed"],
	additionalProperties: false,
} as const;

export const ROUTING_SCHEMA = {
	type: "object",
	properties: {
		route: { type: "string" },
		score: { type: "number", minimum: 0, maximum: 1 },
		reason: { type: "string" },
	},
	required: ["route"],
	additionalProperties: false,
} as const;

export const MEETING_BRIEF_SCHEMA = {
	type: "object",
	properties: {
		summary: { type: "string" },
		talkingPoints: {
			type: "array",
			items: { type: "string" },
			maxItems: 8,
		},
	},
	required: ["summary"],
	additionalProperties: false,
} as const;

export const ALL_SCHEMAS: ReadonlyArray<Record<string, unknown>> = [
	MODERATION_SCHEMA as Record<string, unknown>,
	ROUTING_SCHEMA as Record<string, unknown>,
	MEETING_BRIEF_SCHEMA as Record<string, unknown>,
];

export const ALL_TOOLS: ReadonlyArray<ToolDef> = [
	{
		name: "check_availability",
		description: "Read busy intervals for one host in a UTC window.",
		parameters: {
			type: "object",
			properties: {
				startAt: { type: "string", description: "UTC ISO start." },
				endAt: { type: "string", description: "UTC ISO end." },
			},
			required: ["startAt", "endAt"],
			additionalProperties: false,
		},
	},
	{
		name: "get_holidays",
		description: "Public holidays for a country and year.",
		parameters: {
			type: "object",
			properties: {
				country: { type: "string" },
				year: { type: "integer", minimum: 2000, maximum: 2100 },
			},
			required: ["country", "year"],
			additionalProperties: false,
		},
	},
];
