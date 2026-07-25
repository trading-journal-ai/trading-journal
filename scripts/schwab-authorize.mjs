#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENV_PATH = path.resolve(".env");

function parseRefreshToken(content) {
  const match = /^SCHWAB_REFRESH_TOKEN\s*=\s*(.*)$/m.exec(content);
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

function refreshToken() {
  try {
    return parseRefreshToken(fs.readFileSync(ENV_PATH, "utf8"));
  } catch {
    return "";
  }
}

function isSensitiveOutput(line) {
  return /(?:[?&]code=|refresh[_-]?token|access[_-]?token)/i.test(line);
}

function pipeRedacted(stream, destination) {
  let buffered = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffered += chunk;
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";
    for (const line of lines) {
      if (!isSensitiveOutput(line)) destination.write(`${line}\n`);
    }
  });
  stream.on("end", () => {
    if (buffered && !isSensitiveOutput(buffered)) destination.write(`${buffered}\n`);
  });
}

async function helperPath() {
  const entryUrl = import.meta.resolve("schwab-client-js");
  const entryPath = fileURLToPath(entryUrl);
  return path.resolve(path.dirname(entryPath), "../bin/schwab-authorize.js");
}

async function run() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error("Journal .env is missing. Follow docs/setup/SCHWAB_SETUP.md first.");
  }

  const helper = await helperPath();
  if (!fs.existsSync(helper)) {
    throw new Error("Schwab authorization helper is unavailable. Run npm install.");
  }

  const before = refreshToken();
  console.log("Opening Schwab authorization in your browser…");
  console.log("The updated refresh token will stay in this Journal's gitignored .env.");

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [helper], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    pipeRedacted(child.stdout, process.stdout);
    pipeRedacted(child.stderr, process.stderr);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Authorization stopped by ${signal}.`));
      else resolve(code ?? 1);
    });
  });

  if (exitCode !== 0) {
    throw new Error(`Schwab authorization exited with code ${exitCode}.`);
  }

  const after = refreshToken();
  if (!after || after === before) {
    throw new Error(
      "Authorization did not replace SCHWAB_REFRESH_TOKEN. Complete Schwab consent and try again.",
    );
  }

  fs.chmodSync(ENV_PATH, 0o600);
  console.log("Schwab authorization updated successfully. Restart the Journal if it is running.");
}

run().catch((error) => {
  console.error(`Authorization failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
