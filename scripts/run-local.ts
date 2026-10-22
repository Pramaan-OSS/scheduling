import { spawn } from "node:child_process";
import { pramaanFromEnv } from "../packages/pramaan/src/index";
import { databaseForStart, DatabaseSetupError } from "./managed-database";
import { authForStart } from "./managed-auth";
import { resolve } from "node:path";
import { databaseRedactor, privateDatabaseOutput } from "./database-output";
import { privateFile } from "./private-state";

async function main() {
  const platform = pramaanFromEnv();
  await authForStart(process.cwd(), platform, process.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000");
  process.env.SCHEDULING_RUNTIME_DIR = resolve(".runtime");
  const chosen = await databaseForStart(process.cwd(), platform, {
    connectionString: process.env.DATABASE_URL || "", directConnectionString: process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL || "",
  });
  process.env.DATABASE_URL = chosen.connectionString;
  process.env.DATABASE_DIRECT_URL = chosen.directConnectionString;
  // Subprocess diagnostics can contain private database addresses. Keep them in a private runtime file.
  const { openSync, closeSync, writeSync } = await import("node:fs");
  const log = openSync(".runtime/database-start.log", "a", 0o600);
  privateFile(".runtime/database-start.log");
  const redact = databaseRedactor([chosen.connectionString, chosen.directConnectionString]);
  const migrated = await new Promise<number | null>((resolve) => {
    const child = spawn(process.execPath, [".yarn/releases/yarn-4.12.0.cjs", "prisma", "migrate", "deploy"], { stdio: ["ignore", "pipe", "pipe"] });
    privateDatabaseOutput(child.stdout!, redact, line => writeSync(log, line));
    privateDatabaseOutput(child.stderr!, redact, line => writeSync(log, line));
    child.on("error", () => resolve(1)); child.on("close", resolve);
  });
  closeSync(log);
  if (migrated !== 0) throw new DatabaseSetupError("Database preparation did not finish. See the private .runtime/database-start.log.");
  const child = spawn(process.execPath, [".yarn/releases/yarn-4.12.0.cjs", "workspace", "@scheduling/web", "start", "-H", "0.0.0.0"], { stdio: ["inherit", "pipe", "pipe"] });
  privateDatabaseOutput(child.stdout!, redact, line => process.stdout.write(line));
  privateDatabaseOutput(child.stderr!, redact, line => process.stderr.write(line));
  for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => child.kill(signal));
  child.on("exit", code => process.exit(code ?? 1)); child.on("error", () => process.exit(1));
}
main().catch(error => { console.error(error instanceof DatabaseSetupError ? error.message : "Startup could not safely prepare its database. Check the saved private settings before retrying."); process.exit(1); });
