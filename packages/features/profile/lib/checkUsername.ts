import { IS_PREMIUM_USERNAME_ENABLED } from "@scheduling/lib/constants";
import { usernameCheck as checkPremiumUsername } from "@scheduling/lib/server/username";

import { checkRegularUsername } from "./checkRegularUsername";

// TODO: Replace `lib/checkPremiumUsername` with `usernameCheck` and then import checkPremiumUsername directly here.
// We want to remove dependency on website for signup stuff as signup is now part of app.
export const checkUsername = !IS_PREMIUM_USERNAME_ENABLED ? checkRegularUsername : checkPremiumUsername;
