import { WEBAPP_URL } from "@scheduling/lib/constants";
import { hasConnectedSignIn, signInConfiguration } from "@scheduling/features/auth/lib/connected-signin";
export const IS_CONNECTED_LOGIN_ENABLED = hasConnectedSignIn(signInConfiguration(WEBAPP_URL));
