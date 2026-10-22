import { showToast } from "@scheduling/ui/components/toast";
export async function copyBookingLink(destinationUrl: string) {
  let link = destinationUrl, message = "";
  try {
    const r = await fetch("/api/short-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", destinationUrl }) });
    const data = await r.json(); if (r.ok && typeof data.shortLink === "string") link = data.shortLink;
    message = data.message || "";
  } catch { message = "Short links could not be confirmed. The original URL is copied; check the connected app before further action."; }
  try { await navigator.clipboard.writeText(link); showToast(message || "Link copied!", message ? "warning" : "success"); }
  catch { showToast("The link could not be copied. Use the booking preview to copy its URL.", "error"); }
}
