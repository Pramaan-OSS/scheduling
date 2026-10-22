import { IS_PRODUCTION } from "@scheduling/lib/constants";
import { WEBAPP_URL } from "@scheduling/lib/constants";

import { buildNonce } from "./buildNonce";

function getCspPolicy(nonce: string) {
  //TODO: Do we need to explicitly define it in turbo.json
  const CSP_POLICY = process.env.CSP_POLICY;

  // Note: "non-strict" policy only allows inline styles otherwise it's the same as "strict"
  // We can remove 'unsafe-inline' from style-src when we add nonces to all style tags
  // Maybe see how @next-safe/middleware does it if it's supported.
  const useNonStrictPolicy = CSP_POLICY === "non-strict";

  // We add WEBAPP_URL to img-src because of booking pages, which end up loading images from app.scheduling.local on scheduling.local
  return `
	  default-src 'self' ${IS_PRODUCTION ? "" : "data:"};
	  script-src ${
      IS_PRODUCTION
        ? // 'self' 'unsafe-inline' https: added for Browsers not supporting strict-dynamic
          `'nonce-${nonce}' 'strict-dynamic' 'self' 'unsafe-inline' https:`
        : // Note: We could use 'strict-dynamic' with 'nonce-..' instead of unsafe-inline but there are some streaming related scripts that get blocked(because they don't have nonce on them). It causes a really frustrating full page error model by Next.js to show up sometimes
          "'unsafe-inline' 'unsafe-eval' https: http:"
    };
    object-src 'none';
    base-uri 'none';
	  child-src 'self';
	  style-src 'self' ${
      IS_PRODUCTION ? (useNonStrictPolicy ? "'unsafe-inline'" : "") : "'unsafe-inline'"
    };
	  font-src 'self';
	  img-src 'self' ${WEBAPP_URL} data:;
    connect-src 'self'
	`;
}

export function getCspNonce() {
  const nonce = buildNonce(crypto.getRandomValues(new Uint8Array(22)));

  return nonce;
}

export function getCspHeader({ shouldEnforceCsp, nonce }: { shouldEnforceCsp: boolean; nonce: string }) {
  const cspHeaderName = shouldEnforceCsp
    ? "Content-Security-Policy"
    : /*"Content-Security-Policy-Report-Only"*/ null;

  if (!cspHeaderName) {
    return null;
  }

  const cspHeaderValue = getCspPolicy(nonce)
    .replace(/\s{2,}/g, " ")
    .trim();

  return { name: cspHeaderName, value: cspHeaderValue };
}
