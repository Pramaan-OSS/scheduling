import type { EmailConfig, SendVerificationRequestParams } from "next-auth/providers/email";
type Options = Partial<EmailConfig> & { sendVerificationRequest: (params: SendVerificationRequestParams) => Promise<void> };
export default function EmailProvider(options: Options): EmailConfig {
 return { id: "email", type: "email", name: "Email", from: "", server: {}, maxAge: 24*60*60, ...options, options };
}
