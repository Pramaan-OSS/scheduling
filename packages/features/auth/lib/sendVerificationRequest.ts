import { readFileSync } from "node:fs";
import Handlebars from "handlebars";
import type { SendVerificationRequestParams } from "next-auth/providers/email";
import { dispatchEmail } from "@scheduling/emails/lib/dispatch-email";
import path from "node:path";

import { APP_NAME, WEBAPP_URL } from "@scheduling/lib/constants";
import { serverConfig } from "@scheduling/lib/serverConfig";


const sendVerificationRequest = async ({
  identifier,
  url,
}: Pick<SendVerificationRequestParams, "identifier" | "url">) => {
  const emailsDir = path.resolve(process.cwd(), "..", "..", "packages/emails", "templates");
  const originalUrl = new URL(url);
  const webappUrl = new URL(process.env.NEXTAUTH_URL || WEBAPP_URL);
  if (originalUrl.origin !== webappUrl.origin) {
    url = url.replace(originalUrl.origin, webappUrl.origin);
  }
  const emailFile = readFileSync(path.join(emailsDir, "confirm-email.html"), {
    encoding: "utf8",
  });
  const emailTemplate = Handlebars.compile(emailFile);
  await dispatchEmail({
    from: `${APP_NAME} <${serverConfig.from}>`,
    to: identifier,
    subject: `Your sign-in link for ${APP_NAME}`,
    html: emailTemplate({
      base_url: WEBAPP_URL,
      signin_url: url,
      email: identifier,
    }),
  }, { origin: WEBAPP_URL, secret: process.env.NEXTAUTH_SECRET || "" });
};

export default sendVerificationRequest;
