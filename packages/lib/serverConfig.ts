/**
 * The one sender setting. Every outgoing email names the product and one
 * address; the operator may override the address with EMAIL_FROM. Without a
 * configured address the product's own address on the templates sending
 * domain is used, so email works as soon as a key is set.
 */
export const DEFAULT_EMAIL_FROM = "noreply@updates.pramaan.one";

export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
}

export const serverConfig = {
  get from(): string {
    return emailFrom();
  },
};
