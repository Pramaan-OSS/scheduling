import { getWatchlistFeature } from "@scheduling/features/di/watchlist/containers/watchlist";
import type logger from "@scheduling/lib/logger";

import { extractDomainFromEmail } from "../utils/normalization";

interface CheckFreeEmailDomainParams {
  email: string;
  logger?: ReturnType<typeof logger.getSubLogger>;
}

export const checkIfFreeEmailDomain = async (params: CheckFreeEmailDomainParams): Promise<boolean> => {
  const { email, logger: log } = params;

  try {
    const emailDomain = extractDomainFromEmail(email);

    // If there's no email domain return as if it was a free email domain
    if (!emailDomain) return true;


    const watchlist = await getWatchlistFeature();
    return await watchlist.globalBlocking.isFreeEmailDomain(emailDomain);
  } catch (err) {
    log?.error(err);
    // If normalization fails, treat as free email domain for safety
    return true;
  }
};
