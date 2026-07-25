#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const REQUIRED_KEYS = [
  "SCHWAB_APP_KEY",
  "SCHWAB_SECRET",
  "SCHWAB_REFRESH_TOKEN",
];
const OPTIONAL_KEYS = [
  "SCHWAB_CALLBACK_URL",
  "SCHWAB_ACCOUNT_HASH",
];
const COPY_KEYS = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];
const DEFAULT_CALLBACK_URL = "https://127.0.0.1:5556";

function usage() {
  return [
    "Usage:",
    "  npm run schwab:migrate -- --from /path/to/source.env [--from /fallback.env]",
    "",
    "Copies only Schwab settings into this repository's gitignored .env file.",
    "Existing destination values are preserved. Secret values are never printed.",
  ].join("\n");
}

function argumentValues(name) {
  const values = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
      index += 1;
    }
  }
  return values;
}

function parseEnv(content) {
  const values = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if (
      value.length >= 2
      && ((value.startsWith("\"") && value.endsWith("\""))
        || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

function setEnvValue(content, key, value) {
  const lines = content ? content.split(/\r?\n/) : [];
  const matcher = new RegExp(`^(?:export\\s+)?${key}\\s*=`);
  const index = lines.findIndex((line) => matcher.test(line.trim()));
  const nextLine = `${key}=${value}`;
  if (index >= 0) lines[index] = nextLine;
  else lines.push(nextLine);
  return lines.join("\n").replace(/\n*$/, "\n");
}

const sources = argumentValues("--from").map((value) => path.resolve(value));
if (sources.length === 0 || process.argv.includes("--help")) {
  console.log(usage());
  process.exitCode = sources.length === 0 ? 1 : 0;
} else {
  const sourceValues = new Map();
  for (const source of sources) {
    if (!fs.existsSync(source)) continue;
    const parsed = parseEnv(fs.readFileSync(source, "utf8"));
    for (const key of COPY_KEYS) {
      if (!sourceValues.get(key) && parsed.get(key)) sourceValues.set(key, parsed.get(key));
    }
  }

  const missing = REQUIRED_KEYS.filter((key) => !sourceValues.get(key));
  if (missing.length > 0) {
    throw new Error(`Source environments are missing required settings: ${missing.join(", ")}`);
  }

  if (!sourceValues.get("SCHWAB_CALLBACK_URL")) {
    sourceValues.set("SCHWAB_CALLBACK_URL", DEFAULT_CALLBACK_URL);
  }

  const destination = path.resolve(".env");
  let destinationContent = fs.existsSync(destination)
    ? fs.readFileSync(destination, "utf8")
    : "";
  const existingValues = parseEnv(destinationContent);
  const copied = [];
  const preserved = [];

  for (const key of COPY_KEYS) {
    const sourceValue = sourceValues.get(key);
    if (!sourceValue) continue;
    if (existingValues.get(key)) {
      preserved.push(key);
      continue;
    }
    destinationContent = setEnvValue(destinationContent, key, sourceValue);
    copied.push(key);
  }

  fs.writeFileSync(destination, destinationContent, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(destination, 0o600);
  console.log(`Schwab settings migrated to ${destination}.`);
  console.log(`Copied: ${copied.join(", ") || "none"}.`);
  if (preserved.length > 0) console.log(`Preserved existing: ${preserved.join(", ")}.`);
  console.log("Secret values were not printed.");
}
