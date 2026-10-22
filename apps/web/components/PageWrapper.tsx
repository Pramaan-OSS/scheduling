/**
 * PAGES ROUTER ONLY - Used exclusively by Next.js Pages Router
 *
 * Currently only serves the /router endpoint (routing forms redirect page).
 * DO NOT add new features here - this file will be deprecated once we remove apps/web/pages.
 *
 * For App Router, use PageWrapperAppDir.tsx instead.
 */

"use client";

import { DefaultSeo } from "next-seo";
import localFont from "next/font/local";
import Head from "next/head";
import Script from "next/script";

import "@scheduling/embed-core/src/embed-iframe";
import { IS_SCHEDULING, WEBAPP_URL } from "@scheduling/lib/constants";
import { getSchedulingUrl } from "@scheduling/lib/getSchedulingUrl";
import { buildCanonical } from "@scheduling/lib/next-seo.config";
import { IconSprites } from "@scheduling/ui/components/icon";

import type { AppProps } from "@lib/app-providers";
import AppProviders from "@lib/app-providers";
import { seoConfig } from "@lib/config/next-seo.config";


export interface CalPageWrapper {
  (props?: AppProps): JSX.Element;
  PageWrapper?: AppProps["Component"]["PageWrapper"];
}

const interFont = localFont({ src: "../public/fonts/Inter-roman.var.woff2", variable: "--font-sans", preload: true, display: "swap" });
const calFont = localFont({
  src: "../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "swap",
  weight: "600",
});

function PageWrapper(props: AppProps) {
  const { Component, pageProps, err, router } = props;
  let pageStatus = "200";

  if (router.pathname === "/404") {
    pageStatus = "404";
  } else if (router.pathname === "/500") {
    pageStatus = "500";
  } else if (router.pathname === "/403") {
    pageStatus = "403";
  }

  const providerProps = {
    ...props,
  };
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page);

  const path = router.asPath;

  return (
    <AppProviders {...providerProps}>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover"
        />
      </Head>
      <DefaultSeo
        // Set canonical to  or self-hosted URL
        canonical={
          IS_SCHEDULING
            ? buildCanonical({ path, origin: getSchedulingUrl() }) // scheduling.local & .dev
            : buildCanonical({ path, origin: WEBAPP_URL }) // self-hosted
        }
        {...seoConfig.defaultNextSeo}
      />
      <Script
        id="page-status"
        // It is strictly not necessary to disable, but in a future update of react/no-danger this will error.
        // And we don't want it to error here anyways
        // eslint-disable-next-line react/no-danger
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Setting page status requires inline script
        dangerouslySetInnerHTML={{ __html: `window.SchedulingPageStatus = '${pageStatus}'` }}
      />

      <style jsx global>{`
        :root {
          --font-sans: ${interFont.style.fontFamily}, system-ui;
          --font-cal: ${calFont.style.fontFamily};
        }
      `}</style>
      <IconSprites />

      {getLayout(
        Component.requiresLicense ? (
          <>
            <Component {...pageProps} err={err} />
          </>
        ) : (
          <Component {...pageProps} err={err} />
        )
      )}
    </AppProviders>
  );
}

export default PageWrapper;
