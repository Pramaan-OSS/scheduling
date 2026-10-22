import type { OAuthConfig } from "next-auth/providers/oauth";
import { exchangeConnectedSignIn, hasConnectedSignIn, signInConfiguration } from "./connected-signin";

export function connectedProvider(origin: string): OAuthConfig<any> | null {
  const configuration = signInConfiguration(origin);
  if (!hasConnectedSignIn(configuration)) return null;
  return {
    id: "connected",
    name: "Connected sign-in",
    type: "oauth",
    clientId: "scheduling",
    checks: ["state", "pkce", "nonce"],
    idToken: false,
    authorization: { url: `${origin}/api/connected-signin/start`, params: { scope: "openid profile email" } },
    token: {
      url: `${origin}/api/connected-signin/token`,
      async request({ params, checks }) {
        const identity = await exchangeConnectedSignIn(configuration, params, checks);
        return { tokens: { connectedIdentity: identity } as any };
      },
    },
    userinfo: {
      url: `${origin}/api/connected-signin/profile`,
      async request({ tokens }) {
        return (tokens as any).connectedIdentity;
      },
    },
    profile(profile) {
      return {
        id: profile.identity,
        name: profile.result.displayName || profile.result.email,
        email: profile.result.email,
        image: profile.result.pictureUrl || null,
      };
    },
    allowDangerousEmailAccountLinking: false,
  };
}
