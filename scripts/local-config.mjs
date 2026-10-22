import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function configure(directory, selectedPort) {
  const file = resolve(directory, ".env");
  let text = readFileSync(existsSync(file) ? file : resolve(directory, ".env.example"), "utf8");
  for (const [name, bytes] of [["NEXTAUTH_SECRET", 32], ["SCHEDULING_ENCRYPTION_KEY", 16], ["POSTGRES_PASSWORD", 24]]) {
    const expression = new RegExp(`^${name}=(.*)$`, "m"), match = text.match(expression);
    if (match && match[1].trim() && !["''", '\"\"'].includes(match[1].trim())) continue;
    const line = `${name}=${randomBytes(bytes).toString("hex")}`;
    text = match ? text.replace(expression, () => line) : `${text.trimEnd()}\n${line}\n`;
  }
  const oldPort = text.match(/^SCHEDULING_LOCAL_PORT=(\d+)$/m)?.[1] || "3000";
  const port = selectedPort || oldPort;
  if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) throw new Error("Choose a valid local port.");
  for (const name of ["NEXT_PUBLIC_WEBAPP_URL", "NEXT_PUBLIC_WEBSITE_URL", "NEXTAUTH_URL"]) {
    const expression = new RegExp(`^${name}=(.*)$`, "m"), match = text.match(expression);
    if (match && /^http:\/\/(localhost|127\.0\.0\.1):\d+(\/api\/auth)?$/.test(match[1])) text = text.replace(expression, () => `${name}=http://localhost:${port}${name === "NEXTAUTH_URL" ? "/api/auth" : ""}`);
  }
  text = /^SCHEDULING_LOCAL_PORT=/m.test(text) ? text.replace(/^SCHEDULING_LOCAL_PORT=.*$/m, `SCHEDULING_LOCAL_PORT=${port}`) : `${text.trimEnd()}\nSCHEDULING_LOCAL_PORT=${port}\n`;
  writeFileSync(file, text, { mode: 0o600 }); chmodSync(file, 0o600);
  console.log("Local secrets are saved in .env. Keep that file private.");
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  if (process.argv[2] === "--print-port") console.log(readFileSync(".env", "utf8").match(/^SCHEDULING_LOCAL_PORT=(\d+)$/m)?.[1] || "3000");
  else configure(".", process.argv[2] === "--port" ? process.argv[3] : undefined);
}
