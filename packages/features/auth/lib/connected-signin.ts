import { Cap, requirePramaan, unavailableMessage, type Pramaan } from "@scheduling/pramaan";

type Configuration = {
  connectionRef?: string;
  providerKey?: string;
  authorizationUrl?: string;
  clientId?: string;
  redirectUri: string;
};
export function signInConfiguration(origin: string): Configuration {
  return {
    connectionRef: process.env.PRAMAAN_SIGNIN_CONNECTION_REF,
    providerKey: process.env.PRAMAAN_SIGNIN_PRODUCT,
    authorizationUrl: process.env.PRAMAAN_SIGNIN_AUTHORIZATION_URL,
    clientId: process.env.PRAMAAN_SIGNIN_CLIENT_ID,
    redirectUri: `${origin}/api/auth/callback/connected`,
  };
}
export function hasConnectedSignIn(configuration: Configuration) {
  return Boolean(
    configuration.connectionRef ||
      (configuration.providerKey && configuration.authorizationUrl && configuration.clientId)
  );
}
export async function startConnectedSignIn(
  configuration: Configuration,
  params: URLSearchParams,
  client?: Pramaan
) {
  try {
    const state = params.get("state") || "";
    const nonce = params.get("nonce") || "";
    const codeChallenge = params.get("code_challenge") || "";
    if (state.length < 22 || nonce.length < 22 || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge))
      throw new Error("Missing sign-in checks.");
    // Require configuration before redirecting, including the application key.
    const platform = client || requirePramaan();
    if (configuration.connectionRef) {
      const result = (await platform.call(Cap.authEnterpriseStart, {
        connectionRef: configuration.connectionRef,
        redirectUri: configuration.redirectUri,
        state,
        nonce,
        codeChallenge,
      })) as { authorizationUrl?: string };
      if (!result.authorizationUrl) throw new Error("Missing authorization link.");
      return result.authorizationUrl;
    }
    if (!hasConnectedSignIn(configuration)) throw new Error("Sign-in is not configured.");
    const target = new URL(configuration.authorizationUrl!);
    if (target.protocol !== "https:") throw new Error("Sign-in needs a secure authorization address.");
    for (const [name, value] of Object.entries({
      client_id: configuration.clientId!,
      redirect_uri: configuration.redirectUri,
      response_type: "code",
      scope: "openid profile email",
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }))
      target.searchParams.set(name, value);
    return target.toString();
  } catch (error) {
    throw new Error(unavailableMessage(error));
  }
}
export type ConnectedIdentity = {
  providerKey: string;
  subjectId: string;
  emailVerified: boolean;
  email?: string;
  displayName?: string;
  pictureUrl?: string;
};
export async function exchangeConnectedSignIn(
  configuration: Configuration,
  returned: { code?: string; state?: string },
  checks: { state?: string; nonce?: string; code_verifier?: string },
  client?: Pramaan
) {
  if (
    !returned.code ||
    !returned.state ||
    returned.state !== checks.state ||
    !checks.nonce ||
    !checks.code_verifier
  )
    throw new Error("Sign-in expired or could not be verified. Start again.");
  try {
    const result = (await (client || requirePramaan()).call(Cap.authSocialExchange, {
      providerKey: configuration.connectionRef ? "enterprise" : configuration.providerKey,
      code: returned.code,
      redirectUri: configuration.redirectUri,
      pkceVerifier: checks.code_verifier,
      expectedNonce: checks.nonce,
      ...(configuration.connectionRef
        ? { connectionRef: configuration.connectionRef, state: returned.state }
        : {}),
    })) as ConnectedIdentity;
    if (!result.subjectId || result.emailVerified !== true || !result.email)
      throw new Error("The sign-in address could not be verified.");
    const identity = JSON.stringify([configuration.connectionRef || result.providerKey, result.subjectId]);
    return { identity, result };
  } catch (error) {
    throw new Error(unavailableMessage(error));
  }
}
