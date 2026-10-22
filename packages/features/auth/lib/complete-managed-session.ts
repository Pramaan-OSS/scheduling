/** Finish the one-time social return before asking the managed backend for a token. */
export async function completeManagedSession(
  authUrl: string,
  pageUrl: string,
  replaceUrl: (url: string) => void,
  request: typeof fetch = fetch
) {
  const page = new URL(pageUrl);
  const verifier = page.searchParams.get("neon_auth_session_verifier");
  if (!verifier) return;
  const endpoint = new URL(`${authUrl.replace(/\/$/, "")}/get-session`);
  endpoint.searchParams.set("neon_auth_session_verifier", verifier);
  const response = await request(endpoint, { credentials: "include", cache: "no-store" });
  if (!response.ok || !(await response.json())?.session) throw new Error("Managed sign-in could not be verified.");
  page.searchParams.delete("neon_auth_session_verifier");
  replaceUrl(`${page.pathname}${page.search}${page.hash}`);
}
