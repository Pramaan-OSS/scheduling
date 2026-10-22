import { Cap, unavailableMessage, type Pramaan, type RunOptions } from "@scheduling/pramaan";
export const CONTACT_REVIEW_KIND = "connected.contact";
const labels: Record<string, string> = { email: "Email", name: "Name", firstName: "First name", first_name: "First name", firstname: "First name", lastName: "Last name", last_name: "Last name", lastname: "Last name", company: "Company", phone: "Phone", website: "Website" };
export type ContactField = { key: string; label: string; required: boolean; minLength?: number; maxLength: number; enum?: string[] };
export type ContactAction = { app: string; action: string; fields: ContactField[] };
export function usableContactAction(value: unknown): ContactAction | null {
 if (!value || typeof value !== "object") return null;
 const action = value as any;
 if (typeof action.app !== "string" || typeof action.action !== "string" || action.readOnly === true || !/(?:CREATE|ADD).*CONTACT|CONTACT.*(?:CREATE|ADD)/.test(action.action)) return null;
 const schema = action.inputSchema;
 if (schema && Object.keys(schema).some(keyword => !["type", "properties", "required", "additionalProperties", "title", "description", "$schema"].includes(keyword))) return null;
 if (!schema || schema.type !== "object" || !schema.properties || JSON.stringify(schema).length > 65536) return null;
 const required: string[] = Array.isArray(schema.required) ? schema.required : [];
 if (required.some(key => !labels[key])) return null;
 const fields: ContactField[] = [];
 for (const [key, raw] of Object.entries(schema.properties)) {
  if (!labels[key]) continue;
  const field = raw as any;
  if (!field || field.type !== "string" || Object.keys(field).some(keyword => !["type", "title", "description", "format", "minLength", "maxLength", "enum", "default", "examples"].includes(keyword))) return null;
  if (field.enum && (!Array.isArray(field.enum) || field.enum.length > 256 || field.enum.some((item: unknown) => typeof item !== "string"))) return null;
  fields.push({ key, label: labels[key], required: required.includes(key), minLength: field.minLength, maxLength: Math.min(field.maxLength || 1000, 1000), ...(field.enum ? { enum: field.enum } : {}) });
 }
 if (!fields.some(field => field.key === "email") || required.some(key => !fields.some(field => field.key === key))) return null;
 return { app: action.app, action: action.action, fields };
}
export function contactInput(action: ContactAction, values: unknown): Record<string, string> {
 if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error("Fill in the contact details.");
 const input: Record<string, string> = {};
 for (const field of action.fields) {
  const value = (values as Record<string, unknown>)[field.key];
  if (value === undefined || value === "") { if (field.required) throw new Error(`Enter ${field.label.toLowerCase()}.`); continue; }
  if (typeof value !== "string" || value.length > field.maxLength || value.length < (field.minLength || 0) || (field.enum && !field.enum.includes(value))) throw new Error(`Check ${field.label.toLowerCase()}.`);
  if (field.key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a work email address.");
  input[field.key] = value;
 }
 return input;
}
export class ContactCatalogue {
 private pages = new Map<string, { choices: ContactAction[]; nextCursor?: string }>();
 async page(client: Pramaan, cursor?: string) {
  const key = cursor || "first";
  const cached = this.pages.get(key);
  if (cached) return cached;
  if (cursor && ![...this.pages.values()].some(page => page.nextCursor === cursor)) throw new Error("Start a fresh contact search.");
  const result = await client.call(Cap.appsCatalogSearch, { query: "Create a CRM contact", limit: 5, ...(cursor ? { cursor } : {}) }) as any;
  if (!Array.isArray(result?.results)) throw new Error("Contact discovery is not available yet.");
  const page = { choices: result.results.map(usableContactAction).filter((value: ContactAction | null): value is ContactAction => Boolean(value)), ...(typeof result.nextCursor === "string" ? { nextCursor: result.nextCursor } : {}) };
  this.pages.set(key, page);
  return page;
 }
}
export const contactUserRef = (userId: number) => `booking-user-${userId}`;
export async function connectContactAction(client: Pramaan, userId: number, action: ContactAction, redirectUrl: string) {
 const result = await client.call(Cap.appsConnectionStart, { endUserRef: contactUserRef(userId), app: action.app, redirectUrl }, { idempotencyKey: `contact-connect-${userId}-${action.action}-standard-access` }) as any;
 if (typeof result?.connectUrl !== "string" || new URL(result.connectUrl).protocol !== "https:") throw new Error("This connection is not available yet.");
 return result.connectUrl as string;
}
export async function estimateContact(client: Pramaan, userId: number, action: ContactAction, values: unknown) {
 const connections = await client.call(Cap.appsConnectionsList, { endUserRef: contactUserRef(userId), app: action.app }) as any;
 if (!connections?.results?.some((connection: any) => connection.app === action.app && connection.status === "active" && ["read-write", "full"].includes(connection.access) && connection.accessConfirmed === true)) throw new Error("Connect the contact destination and confirm its access first.");
 const input = { endUserRef: contactUserRef(userId), action: action.action, input: contactInput(action, values) };
 const estimate = await client.capabilities.estimate(Cap.appsActionExecute, input);
 if (!estimate.canRun || !Number.isSafeInteger(estimate.priceMaxMicro) || estimate.priceMaxMicro < 0) throw new Error("This action cannot run within the available balance. Try later.");
 return { input, estimate };
}
export async function startContact(client: Pramaan, input: unknown, estimate: { priceMaxMicro: number }, reviewId: string) {
 return client.run(Cap.appsActionExecute, input, { idempotencyKey: `contact-${reviewId}`, maxPriceMicro: estimate.priceMaxMicro } as RunOptions);
}
export function contactResult(result: any) {
 if (!["succeeded", "failed"].includes(result?.status)) return { status: "unknown", message: "Could not confirm the contact action. Check the destination before retrying." };
 if (result?.status !== "succeeded") return { status: "failed", message: "The contact action could not be confirmed. Check the destination before retrying." };
 return { status: "done", message: "The contact action finished. Check the destination before creating another contact." };
}
export function contactFailure(error: unknown) { return unavailableMessage(error); }
