#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";

const DEMO_DB = "data/tradingjournaldemo.db";
const LOCAL_DB = "data/journal.db";
const ENV_PATH = ".env.local";
const MASSIVE_TEST_URL = "https://api.massive.com/v3/reference/tickers/AAPL";
const colors =
  output.isTTY
    ? {
        bold: "\x1b[1m",
        dim: "\x1b[2m",
        green: "\x1b[32m",
        cyan: "\x1b[36m",
        blue: "\x1b[34m",
        yellow: "\x1b[33m",
        red: "\x1b[31m",
        reset: "\x1b[0m",
      }
    : {
        bold: "",
        dim: "",
        green: "",
        cyan: "",
        blue: "",
        yellow: "",
        red: "",
        reset: "",
      };
const INDENT = "     ";
const INSET_RULE = `${INDENT}-------------------------------------------------------`;

function heading(text) {
  console.log(`${INDENT}${colors.bold}${text}${colors.reset}`);
}

function detail(text) {
  console.log(`${INDENT}${colors.dim}${text}${colors.reset}`);
}

function cyan(text) {
  console.log(`${colors.cyan}${text}${colors.reset}`);
}

function success(text) {
  console.log(`${INDENT}${colors.green}${text}${colors.reset}`);
}

function warn(text) {
  console.log(`${INDENT}${colors.yellow}${text}${colors.reset}`);
}

function divider() {
  cyan(INSET_RULE);
}

function quietStep(label, fn) {
  return withLoader(`${INDENT}${colors.dim}${label}...${colors.reset}`, fn);
}

async function withLoader(label, fn) {
  if (!output.isTTY) {
    output.write(label);
    try {
      await fn();
      console.log(` ${colors.green}done${colors.reset}`);
    } catch (error) {
      console.log(` ${colors.red}failed${colors.reset}`);
      throw error;
    }
    return;
  }

  const frames = ["/", "-", "\\", "|"];
  let index = 0;
  output.write(`${label} ${colors.dim}${frames[index]}${colors.reset}\n\n`);
  const timer = setInterval(() => {
    index = (index + 1) % frames.length;
    output.write(`\x1b[2A\r${label} ${colors.dim}${frames[index]}${colors.reset}\x1b[K\x1b[2B`);
  }, 160);

  try {
    await fn();
    clearInterval(timer);
    output.write(`\x1b[2A\r${label} ${colors.green}done${colors.reset}\x1b[K\x1b[2B`);
  } catch (error) {
    clearInterval(timer);
    output.write(`\x1b[2A\r${label} ${colors.red}failed${colors.reset}\x1b[K\x1b[2B\n\n`);
    throw error;
  }
}

function reservePromptSpace() {
  if (!input.isTTY || !output.isTTY) return;
  output.write("\n\n\x1b[2A");
}

function clearPromptSpace() {
  if (!input.isTTY || !output.isTTY) return;
  output.write("\x1b[2B");
}

function question(prompt) {
  const rl = readline.createInterface({ input, output });
  return new Promise((resolveQuestion) => {
    reservePromptSpace();
    rl.question(prompt, (answer) => {
      rl.close();
      clearPromptSpace();
      resolveQuestion(answer.trim());
    });
  });
}

async function chooseOption(prompt, allowedOptions = ["1", "2"]) {
  const allowed = new Set(allowedOptions);
  while (true) {
    const answer = await question(prompt);
    if (allowed.has(answer)) return answer;
    warn(`Choose ${allowedOptions.join(" or ")}.`);
  }
}

function secretQuestion(prompt) {
  if (!input.isTTY || !output.isTTY) return question(prompt);

  return new Promise((resolveQuestion) => {
    let value = "";
    const wasRaw = input.isRaw;

    const finish = () => {
      input.off("data", onData);
      input.setRawMode(wasRaw);
      input.pause();
      output.write("\n");
      clearPromptSpace();
      resolveQuestion(value.trim());
    };

    const cancel = () => {
      input.off("data", onData);
      input.setRawMode(wasRaw);
      output.write("\n");
      process.exit(130);
    };

    const onData = (chunk) => {
      const text = chunk.toString("utf8");
      for (const char of text) {
        if (char === "\u0003") cancel();
        if (char === "\r" || char === "\n") {
          finish();
          return;
        }
        if (char === "\u007f" || char === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            output.write("\b \b");
          }
          continue;
        }
        value += char;
        output.write("*");
      }
    };

    reservePromptSpace();
    output.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

function runAsync(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      stdio: options.quiet ? ["ignore", "pipe", "pipe"] : "inherit",
      encoding: "utf8",
      env: { ...process.env, ...options.env },
    });
    const chunks = [];

    if (options.quiet) {
      child.stdout?.on("data", (chunk) => chunks.push(chunk));
      child.stderr?.on("data", (chunk) => chunks.push(chunk));
    }

    child.on("error", rejectRun);
    child.on("close", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      const outputText = chunks.join("").trim();
      if (outputText) console.error(outputText);
      rejectRun(new Error(`${command} ${args.join(" ")} exited with status ${code}`));
    });
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
  const managed = new Set([
    "DB_PATH",
    "MASSIVE_API_KEY",
    "DEMO_READ_ONLY",
    // Legacy — Turso is no longer used; listed so setup strips any stale lines.
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
  ]);
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
    "# Optional AI coach model. Keep real keys local and never commit them.",
    "# OPENAI_API_KEY=",
    "# OPENAI_MODEL=gpt-5.5",
    "",
  ];
  const nextContents = lines.join("\n");
  if (existsSync(ENV_PATH) && readFileSync(ENV_PATH, "utf8") !== nextContents) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    copyFileSync(ENV_PATH, `${ENV_PATH}.backup-${timestamp}`);
  }
  writeFileSync(ENV_PATH, nextContents);
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
  console.log(`${INDENT}${colors.cyan}${colors.bold}Step 2 of 3: Set up your journal${colors.reset}`);
  detail("Type 1 or 2, then press Enter.");
  console.log("");

  heading("Choose a starting point");
  console.log("");
  console.log(`${INDENT}${colors.bold}1.${colors.reset} Install Trading Journal Demo`);
  detail("   For previewing the app with demo trades and notes.");
  console.log("");
  console.log(`${INDENT}${colors.bold}2.${colors.reset} Install Trading Journal`);
  detail("   Import your own broker CSV.");
  console.log("");

  const existingEnv = parseEnvFile(ENV_PATH);
  const defaultKey = existingEnv.get("MASSIVE_API_KEY")?.trim();
  const modeAnswer = await chooseOption(`${INDENT}Choose an option (1 or 2): `);
  const useDemo = modeAnswer === "1";
  const dbPath = useDemo ? DEMO_DB : LOCAL_DB;
  console.log("");
  success(useDemo ? "Demo mode selected." : "Local data mode selected.");

  console.log("");
  divider();
  console.log("");
  heading("Chart data");
  console.log(`${INDENT}Massive provides candle data for charts.`);
  console.log(`${INDENT}Sign up for your free Massive key at https://www.massive.com/`);
  warn("Optional - skip this and uncached charts will not fetch candles.");
  console.log("");
  let massiveKey = defaultKey || "";
  console.log(`${INDENT}${colors.bold}1.${colors.reset} Add chart data with a Massive API key`);
  console.log(`${INDENT}${colors.bold}2.${colors.reset} Skip chart data for now`);
  console.log("");
  const chartAnswer = await chooseOption(`${INDENT}Choose an option (1 or 2): `);
  const wantsKey = chartAnswer === "1";

  if (wantsKey) {
    const keyPrompt = defaultKey
      ? `${INDENT}Existing key found. Press Enter to keep it, or paste a new key: `
      : `${INDENT}Enter your Massive API key: `;
    const keyAnswer = await secretQuestion(keyPrompt);
    massiveKey = keyAnswer || defaultKey || "";
    if (!massiveKey) {
      warn("No key entered. Chart data skipped for now.");
    }
  } else {
    massiveKey = "";
    success("Chart data skipped for now.");
  }

  if (massiveKey) {
    output.write(`${INDENT}Testing Massive key... `);
    const result = await testMassiveKey(massiveKey);
    if (result.ok) {
      console.log(`${colors.green}ok${colors.reset}`);
    } else {
      console.log(`${colors.yellow}could not confirm${colors.reset}`);
      detail(`Massive key was saved, but the test request failed: ${result.message}`);
    }
  }

  ensureDataDir(dbPath);
  writeLocalEnv({ dbPath, massiveKey });
  console.log("");
  divider();
  console.log("");
  heading("Local database");
  detail(`Settings: ${ENV_PATH}`);
  detail(`Database: ${dbPath}`);

  await quietStep("Applying database migrations", () => {
    return runAsync("npm", ["run", "--silent", "db:migrate"], { env: { DB_PATH: dbPath }, quiet: true });
  });

  if (useDemo) {
    await quietStep("Loading demo trades and notes", () => {
      return runAsync("npm", ["run", "--silent", "demo:paper"], { quiet: true });
    });
    console.log("");
    success("Demo trades and journal notes are ready.");
  } else {
    console.log("");
    success("Empty local journal is ready.");
    detail("Use Import in the app when you have a broker CSV.");
  }
  console.log("");
  divider();
}

async function resetDemo() {
  const { snapshotBeforeDestroy } = await import("./db-guard.mjs");
  snapshotBeforeDestroy(DEMO_DB, "reset this database to demo fixtures");
  ensureDataDir(DEMO_DB);
  writeLocalEnv({ dbPath: DEMO_DB, massiveKey: parseEnvFile(ENV_PATH).get("MASSIVE_API_KEY") ?? "" });
  await quietStep("Applying database migrations", () => {
    return runAsync("npm", ["run", "--silent", "db:migrate"], { env: { DB_PATH: DEMO_DB }, quiet: true });
  });
  await quietStep("Loading demo trades and notes", () => {
    return runAsync("npm", ["run", "--silent", "demo:paper"], { quiet: true });
  });
  console.log("");
  success("Reset local demo data in data/tradingjournaldemo.db.");
}

async function main() {
  if (process.argv.includes("--reset-demo")) {
    await resetDemo();
    return;
  }
  await setupLocal();
}

main().catch((error) => {
  console.error(`\nSetup failed: ${error.message}`);
  process.exit(1);
});
