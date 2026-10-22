// Only fixed explanations may enter startup output or saved setup state.
export function setupRefusalReason(error) {
  if (error?.code === "invalid_request") return /Idempotency-Key/i.test(error.message || "") ? "request_key" : "invalid_request";
  if ((error?.code === "unauthorized" || error?.status === 401)) return "unauthorized";
  if ((error?.code === "forbidden" || error?.status === 403)) return "forbidden";
  if (error?.code === "upstream_unavailable" || error?.code === "not_found") return "unavailable";
  return "unconfirmed";
}
export function setupRefusalText(reason) {
  const text = ({
    request_key: "a required request identifier (Idempotency-Key header) is missing",
    invalid_request: "the server refused the setup settings",
    unauthorized: "the configured Pramaan key was refused",
    forbidden: "this project is not allowed to perform setup",
    unavailable: "the service is not available yet",
    unconfirmed: "the setup result could not be confirmed",
  })[reason];
  return typeof text === "string" ? text : "the setup result could not be confirmed";
}
export function managedAuthMessage(reason) {
  return reason === "unavailable" || !reason
    ? "Managed sign-in is not available yet; local sign-in remains available."
    : `Managed sign-in setup did not finish: ${setupRefusalText(reason)}. Local sign-in remains available.`;
}
