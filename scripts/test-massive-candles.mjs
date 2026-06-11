#!/usr/bin/env node

import { readFileSync } from "node:fs";

const DEFAULTS = {
  symbol: "AIFF",
  date: "2026-03-04",
  time: "06:34:07",
  adjusted: "false",
  limit: "50000",
  auth: "query",
  baseUrl: "https://api.massive.com",
  requireSession: "pre",
};

function loadEnvFile(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
}

function loadLocalEnv() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

function usage() {
  console.log(`
Usage:
  MASSIVE_API_KEY=... node scripts/test-massive-candles.mjs [options]

Options:
  --symbol SYMBOL       Stock ticker to test. Default: ${DEFAULTS.symbol}
  --date YYYY-MM-DD     ET trading date to request. Default: ${DEFAULTS.date}
  --time HH:MM[:SS]     ET trade time to check nearest candle. Default: ${DEFAULTS.time}
  --adjusted true|false Whether to request split-adjusted prices. Default: ${DEFAULTS.adjusted}
  --limit N             Massive aggregate limit. Default: ${DEFAULTS.limit}
  --auth query|header   Send key as ?apiKey= or Bearer header. Default: ${DEFAULTS.auth}
  --base-url URL        API base URL. Default: ${DEFAULTS.baseUrl}
  --require-session pre|regular|after|any
                         Session required for PASS. Default: ${DEFAULTS.requireSession}
  --help                Show this help.

Examples:
  MASSIVE_API_KEY=... node scripts/test-massive-candles.mjs
  MASSIVE_API_KEY=... node scripts/test-massive-candles.mjs --symbol MOBX --date 2026-03-03 --time 11:49:30
  MASSIVE_API_KEY=... node scripts/test-massive-candles.mjs --symbol AIFF --date 2026-03-04 --time 10:24:57 --require-session regular
`);
}

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    const normalizedKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    args[normalizedKey] = next;
    i += 1;
  }
  return args;
}

function validateArgs(args) {
  if (!/^[A-Z0-9. -]+$/i.test(args.symbol)) {
    throw new Error(`Invalid symbol: ${args.symbol}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new Error(`Invalid --date. Expected YYYY-MM-DD, got ${args.date}`);
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(args.time)) {
    throw new Error(`Invalid --time. Expected HH:MM or HH:MM:SS, got ${args.time}`);
  }
  if (!["true", "false"].includes(String(args.adjusted))) {
    throw new Error(`Invalid --adjusted. Expected true or false, got ${args.adjusted}`);
  }
  if (!["query", "header"].includes(args.auth)) {
    throw new Error(`Invalid --auth. Expected query or header, got ${args.auth}`);
  }
  if (!["pre", "regular", "after", "any"].includes(args.requireSession)) {
    throw new Error(
      `Invalid --require-session. Expected pre, regular, after, or any, got ${args.requireSession}`
    );
  }
}

function buildUrl(args, apiKey) {
  const symbol = encodeURIComponent(args.symbol.toUpperCase());
  const from = encodeURIComponent(args.date);
  const to = encodeURIComponent(args.date);
  const url = new URL(`/v2/aggs/ticker/${symbol}/range/1/minute/${from}/${to}`, args.baseUrl);
  url.searchParams.set("adjusted", String(args.adjusted));
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", String(args.limit));
  if (args.auth === "query") {
    url.searchParams.set("apiKey", apiKey);
  }
  return url;
}

function formatEt(ms) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ms));
}

function etSecondsOfDay(ms) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 3600 + Number(values.minute) * 60 + Number(values.second);
}

function parseTimeToSeconds(time) {
  const [hour, minute, second = "0"] = time.split(":");
  return Number(hour) * 3600 + Number(minute) * 60 + Number(second);
}

function sessionFor(ms) {
  const seconds = etSecondsOfDay(ms);
  if (seconds >= 4 * 3600 && seconds < 9 * 3600 + 30 * 60) return "pre";
  if (seconds >= 9 * 3600 + 30 * 60 && seconds < 16 * 3600) return "regular";
  if (seconds >= 16 * 3600 && seconds <= 20 * 3600) return "after";
  return "outside";
}

function isValidBar(bar) {
  return (
    Number.isFinite(bar?.o) &&
    Number.isFinite(bar?.h) &&
    Number.isFinite(bar?.l) &&
    Number.isFinite(bar?.c) &&
    Number.isFinite(bar?.v) &&
    Number.isInteger(bar?.t)
  );
}

function nearestBar(results, time) {
  const target = parseTimeToSeconds(time);
  let best = null;
  let bestDiff = Infinity;
  for (const bar of results) {
    const diff = Math.abs(etSecondsOfDay(bar.t) - target);
    if (diff < bestDiff) {
      best = bar;
      bestDiff = diff;
    }
  }
  return { bar: best, diffSeconds: bestDiff };
}

function printBar(label, bar) {
  console.log(
    `${label}: ${formatEt(bar.t)} ET ` +
      `O=${bar.o} H=${bar.h} L=${bar.l} C=${bar.c} V=${bar.v}`
  );
}

async function main() {
  loadLocalEnv();

  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  validateArgs(args);

  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) {
    throw new Error("Set MASSIVE_API_KEY in your shell before running this script.");
  }

  const url = buildUrl(args, apiKey);
  const displayUrl = new URL(url);
  if (displayUrl.searchParams.has("apiKey")) {
    displayUrl.searchParams.set("apiKey", "REDACTED");
  }

  console.log(`Request: ${displayUrl.toString()}`);
  console.log(`Testing ${args.symbol.toUpperCase()} 1-minute candles for ${args.date} ET`);

  const headers = {};
  if (args.auth === "header") {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, { headers });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    console.error(`HTTP ${response.status} ${response.statusText}`);
    console.error(typeof body === "string" ? body : JSON.stringify(body, null, 2));
    process.exitCode = 1;
    return;
  }

  if (typeof body === "string") {
    console.error("Expected JSON, got text:");
    console.error(body.slice(0, 1000));
    process.exitCode = 1;
    return;
  }

  const results = Array.isArray(body.results) ? body.results : [];
  const first = results[0];
  const last = results.at(-1);
  const validShape = results.length > 0 && results.every(isValidBar);
  const counts = { pre: 0, regular: 0, after: 0, outside: 0 };
  for (const bar of results) {
    counts[sessionFor(bar.t)] += 1;
  }

  console.log(`Status: ${body.status || "unknown"}`);
  console.log(`Ticker: ${body.ticker || args.symbol.toUpperCase()}`);
  console.log(`Results: ${results.length} bars`);
  console.log(`Shape: ${validShape ? "OK" : "FAILED"} (requires numeric o/h/l/c/v and integer t)`);
  console.log(
    `Sessions: pre-market=${counts.pre}, regular=${counts.regular}, ` +
      `after-hours=${counts.after}, outside=${counts.outside}`
  );

  if (first && last) {
    printBar("First bar", first);
    printBar("Last bar ", last);
  }

  if (results.length > 0) {
    const { bar, diffSeconds } = nearestBar(results, args.time);
    printBar(`Nearest to ${args.time}`, bar);
    console.log(`Nearest difference: ${diffSeconds}s`);
  }

  const hasRequiredSession =
    args.requireSession === "any" ? results.length > 0 : counts[args.requireSession] > 0;
  const pass = validShape && hasRequiredSession && results.length > 0;
  console.log(`Verdict: ${pass ? "PASS" : "CHECK"}${pass ? "" : " (inspect coverage/counts above)"}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
