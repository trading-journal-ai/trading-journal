#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";

const DEMO_DB = "data/tradingjournaldemo.db";
const LOCAL_DB = "data/journal.db";
const ENV_PATH = ".env.local";
const MASSIVE_TEST_URL = "https://api.massive.com/v3/reference/tickers/AAPL";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with status ${result.status}`);
  }
}

function question(prompt) {
  const rl = readline.createInterface({ input, output });
  return new Promise((resolveQuestion) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolveQuestion(answer.trim());
    });
  });
}

function secretQuestion(prompt) {
  if (!input.isTTY || !output.isTTY) return question(prompt);

  return new Promise((resolveQuestion) => {
    output.write(prompt);
    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    let value = "";

    function cleanup() {
      input.setRawMode(false);
      input.off("keypress", onKeypress);
      output.write("\n");
    }

    function onKeypress(str, key) {
      if (key?.name === "return") {
        cleanup();
        resolveQuestion(value.trim());
        return;
      }
      if (key?.name === "escape" || (key?.ctrl && key.name === "c")) {
        cleanup();
        process.exit(1);
      }
      if (key?.name === "backspace") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          output.write("\b \b");
        }
        return;
      }
      if (str && !key?.ctrl && !key?.meta) {
        value += str;
        output.write("*");
      }
    }

    input.on("keypress", onKeypress);
  });
}

function parseEnvFile(path) {
  if (!existsSync(path)) return new Map();
  const values = new Map();
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    values.set(match[1], match[2].replace(/^['"]|['"]$/g, ""));
  }
  return values;
}

function writeLocalEnv({ dbPath, massiveKey }) {
  const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8").split(/\r?\n/) : [];
  const managed = new Set(["DB_PATH", "MASSIVE_API_KEY", "DEMO_READ_ONLY", "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"]);
  const kept = existing.filter((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    return !match || !managed.has(match[1]);
  });
  const lines = [
    ...kept.filter((line) => line.trim() !== ""),
    "",
    "# Local Trading Journal setup",
    `DB_PATH=${dbPath}`,
    "DEMO_READ_ONLY=false",
    massiveKey ? `MASSIVE_API_KEY=${massiveKey}` : "# MASSIVE_API_KEY=",
    "",
    "# Turso is intentionally left unset for local SQLite mode.",
    "# TURSO_DATABASE_URL=",
    "# TURSO_AUTH_TOKEN=",
    "",
  ];
  writeFileSync(ENV_PATH, lines.join("\n"));
}

async function testMassiveKey(apiKey) {
  const url = new URL(MASSIVE_TEST_URL);
  url.searchParams.set("apiKey", apiKey);
  try {
    const response = await fetch(url);
    if (response.ok) return { ok: true };
    const text = await response.text();
    return { ok: false, message: `${response.status} ${response.statusText}: ${text.slice(0, 160)}` };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

function ensureDataDir(dbPath) {
  mkdirSync(dirname(resolve(dbPath)), { recursive: true });
}

async function setupLocal() {
  console.log("\nTrading Journal local setup");
  console.log("This installs project dependencies and sets up a local database inside this folder.");
  console.log("It does not install anything globally.\n");

  const existingEnv = parseEnvFile(ENV_PATH);
  const defaultKey = existingEnv.get("MASSIVE_API_KEY")?.trim();
  const useDemoAnswer = await question("Use the included demo data with sample notes? [Y/n] ");
  const useDemo = !/^n(o)?$/i.test(useDemoAnswer);
  const dbPath = useDemo ? DEMO_DB : LOCAL_DB;

  console.log("\nMassive provides the candle data for charts. The free plan is enough for local testing.");
  const keyPrompt = defaultKey
    ? "Massive API key already found. Press Enter to keep it, or paste a new key: "
    : "Paste a Massive API key, or press Enter to skip charts for now: ";
  const keyAnswer = await secretQuestion(keyPrompt);
  const massiveKey = keyAnswer || defaultKey || "";

  if (massiveKey) {
    output.write("Testing Massive key... ");
    const result = await testMassiveKey(massiveKey);
    if (result.ok) {
      console.log("ok");
    } else {
      console.log("could not confirm");
      console.log(`Massive key was saved, but the test request failed: ${result.message}`);
    }
  }

  ensureDataDir(dbPath);
  writeLocalEnv({ dbPath, massiveKey });
  console.log(`\nSaved local settings to ${ENV_PATH}`);
  console.log(`Using SQLite database: ${dbPath}\n`);

  run("npm", ["run", "db:migrate"], { env: { DB_PATH: dbPath } });

  if (useDemo) {
    run("npm", ["run", "demo:paper"]);
    console.log("\nDemo trades and journal notes are ready.");
  } else {
    console.log("\nEmpty local journal is ready. Use Import in the app when you have a broker CSV.");
  }
}

function resetDemo() {
  ensureDataDir(DEMO_DB);
  writeLocalEnv({ dbPath: DEMO_DB, massiveKey: parseEnvFile(ENV_PATH).get("MASSIVE_API_KEY") ?? "" });
  run("npm", ["run", "db:migrate"], { env: { DB_PATH: DEMO_DB } });
  run("npm", ["run", "demo:paper"]);
  console.log("\nReset local demo data in data/tradingjournaldemo.db.");
}

try {
  if (process.argv.includes("--reset-demo")) {
    resetDemo();
  } else {
    await setupLocal();
  }
} catch (error) {
  console.error(`\nSetup failed: ${error.message}`);
  process.exit(1);
}
