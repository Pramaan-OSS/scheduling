import type { NextApiRequest } from "next";
import { z } from "zod";

const utmTrackingDataSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  utm_id: z.string().optional(),
  utm_referral: z.string().optional(),
  landing_page: z.string().optional(),
});



export type UtmTrackingData = z.infer<typeof utmTrackingDataSchema>;

export type TrackingData = {
  utmData?: UtmTrackingData;
};

export function getTrackingFromCookies(
  cookies?: NextApiRequest["cookies"],
  query?: NextApiRequest["query"]
): TrackingData {
  const tracking: TrackingData = {};

  const parseUtm = (input: unknown): UtmTrackingData | null => {
    const parsed = utmTrackingDataSchema.safeParse(input);
    if (!parsed.success) return null;

    return Object.fromEntries(
      Object.entries(parsed.data).filter(([_, value]) => value !== undefined)
    ) as UtmTrackingData;
  };

  let utmData: UtmTrackingData | null = null;

  if (query && Object.keys(query).length > 0) {
    utmData = parseUtm(query);
  }

  if (!utmData && cookies?.utm_data) {
    try {
      utmData = parseUtm(JSON.parse(cookies.utm_data));
    } catch {
      console.debug("Failed to parse utm_data cookie");
    }
  }

  if (utmData) {
    tracking.utmData = utmData;
  }

  return tracking;
}
