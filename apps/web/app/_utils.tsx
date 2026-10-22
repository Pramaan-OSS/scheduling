import { type TFunction } from "i18next";
import { cookies, headers } from "next/headers";

import { getLocale } from "@scheduling/features/auth/lib/getLocale";
import type { AppImageProps, MeetingImageProps } from "@scheduling/lib/OgImages";
import { constructAppImage, constructGenericImage, constructMeetingImage } from "@scheduling/lib/OgImages";
import { IS_SCHEDULING, WEBAPP_URL, APP_NAME, SEO_IMG_OGIMG, CAL_URL } from "@scheduling/lib/constants";
import { getSchedulingUrl } from "@scheduling/lib/getSchedulingUrl";
import { buildCanonical } from "@scheduling/lib/next-seo.config";
import { getTranslation } from "@scheduling/i18n/server";
import { truncateOnWord } from "@scheduling/lib/text";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const getTranslate = async () => {
  const locale = await getLocale(buildLegacyRequest(await headers(), await cookies()));

  return await getTranslation(locale ?? "en", "common");
};

const _generateMetadataWithoutImage = async (
  getTitle: (t: TFunction<string, undefined>) => string,
  getDescription: (t: TFunction<string, undefined>) => string,
  hideBranding?: boolean,
  origin?: string,
  pathname?: string
) => {
  const _pathname = pathname ?? "";
  const canonical = buildCanonical({ path: _pathname, origin: origin ?? CAL_URL });
  const t = await getTranslate();

  const title = getTitle(t);
  const description = getDescription(t);
  const titleSuffix = `| ${APP_NAME}`;
  const displayedTitle = title.includes(titleSuffix) || hideBranding ? title : `${title} ${titleSuffix}`;
  const metadataBase = new URL(IS_SCHEDULING ? getSchedulingUrl() : WEBAPP_URL);

  return {
    title: title.length === 0 ? APP_NAME : displayedTitle,
    description,
    alternates: { canonical },
    openGraph: {
      description: truncateOnWord(description, 158),
      url: canonical,
      type: "website",
      siteName: APP_NAME,
      title: displayedTitle,
    },
    metadataBase,
  };
};

export const _generateMetadata = async (
  getTitle: (t: TFunction<string, undefined>) => string,
  getDescription: (t: TFunction<string, undefined>) => string,
  hideBranding?: boolean,
  origin?: string,
  pathname?: string
) => {
  const metadata = await _generateMetadataWithoutImage(
    getTitle,
    getDescription,
    hideBranding,
    origin,
    pathname
  );
  const image =
    SEO_IMG_OGIMG +
    (await constructGenericImage({
      title: metadata.title,
      description: metadata.description,
    }));

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [image],
    },
  };
};

export const _generateMetadataForStaticPage = async (
  title: string,
  description: string,
  hideBranding?: boolean,
  origin?: string,
  pathname?: string
) => {
  const _pathname = pathname ?? "";
  const canonical = buildCanonical({ path: _pathname, origin: origin ?? CAL_URL });
  const titleSuffix = `| ${APP_NAME}`;
  const displayedTitle = title.includes(titleSuffix) || hideBranding ? title : `${title} ${titleSuffix}`;
  const metadataBase = new URL(IS_SCHEDULING ? getSchedulingUrl() : WEBAPP_URL);

  const metadata = {
    title: title.length === 0 ? APP_NAME : displayedTitle,
    description,
    alternates: { canonical },
    openGraph: {
      description: truncateOnWord(description, 158),
      url: canonical,
      type: "website",
      siteName: APP_NAME,
      title: displayedTitle,
    },
    metadataBase,
  };
  const image =
    SEO_IMG_OGIMG +
    (await constructGenericImage({
      title: metadata.title,
      description: metadata.description,
    }));

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [image],
    },
  };
};

export const generateMeetingMetadata = async (
  meeting: MeetingImageProps,
  getTitle: (t: TFunction<string, undefined>) => string,
  getDescription: (t: TFunction<string, undefined>) => string,
  hideBranding?: boolean,
  origin?: string,
  pathname?: string
) => {
  const metadata = await _generateMetadataWithoutImage(
    getTitle,
    getDescription,
    hideBranding,
    origin,
    pathname
  );
  const image = SEO_IMG_OGIMG + (await constructMeetingImage(meeting));

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [image],
    },
  };
};

export const generateAppMetadata = async (
  app: AppImageProps,
  getTitle: (t: TFunction<string, undefined>) => string,
  getDescription: (t: TFunction<string, undefined>) => string,
  hideBranding?: boolean,
  origin?: string,
  pathname?: string
) => {
  const metadata = await _generateMetadataWithoutImage(
    getTitle,
    getDescription,
    hideBranding,
    origin,
    pathname
  );

  const image = SEO_IMG_OGIMG + (await constructAppImage({ ...app, description: metadata.description }));

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [image],
    },
  };
};
