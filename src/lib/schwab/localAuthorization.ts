import "server-only";

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { clearSchwabClientCache } from "./client";

const ENV_PATH = path.resolve(".env");
const AUTHORIZATION_SCRIPT = path.resolve("scripts/schwab-authorize.mjs");

let authorizationInFlight: Promise<void> | null = null;

export class SchwabLocalAuthorizationError extends Error {
  readonly kind: "setup_required" | "failed";

  constructor(kind: "setup_required" | "failed", message: string) {
    super(message);
    this.name = "SchwabLocalAuthorizationError";
    this.kind = kind;
  }
}

function envValue(content: string, key: string) {
  const match = new RegExp(`^${key}\\s*=\\s*(.*)$`, "m").exec(content);
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

function readLocalEnv() {
  try {
    return fs.readFileSync(ENV_PATH, "utf8");
  } catch {
    throw new SchwabLocalAuthorizationError(
      "setup_required",
      "Schwab setup is incomplete for this Journal.",
    );
  }
}

async function runAuthorization() {
  const beforeContent = readLocalEnv();
  const appKey = process.env.SCHWAB_APP_KEY?.trim()
    || envValue(beforeContent, "SCHWAB_APP_KEY");
  const appSecret = process.env.SCHWAB_SECRET?.trim()
    || envValue(beforeContent, "SCHWAB_SECRET");

  if (!appKey || !appSecret) {
    throw new SchwabLocalAuthorizationError(
      "setup_required",
      "Schwab setup is incomplete for this Journal.",
    );
  }
  if (!fs.existsSync(AUTHORIZATION_SCRIPT)) {
    throw new SchwabLocalAuthorizationError(
      "failed",
      "The Journal could not start Schwab authorization.",
    );
  }

  const beforeToken = envValue(beforeContent, "SCHWAB_REFRESH_TOKEN");
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [AUTHORIZATION_SCRIPT], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Authorization stopped by ${signal}.`));
      else resolve(code ?? 1);
    });
  });

  const afterContent = readLocalEnv();
  const afterToken = envValue(afterContent, "SCHWAB_REFRESH_TOKEN");
  if (exitCode !== 0 || !afterToken || afterToken === beforeToken) {
    throw new SchwabLocalAuthorizationError(
      "failed",
      "Schwab authorization did not finish.",
    );
  }

  process.env.SCHWAB_REFRESH_TOKEN = afterToken;
  clearSchwabClientCache();
}

export function authorizeSchwabLocally() {
  if (!authorizationInFlight) {
    authorizationInFlight = runAuthorization().finally(() => {
      authorizationInFlight = null;
    });
  }
  return authorizationInFlight;
}
