import type { Readable } from "node:stream";

export function databaseRedactor(addresses: string[]) {
  const secrets = new Set(addresses.filter(Boolean));
  for (const address of addresses) {
    try { const url = new URL(address); if (url.password) secrets.add(decodeURIComponent(url.password)); if (!['database', 'localhost', '127.0.0.1'].includes(url.hostname)) secrets.add(url.hostname); } catch { /* Invalid addresses are refused before database startup. */ }
  }
  return (line: string) => {
    for (const secret of [...secrets].sort((a, b) => b.length - a.length)) line = line.replaceAll(secret, "[private database]");
    return line;
  };
}
export function privateDatabaseOutput(stream: Readable, redact: (line: string) => string, write: (line: string) => void) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (part: string) => {
    pending += part;
    let end: number;
    while ((end = pending.indexOf("\n")) >= 0) { const line = pending.slice(0, end + 1); write(line.length > 32768 ? "Database diagnostic omitted.\n" : redact(line)); pending = pending.slice(end + 1); }
    if (pending.length > 32768) { pending = ""; stream.removeAllListeners("data"); stream.on("data", () => {}); write("Database diagnostics omitted.\n"); }
  });
  stream.on("end", () => { if (pending) write(redact(pending)); pending = ""; });
}
