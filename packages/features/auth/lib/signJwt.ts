import { SignJWT } from "jose";

import { WEBSITE_URL } from "@scheduling/lib/constants";

const signJwt = async (payload: { email: string }) => {
  const secret = new TextEncoder().encode(process.env.SCHEDULING_ENCRYPTION_KEY);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.email)
    .setIssuedAt()
    .setIssuer(WEBSITE_URL)
    .setAudience(`${WEBSITE_URL}/auth/login`)
    .setExpirationTime("2m")
    .sign(secret);
};

export default signJwt;
