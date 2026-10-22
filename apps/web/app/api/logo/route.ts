import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET(request: Request) { const type = new URL(request.url).searchParams.get("type"); const filename = !type || type === "logo" ? "scheduling-logo.svg" : "scheduling-icon.svg"; return new Response(await readFile(path.join(process.cwd(), "public", filename), "utf8"), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } }); }
