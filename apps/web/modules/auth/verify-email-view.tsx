"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { useEffect } from "react";

import { useFlagMap } from "@scheduling/features/flags/context/provider";
import { APP_NAME } from "@scheduling/lib/constants";
import { useLocale } from "@scheduling/lib/hooks/useLocale";
import { trpc } from "@scheduling/trpc/react";
import useEmailVerifyCheck from "@scheduling/trpc/react/hooks/useEmailVerifyCheck";
import { Button } from "@scheduling/ui/components/button";
import { EmptyScreen } from "@scheduling/ui/components/empty-screen";
import { showToast } from "@scheduling/ui/components/toast";

const EMAIL_CLIENTS: Array<{name: string; icon: string; href: string}> = [];

function VerifyEmailPage() {
  const { data } = useEmailVerifyCheck();
  const { data: session } = useSession();
  const router = useRouter();
  const { t, isLocaleReady } = useLocale();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();
  const flags = useFlagMap();

  useEffect(() => {
    if (data?.isVerified) {
      undefined;
      const gettingStartedPath = flags["onboarding-v3"] ? "/onboarding/getting-started" : "/getting-started";
      router.replace(gettingStartedPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.isVerified, flags]);
  if (!isLocaleReady) {
    return null;
  }
  return (
    <div className="h-screen w-full ">
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="max-w-3xl">
          <EmptyScreen
            border
            dashedBorder={false}
            Icon="mail-open"
            headline={t("check_your_email")}
            description={t("verify_email_page_body", { email: session?.user?.email, appName: APP_NAME })}
            className="bg-default"
            buttonRaw={
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {EMAIL_CLIENTS.map(({ name, icon, href }) => (
                    <Button
                      key={name}
                      color="secondary"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer">
                      <img src={icon} alt={name} className="me-1 h-4 w-4" /> {name}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    color="minimal"
                    loading={mutation.isPending}
                    onClick={() => {
                      undefined;
                      showToast(t("send_email"), "success");
                      mutation.mutate();
                    }}>
                    {t("resend_email")}
                  </Button>
                  <Button
                    color="minimal"
                    onClick={() => {
                      signOut({ callbackUrl: "/signup" });
                    }}>
                    {t("use_different_email")}
                  </Button>
                </div>
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
