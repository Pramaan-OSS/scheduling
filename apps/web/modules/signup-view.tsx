"use client";

import getLegacyPayment from "@scheduling/lib/payment/link";
import { getPremiumPlanPriceValue } from "@scheduling/lib/payment/link";
import {
  fetchSignup,
  hasCheckoutSession,
  isAccountUnderReview,
  isUserAlreadyExistsError,
} from "@scheduling/features/auth/signup/lib/fetchSignup";
import { getOrgUsernameFromEmail } from "@scheduling/features/auth/signup/utils/getOrgUsernameFromEmail";
import ServerTrans from "@scheduling/lib/components/ServerTrans";
import {
  APP_NAME,
  CHALLENGE_SITE_ID,
  IS_SCHEDULING,
  URL_PROTOCOL_REGEX,
  WEBAPP_URL,
  WEBSITE_PRIVACY_POLICY_URL,
  WEBSITE_TERMS_URL,
  WEBSITE_URL,
} from "@scheduling/lib/constants";
import { isENVDev } from "@scheduling/lib/env";
import { fetchUsername } from "@scheduling/lib/fetchUsername";
import { pushGTMEvent } from "@scheduling/lib/gtm";
import { useCompatSearchParams } from "@scheduling/lib/hooks/useCompatSearchParams";
import { useDebounce } from "@scheduling/lib/hooks/useDebounce";
import { useLocale } from "@scheduling/lib/hooks/useLocale";
import { INVALID_CHALLENGE_TOKEN_ERROR } from "@scheduling/lib/server/checkCfProofToken";
import { IS_EUROPE } from "@scheduling/lib/timezoneConstants";
import { signupSchema as apiSignupSchema } from "@scheduling/prisma/zod-utils";
import type { inferSSRProps } from "@scheduling/types/inferSSRProps";
import classNames from "@scheduling/ui/classNames";
import { Alert } from "@scheduling/ui/components/alert";
import { Button } from "@scheduling/ui/components/button";
import { CheckboxField, Form, PasswordField, SelectField, TextField } from "@scheduling/ui/components/form";
import { Icon } from "@scheduling/ui/components/icon";
import { showToast } from "@scheduling/ui/components/toast";
import { InfoIcon, ShieldCheckIcon, StarIcon } from "@coss/ui/icons";

import { zodResolver } from "@hookform/resolvers/zod";
import type { getServerSideProps } from "@lib/signup/getServerSideProps";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { signIn } from "next-auth/react";

import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";
import { Toaster } from "sonner";
import { z } from "zod";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(), // Needed to display API errors doesn't get passed to the API
  cfToken: z.string().optional(),
});

const ProofCaptcha = dynamic(() => import("@scheduling/web/modules/auth/components/Proof"), {
  ssr: false,
});

type FormValues = z.infer<typeof signupSchema>;

export type SignupProps = inferSSRProps<typeof getServerSideProps>;

const FEATURES = [
  {
    title: "connect_all_calendars",
    description: "connect_all_calendars_description",
    i18nOptions: {
      appName: APP_NAME,
    },
    icon: "calendar-heart" as const,
  },
  {
    title: "set_availability",
    description: "set_availbility_description",
    icon: "users" as const,
  },
  {
    title: "share_a_link_or_embed",
    description: "share_a_link_or_embed_description",
    icon: "link-2" as const,
    i18nOptions: {
      appName: APP_NAME,
    },
  },
];

function truncateDomain(domain: string) {
  const maxLength = 25;
  const cleanDomain = domain.replace(URL_PROTOCOL_REGEX, "");

  if (cleanDomain.length <= maxLength) {
    return cleanDomain;
  }

  return `${cleanDomain.substring(0, maxLength - 3)}.../`;
}

function UsernameField({
  username,
  setPremium,
  premium,
  setUsernameTaken,
  orgSlug,
  usernameTaken,
  disabled,
  ...props
}: React.ComponentProps<typeof TextField> & {
  username: string;
  setPremium: (value: boolean) => void;
  premium: boolean;
  usernameTaken: boolean;
  orgSlug?: string;
  setUsernameTaken: (value: boolean) => void;
}) {
  const { t } = useLocale();
  const { register, formState } = useFormContext<FormValues>();
  const debouncedUsername = useDebounce(username, 600);

  useEffect(() => {
    if (formState.isSubmitting || formState.isSubmitSuccessful) return;

    async function checkUsername() {
      // If the username can't be changed, there is no point in doing the username availability check
      if (disabled) return;
      if (!debouncedUsername) {
        setPremium(false);
        setUsernameTaken(false);
        return;
      }
      fetchUsername(debouncedUsername, orgSlug ?? null).then(({ data }) => {
        setPremium(data.premium);
        setUsernameTaken(!data.available);
      });
    }
    checkUsername();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedUsername,
    disabled,
    orgSlug,
    formState.isSubmitting,
    formState.isSubmitSuccessful,
    setPremium,
    setUsernameTaken,
  ]);

  return (
    <div>
      <TextField
        disabled={disabled}
        {...props}
        {...register("username")}
        data-testid="signup-usernamefield"
      />
      {(!formState.isSubmitting || !formState.isSubmitted) && (
        <div className="flex items-center text-default text-gray text-sm">
          <div className="text-sm">
            {usernameTaken ? (
              <div className="flex items-center text-error">
                <InfoIcon className="mr-1 inline-block h-4 w-4" />
                <p>{t("already_in_use_error")}</p>
              </div>
            ) : premium ? (
              <div data-testid="premium-username-warning" className="flex items-center">
                <StarIcon className="mr-1 inline-block h-4 w-4" />
                <p>
                  {t("premium_username", {
                    price: getPremiumPlanPriceValue(),
                    interpolation: { escapeValue: false },
                  })}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function addOrUpdateQueryParam(url: string, key: string, value: string) {
  const separator = url.includes("?") ? "&" : "?";
  const param = `${key}=${encodeURIComponent(value)}`;
  return `${url}${separator}${param}`;
}

export default function Signup({
  prepopulateFormValues,
  token,
  orgSlug,
  isConnectedLoginEnabled,
  orgAutoAcceptEmail,
  redirectUrl,
  emailVerificationEnabled,
  onboardingV3Enabled,
}: SignupProps) {
  const isOrgInviteByLink = orgSlug && !prepopulateFormValues?.username;
  const [premiumUsername, setPremiumUsername] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [isConnectedLoading, setIsConnectedLoading] = useState(false);
  const [isEnterpriseLoading, setIsEnterpriseLoading] = useState(false);
  const [accountUnderReview, setAccountUnderReview] = useState(false);
  const [displayEmailForm, setDisplayEmailForm] = useState(token);
  const [proofKey, setProofKey] = useState(0);
  const searchParams = useCompatSearchParams();
  const { t, i18n } = useLocale();
  const router = useRouter();
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: prepopulateFormValues satisfies FormValues,
    mode: "onTouched",
  });
  const {
    register,
    watch,
    formState: { isSubmitting, errors, isSubmitSuccessful },
  } = formMethods;

  useEffect(() => {
    if (redirectUrl) {
      localStorage.setItem("onBoardingRedirect", redirectUrl);
    }
  }, [redirectUrl]);

  const [userConsentToCookie, setUserConsentToCookie] = useState(false); // No need to be checked for user to proceed

  function handleConsentChange(consent: boolean) {
    setUserConsentToCookie(!consent);
  }

  const loadingSubmitState = isSubmitSuccessful || isSubmitting;
  const displayBackButton = token ? false : displayEmailForm;

  const signUp: SubmitHandler<FormValues> = async (_data) => {
    const { cfToken, ...data } = _data;

    undefined;

    try {
      const result = await fetchSignup(
        {
          ...data,
          language: i18n.language,
          token,
        },
        cfToken
      );

      if (!result.ok) {
        if (isUserAlreadyExistsError(result)) {
          showToast(t("account_already_exists_please_login"), "warning");
          const callbackUrl = token ? `/teams?token=${token}` : "/event-types";
          setTimeout(() => {
            router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          }, 3000);
          return;
        }

        if (hasCheckoutSession(result)) {
          const legacyPayment = await getLegacyPayment();
          if (legacyPayment) {
            const { error } = await legacyPayment.redirectToCheckout({
              sessionId: result.error.checkoutSessionId,
            });
            if (error) console.warn(error.message);
          }
          return;
        }

        throw new Error(result.error.message);
      }

      if (isAccountUnderReview(result)) {
        setAccountUnderReview(true);
        return;
      }

      if (process.env.NEXT_PUBLIC_GTM_ID) {
        pushGTMEvent("create_account", { email: data.email, user: data.username, lang: data.language });
      }

      const gettingStartedPath = onboardingV3Enabled ? "onboarding/getting-started" : "getting-started";
      const verifyOrGettingStarted = emailVerificationEnabled ? "auth/verify-email" : gettingStartedPath;
      const constructCallBackIfUrlPresent = () => {
        if (isOrgInviteByLink) {
          return `${WEBAPP_URL}/${searchParams.get("callbackUrl")}`;
        }
        return addOrUpdateQueryParam(`${WEBAPP_URL}/${searchParams.get("callbackUrl")}`, "from", "signup");
      };

      const constructCallBackIfUrlNotPresent = () => {
        return `${WEBAPP_URL}/${verifyOrGettingStarted}?from=signup`;
      };

      const constructCallBackUrl = () => {
        const callbackUrlSearchParams = searchParams?.get("callbackUrl");
        return callbackUrlSearchParams ? constructCallBackIfUrlPresent() : constructCallBackIfUrlNotPresent();
      };

      await signIn<"credentials">("credentials", {
        ...data,
        callbackUrl: constructCallBackUrl(),
      });
    } catch (err) {
      setProofKey((k) => k + 1);
      formMethods.setValue("cfToken", undefined);

      const errorMessage = err instanceof Error ? err.message : t("unexpected_error_try_again");

      if (errorMessage === INVALID_CHALLENGE_TOKEN_ERROR) {
        return;
      }

      undefined;
      formMethods.setError("apiError", { message: errorMessage });
    }
  };

  return (
    <>

      <div
        className={classNames(
          "light flex min-h-screen w-full flex-col items-center justify-center bg-cal-muted [--cal-brand:#111827] 2xl:bg-default dark:[--cal-brand:#FFFFFF]",
          "[--cal-brand-subtle:#9CA3AF]",
          "[--cal-brand-text:#FFFFFF] dark:[--cal-brand-text:#000000]",
          "[--cal-brand-emphasis:#101010] dark:[--cal-brand-emphasis:#e1e1e1]"
        )}>
        <div className="grid w-full max-w-[1440px] grid-cols-1 grid-rows-1 overflow-hidden bg-cal-muted lg:grid-cols-2 2xl:rounded-[20px] 2xl:border 2xl:border-subtle 2xl:py-6">
          {/* Left side */}
          <div className="mt-0 mr-auto ml-auto flex w-full max-w-xl flex-col px-4 pt-6 sm:px-16 md:px-20 lg:mt-24 2xl:px-28">
            {accountUnderReview ? (
              <div
                className="flex flex-col items-center gap-4 py-10 text-center"
                data-testid="account-under-review">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle">
                  <ShieldCheckIcon className="h-6 w-6 text-default" />
                </div>
                <h1 className="font-cal text-[28px] leading-none">{t("account_under_review_title")}</h1>
                <p className="font-medium text-base text-subtle leading-5">
                  {t("account_under_review_description")}
                </p>
                <Button href="/auth/login" className="mt-4">
                  {t("go_back_login")}
                </Button>
              </div>
            ) : (
              <>
                {displayBackButton && (
                  <div className="flex w-fit lg:-mt-12">
                    <Button
                      color="minimal"
                      className="todesktop:mt-10 mb-6 flex h-6 max-h-6 w-full items-center rounded-md px-3 py-2 hover:bg-subtle"
                      StartIcon="arrow-left"
                      data-testid="signup-back-button"
                      onClick={() => {
                        setDisplayEmailForm(false);
                      }}>
                      {t("back")}
                    </Button>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <h1 className="font-cal text-[28px] leading-none">
                    {IS_SCHEDULING ? t("create_your_scheduling_account") : t("create_your_account")}
                  </h1>
                  {IS_SCHEDULING ? (
                    <p className="font-medium text-base text-subtle leading-5">
                      {t("cal_signup_description")}
                    </p>
                  ) : (
                    <p className="font-medium text-base text-subtle leading-5">
                      {t("scheduling_explained", {
                        appName: APP_NAME,
                      })}
                    </p>
                  )}
                  {IS_SCHEDULING && (
                    <div className="mt-12">
                      <SelectField
                        label={t("data_region")}
                        value={{
                          label: t(
                            // Use WEBAPP_URL for SSR-safe region detection
                            WEBAPP_URL.includes("cal.eu") ||
                              (typeof window !== "undefined" &&
                                window.location.hostname === "localhost" &&
                                new URL(window.location.href).searchParams.get("region") === "eu")
                              ? "european_union"
                              : "united_states"
                          ),
                          value:
                            // Use WEBAPP_URL for SSR-safe region detection
                            WEBAPP_URL.includes("cal.eu") ||
                            (typeof window !== "undefined" &&
                              window.location.hostname === "localhost" &&
                              new URL(window.location.href).searchParams.get("region") === "eu")
                              ? "eu"
                              : "us",
                        }}
                        options={[
                          { label: t("united_states"), value: "us" },
                          { label: t("european_union"), value: "eu" },
                        ]}
                        onChange={(option) => {
                          if (option && "value" in option) {
                            const currentUrl = new URL(window.location.href);

                            // Handle localhost - add region as URL parameter
                            if (currentUrl.hostname === "localhost") {
                              currentUrl.searchParams.set("region", option.value);
                              window.location.href = currentUrl.toString();
                              return;
                            }

                            // Handle production domains - modify hostname only to preserve query params
                            if (option.value === "eu") {
                              currentUrl.hostname = currentUrl.hostname.replace("scheduling.local", "cal.eu");
                            } else {
                              currentUrl.hostname = currentUrl.hostname.replace("cal.eu", "scheduling.local");
                            }
                            window.location.href = currentUrl.toString();
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Form Container */}
                {displayEmailForm && (
                  <div className="mt-6">
                    <Form
                      className="flex flex-col gap-4"
                      form={formMethods}
                      handleSubmit={async (values) => {
                        let updatedValues = values;
                        if (!formMethods.getValues().username && isOrgInviteByLink) {
                          updatedValues = {
                            ...values,
                            username: getOrgUsernameFromEmail(values.email, orgAutoAcceptEmail),
                          };
                        }
                        await signUp(updatedValues);
                      }}>
                      {/* Username */}
                      {!isOrgInviteByLink ? (
                        <UsernameField
                          orgSlug={orgSlug}
                          label={t("username")}
                          username={watch("username") || ""}
                          premium={premiumUsername}
                          usernameTaken={usernameTaken}
                          disabled={!!orgSlug}
                          setUsernameTaken={(value) => setUsernameTaken(value)}
                          data-testid="signup-usernamefield"
                          setPremium={(value) => setPremiumUsername(value)}
                          addOnLeading={
                            orgSlug
                              ? truncateDomain(
                                  `${WEBAPP_URL.replace(
                                    URL_PROTOCOL_REGEX,
                                    ""
                                  )}/`
                                )
                              : truncateDomain(
                                  `${WEBSITE_URL.replace(URL_PROTOCOL_REGEX, "")}/`
                                )
                          }
                        />
                      ) : null}
                      {/* Email */}
                      <TextField
                        id="signup-email"
                        {...register("email")}
                        label={t("email")}
                        placeholder="john@doe.com"
                        type="email"
                        autoComplete="email"
                        disabled={prepopulateFormValues?.email}
                        data-testid="signup-emailfield"
                      />

                      {/* Password */}
                      <PasswordField
                        id="signup-password"
                        data-testid="signup-passwordfield"
                        autoComplete="new-password"
                        label={t("password")}
                        {...register("password")}
                        hintErrors={["caplow", "min", "num"]}
                      />
                      {/* Challenge Proof Captcha */}
                      {CHALLENGE_SITE_ID ? (
                        <ProofCaptcha
                          key={proofKey}
                          appearance="interaction-only"
                          onVerify={(token: string) => {
                            formMethods.setValue("cfToken", token);
                          }}
                          onExpire={() => {
                            formMethods.setValue("cfToken", undefined);
                          }}
                          onError={() => {
                            formMethods.setValue("cfToken", undefined);
                          }}
                        />
                      ) : null}

                      <CheckboxField
                        data-testid="signup-cookie-content-checkbox"
                        onChange={() => handleConsentChange(userConsentToCookie)}
                        description={t("cookie_consent_checkbox")}
                      />
                      {errors.apiError && (
                        <Alert
                          className="mb-3"
                          severity="error"
                          message={errors.apiError?.message}
                          data-testid="signup-error-message"
                        />
                      )}
                      <Button
                        type="submit"
                        data-testid="signup-submit-button"
                        className="my-2 w-full justify-center"
                        loading={loadingSubmitState}
                        disabled={
                          !!formMethods.formState.errors.username ||
                          !!formMethods.formState.errors.email ||
                          !formMethods.getValues("email") ||
                          !formMethods.getValues("password") ||
                          (CHALLENGE_SITE_ID && !process.env.NEXT_PUBLIC_IS_E2E && !watch("cfToken")) ||
                          isSubmitting ||
                          usernameTaken
                        }>
                        {premiumUsername && !usernameTaken
                          ? `${t("get_started")} (${getPremiumPlanPriceValue()})`
                          : t("get_started")}
                      </Button>
                    </Form>
                  </div>
                )}
                {!displayEmailForm && (
                  <div className="mt-8 flex flex-col gap-6">
                    {/* Upper Row */}




                    {(isConnectedLoginEnabled) && (
                      <div>
                        <div className="relative flex items-center">
                          <div className="grow border-subtle border-t" />
                          <span className="mx-2 shrink font-normal text-sm text-subtle leading-none">
                            {t("or").toLocaleLowerCase()}
                          </span>
                          <div className="grow border-subtle border-t" />
                        </div>
                      </div>
                    )}

                    {/* Lower Row */}
                    <div className="flex flex-col gap-2">
                      <Button
                        color="secondary"
                        disabled={isConnectedLoading || isEnterpriseLoading}
                        className={classNames("w-full justify-center rounded-md text-center")}
                        onClick={() => {
                          undefined;
                          setDisplayEmailForm(true);
                        }}
                        data-testid="continue-with-email-button">
                        {t("continue_with_email")}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Already have an account & T&C */}
                <div className="mt-10 flex h-full flex-col justify-end pb-6 text-xs">
                  <div className="flex flex-col text-sm">
                    <div className="flex gap-1">
                      <p className="text-subtle">{t("already_have_account")}</p>
                      <Link href="/auth/login" className="text-emphasis hover:underline">
                        {t("sign_in")}
                      </Link>
                    </div>
                    {WEBSITE_TERMS_URL && WEBSITE_PRIVACY_POLICY_URL && <div className="text-subtle">
                      <ServerTrans
                        t={t}
                        i18nKey="signing_up_terms"
                        values={{ appName: APP_NAME }}
                        components={[
                          <Link
                            className="text-emphasis hover:underline"
                            key="terms"
                            href={`${WEBSITE_TERMS_URL}`}
                            target="_blank">
                            Terms
                          </Link>,
                          <Link
                            className="text-emphasis hover:underline"
                            key="privacy"
                            href={`${WEBSITE_PRIVACY_POLICY_URL}`}
                            target="_blank">
                            Privacy Policy.
                          </Link>,
                        ]}
                      />
                    </div>}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="mx-auto mt-24 w-full max-w-2xl flex-col justify-between rounded-l-2xl border-subtle pl-4 lg:mt-0 lg:flex lg:max-w-full lg:border lg:bg-subtle lg:py-12 lg:pl-12 dark:bg-none">

            <div className="hidden rounded-tl-2xl rounded-br-none rounded-bl-2xl border border-default border-r-0 border-dashed bg-black/3 lg:block lg:py-[6px] lg:pl-[6px] dark:bg-white/5">
              <img className="block dark:hidden" src="/mock-event-type-list.svg" alt="Scheduling Booking Page" />
              {/* eslint-disable @next/next/no-img-element */}
              <img
                className="hidden dark:block"
                src="/mock-event-type-list-dark.svg"
                alt="Scheduling Booking Page"
              />
            </div>
            <div className="mt-8 mr-12 hidden h-full w-full grid-cols-3 gap-4 overflow-hidden lg:grid">
              {FEATURES.map((feature, index) => (
                <div key={index} className="mb-8 flex max-w-52 flex-col leading-none sm:mb-0">
                  <div className="items-center text-emphasis">
                    <Icon name={feature.icon} className="mb-1 h-4 w-4" />
                    <span className="font-medium text-sm">{t(feature.title)}</span>
                  </div>
                  <div className="text-sm text-subtle">
                    <p>
                      {t(
                        feature.description,
                        feature.i18nOptions && {
                          ...feature.i18nOptions,
                        }
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
