import { useFlagMap } from "@scheduling/features/flags/context/provider";
import { APP_NAME } from "@scheduling/lib/constants";
import { useLocale } from "@scheduling/lib/hooks/useLocale";
import { trpc } from "@scheduling/trpc/react";
import { showToast } from "@scheduling/ui/components/toast";
import { TopBanner } from "@scheduling/ui/components/top-banner";

export type VerifyEmailBannerProps = {
  data: boolean;
};

function VerifyEmailBanner({ data }: VerifyEmailBannerProps) {
  const flags = useFlagMap();
  const { t } = useLocale();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();

  if (!data || !flags["email-verification"]) return null;

  return (
    <>
      <TopBanner
        icon="mail"
        text={t("verify_email_banner_body", { appName: APP_NAME })}
        variant="warning"
        actions={
          <a
            className="underline hover:cursor-pointer"
            onClick={() => {
              mutation.mutate();
              showToast(t("email_sent"), "success");
            }}>
            {t("resend_email")}
          </a>
        }
      />
    </>
  );
}

export default VerifyEmailBanner;
