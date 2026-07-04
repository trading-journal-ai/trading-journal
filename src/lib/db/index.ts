import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { isDemoReadOnly } from "@/lib/demoMode";
import * as schema from "./schema";

// The demo DB ships committed at samples/demo (data is built from committed
// fixtures — see samples/demo/trades.csv). This is the default so read-only
// demo mode always finds it even if DEMO_DB_PATH is unset — a missing env var
// must never fall through to a nonexistent DB and 500.
const DEFAULT_DEMO_DB_PATH = "samples/demo/tradingjournaldemo.db";

// Hosted demo: ship the data with the app and read it locally. Serverless
// bundles are read-only but SQLite needs to write its -wal/-shm sidecars, so
// copy the file into the writable /tmp dir once per cold start and read from
// there. Returns undefined only outside read-only demo mode (local runs), so
// those fall back to the local file.
function bundledDemoUrl(): string | undefined {
  if (!isDemoReadOnly()) return undefined;

  const src = resolve(process.env.DEMO_DB_PATH ?? DEFAULT_DEMO_DB_PATH);
  if (!existsSync(src)) return undefined;

  const runtimeDir = process.env.DEMO_DB_RUNTIME_DIR ?? (existsSync("/tmp") ? "/tmp" : dirname(src));
  const dest = resolve(runtimeDir, "demo.db");
  try {
    if (!existsSync(dest)) copyFileSync(src, dest);
    return pathToFileURL(dest).href;
  } catch {
    // Writable copy failed (e.g. fully read-only FS) — read the bundle directly.
    return pathToFileURL(src).href;
  }
}

function databaseUrl() {
  const demoUrl = bundledDemoUrl();
  if (demoUrl) return demoUrl;

  const dbPath = resolve(process.env.DB_PATH ?? "data/journal.db");
  mkdirSync(dirname(dbPath), { recursive: true });
  return pathToFileURL(dbPath).href;
}

const client = createClient({ url: databaseUrl() });

export const db = drizzle(client, { schema });
export { schema };
