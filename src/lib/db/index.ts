import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { isDemoReadOnly } from "@/lib/demoMode";
import * as schema from "./schema";

// Hosted demo: ship the data with the app instead of phoning a remote Turso DB
// over the network on every request. When DEMO_DB_PATH points at a bundled
// SQLite file, read it locally. Serverless bundles are read-only but SQLite
// needs to write its -wal/-shm sidecars, so copy the file into the writable
// /tmp dir once per cold start and read from there. Returns undefined when no
// bundled demo DB is configured, so callers fall back to Turso / local file.
function bundledDemoUrl(): string | undefined {
  const bundled = process.env.DEMO_DB_PATH;
  if (!isDemoReadOnly() || !bundled) return undefined;

  const src = resolve(bundled);
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

  if (process.env.TURSO_DATABASE_URL) {
    if (!process.env.TURSO_AUTH_TOKEN) {
      throw new Error("TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is set.");
    }
    return process.env.TURSO_DATABASE_URL;
  }

  const dbPath = resolve(process.env.DB_PATH ?? "data/journal.db");
  mkdirSync(dirname(dbPath), { recursive: true });
  return pathToFileURL(dbPath).href;
}

const url = databaseUrl();
const usingTurso = url === process.env.TURSO_DATABASE_URL;

const client = createClient({
  url,
  authToken: usingTurso ? process.env.TURSO_AUTH_TOKEN : undefined,
});

export const db = drizzle(client, { schema });
export { schema };
