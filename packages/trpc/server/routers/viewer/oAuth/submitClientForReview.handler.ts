import { sendAdminOAuthClientNotification } from "@scheduling/emails/oauth-email-service";
import { getTranslation } from "@scheduling/i18n/server";
import { OAuthClientRepository } from "@scheduling/features/oauth/repositories/OAuthClientRepository";
import { generateSecret } from "@scheduling/features/oauth/utils/generateSecret";
import type { PrismaClient } from "@scheduling/prisma";

import type { TSubmitClientInputSchema } from "./submitClientForReview.schema";

type SubmitClientOptions = {
  ctx: {
    user: {
      id: number;
      email: string;
      name: string | null;
    };
    prisma: PrismaClient;
  };
  input: TSubmitClientInputSchema;
};

export const submitClientForReviewHandler = async ({ ctx, input }: SubmitClientOptions) => {
  const { name, purpose, redirectUri, logo, websiteUrl, enablePkce } = input;
  const userId = ctx.user.id;

  const oAuthClientRepository = new OAuthClientRepository(ctx.prisma);

  let plainSecret: string | undefined;
  let hashedSecret: string | undefined;
  if (!enablePkce) {
    const [hashed, plain] = generateSecret();
    hashedSecret = hashed;
    plainSecret = plain;
  }

  const client = await oAuthClientRepository.create({
    name,
    purpose,
    redirectUri,
    clientSecret: hashedSecret,
    logo,
    websiteUrl,
    enablePkce,
    userId,
    status: "PENDING",
  });

  const t = await getTranslation("en", "common");
  try { await sendAdminOAuthClientNotification({
    t,
    clientName: client.name,
    purpose: client.purpose,
    clientId: client.clientId,
    redirectUri: client.redirectUri,
    submitterEmail: ctx.user.email,
    submitterName: ctx.user.name,
  }); } catch {
    console.info("The authorization client is saved for administrator review; its notification is not available yet.");
  }

  return {
    clientId: client.clientId,
    name: client.name,
    purpose: client.purpose,
    clientSecret: plainSecret,
    redirectUri: client.redirectUri,
    logo: client.logo,
    clientType: client.clientType,
    status: client.status,
    isPkceEnabled: enablePkce,
  };
};
