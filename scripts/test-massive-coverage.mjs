#!/usr/bin/env node

import { readFileSync } from "node:fs";

const DEFAULTS = {
  file: "data/samples/2026-03-04-AccountStatement.csv",
  adjusted: "false",
  auth: "query",
  baseUrl: "https://api.massive.com",
  limit: "50000",
  maxDiff: "60",
  delayMs: "13000",
  priceTolerance: "0.01",
  sourceTimeZone: "America/Los_Angeles",
  marketTimeZone: "America/New_York",
};

function usage() {
  console.log(`
Usage:
  node scripts/test-massive-coverage.mjs [options]

Options:
  --file PATH           TOS Account Statement CSV. Default: ${DEFAULTS.file}
  --adjusted true|false Whether to request split-adjusted prices. Default: ${DEFAULTS.adjusted}
  --auth query|header   Send key as ?apiKey= or Bearer header. Default: ${DEFAULTS.auth}
  --base-url URL        API base URL. Default: ${DEFAULTS.baseUrl}
  --limit N             Massive aggregate limit. Default: ${DEFAULTS.limit}
  --max-diff N          Max nearest-candle distance in seconds. Default: ${DEFAULTS.maxDiff}
  --delay-ms N          Delay between Massive requests. Default: ${DEFAULTS.delayMs}
  --price-tolerance N   Allowed price distance outside candle high/low. Default: ${DEFAULTS.priceTolerance}
  --source-time-zone TZ  Time zone used by TOS Exec Time. Default: ${DEFAULTS.sourceTimeZone}
  --market-time-zone TZ  Market/session time zone. Default: ${DEFAULTS.marketTimeZone}
  --help                Show this help.
`);
}

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
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    args[key] = next;
    i += 1;
  }
  return args;
}

function validateArgs(args) {
  if (!["true", "false"].includes(args.adjusted)) {
    throw new Error(`Invalid --adjusted. Expected true or false, got ${args.adjusted}`);
  }
  if (!["query", "header"].includes(args.auth)) {
    throw new Error(`Invalid --auth. Expected query or header, got ${args.auth}`);
  }
  if (!Number.isFinite(Number(args.maxDiff)) || Number(args.maxDiff) < 0) {
    throw new Error(`Invalid --max-diff. Expected a non-negative number, got ${args.maxDiff}`);
  }
  if (!Number.isFinite(Number(args.delayMs)) || Number(args.delayMs) < 0) {
    throw new Error(`Invalid --delay-ms. Expected a non-negative number, got ${args.delayMs}`);
  }
  if (!Number.isFinite(Number(args.priceTolerance)) || Number(args.priceTolerance) < 0) {
    throw new Error(
      `Invalid --price-tolerance. Expected a non-negative number, got ${args.priceTolerance}`
    );
  }
  try {
    timeZoneParts(Date.now(), args.sourceTimeZone);
  } catch {
    throw new Error(`Invalid --source-time-zone. Expected an IANA time zone, got ${args.sourceTimeZone}`);
  }
  try {
    timeZoneParts(Date.now(), args.marketTimeZone);
  } catch {
    throw new Error(`Invalid --market-time-zone. Expected an IANA time zone, got ${args.marketTimeZone}`);
  }
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      cell += "\"";
      i += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.map((value) => value.trim().replace(/^="(.*)"$/, "$1"));
}

function parseTosDateTime(value) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Could not parse Exec Time: ${value}`);
  const [, month, day, year, hour, minute, second] = match;
  const fullYear = Number(year) < 100 ? 2000 + Number(year) : Number(year);
  return {
    date: `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    time: `${String(hour).padStart(2, "0")}:${minute}:${second}`,
  };
}

function parseNumber(value) {
  const normalized = String(value).replace(/[,+]/g, "").trim();
  if (normalized === "" || normalized === "~") return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function extractTradeHistoryExecutions(csv, { sourceTimeZone, marketTimeZone }) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => line.trim() === "Account Trade History");
  if (sectionIndex === -1) throw new Error("Could not find Account Trade History section.");

  const headerLineIndex = sectionIndex + 1;
  const headers = parseCsvLine(lines[headerLineIndex]);
  const rows = [];

  for (let i = headerLineIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) break;
    if (line.trim() === "Profits and Losses") break;

    const cells = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));

    const { date: sourceDate, time: sourceTime } = parseTosDateTime(row["Exec Time"]);
    const executedAtMs = zonedDateTimeToUtcMs(sourceDate, sourceTime, sourceTimeZone);
    const quantity = Math.abs(parseNumber(row.Qty) ?? 0);
    const price = parseNumber(row["Net Price"]) ?? parseNumber(row.Price);
    if (!row.Symbol || quantity === 0 || price === null) continue;

    rows.push({
      symbol: row.Symbol.toUpperCase(),
      date: dateInTimeZone(executedAtMs, marketTimeZone),
      time: timeInTimeZone(executedAtMs, marketTimeZone),
      sourceDate,
      sourceTime,
      executedAtMs,
      side: row.Side,
      quantity,
      price,
      posEffect: row["Pos Effect"],
      orderType: row["Order Type"],
    });
  }

  rows.sort((a, b) => a.executedAtMs - b.executedAtMs || a.symbol.localeCompare(b.symbol));
  return rows;
}

function buildUrl({ baseUrl, symbol, date, adjusted, limit, auth }, apiKey) {
  const url = new URL(`/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${date}/${date}`, baseUrl);
  url.searchParams.set("adjusted", String(adjusted));
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", String(limit));
  if (auth === "query") url.searchParams.set("apiKey", apiKey);
  return url;
}

function timeZoneParts(ms, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedDateTimeToUtcMs(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = targetAsUtc;

  for (let i = 0; i < 5; i += 1) {
    const parts = timeZoneParts(guess, timeZone);
    const renderedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const diff = targetAsUtc - renderedAsUtc;
    guess += diff;
    if (diff === 0) break;
  }

  return guess;
}

function dateInTimeZone(ms, timeZone) {
  const parts = timeZoneParts(ms, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function timeInTimeZone(ms, timeZone) {
  const parts = timeZoneParts(ms, timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}`;
}

function formatInTimeZone(ms, timeZone) {
  return `${dateInTimeZone(ms, timeZone)} ${timeInTimeZone(ms, timeZone)}`;
}

function secondsInTimeZone(ms, timeZone) {
  const parts = timeZoneParts(ms, timeZone);
  return parts.hour * 3600 + parts.minute * 60 + parts.second;
}

function sessionForMs(ms, marketTimeZone) {
  const seconds = secondsInTimeZone(ms, marketTimeZone);
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

function candleForExecution(results, executedAtMs) {
  const targetMinuteStart = Math.floor(executedAtMs / 60000) * 60000;
  const containingBar = results.find((bar) => bar.t === targetMinuteStart);
  if (containingBar) {
    return {
      bar: containingBar,
      diffSeconds: (executedAtMs - containingBar.t) / 1000,
    };
  }

  let best = null;
  let bestDiff = Infinity;
  for (const bar of results) {
    const diff = Math.abs(bar.t - executedAtMs) / 1000;
    if (diff < bestDiff) {
      best = bar;
      bestDiff = diff;
    }
  }
  return { bar: best, diffSeconds: bestDiff };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchCandles(request, apiKey) {
  const url = buildUrl(request, apiKey);
  const displayUrl = new URL(url);
  if (displayUrl.searchParams.has("apiKey")) displayUrl.searchParams.set("apiKey", "REDACTED");

  const headers = {};
  if (request.auth === "header") headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(url, { headers });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof body === "string" ? body : body.error || JSON.stringify(body);
    throw new Error(`HTTP ${response.status} for ${displayUrl.toString()}: ${message}`);
  }
  if (typeof body === "string") {
    throw new Error(`Expected JSON for ${displayUrl.toString()}, got text: ${body.slice(0, 200)}`);
  }

  const results = Array.isArray(body.results) ? body.results : [];
  return {
    status: body.status,
    results,
    validShape: results.length > 0 && results.every(isValidBar),
  };
}

function printReport(rows) {
  const headers = ["symbol", "source", "market", "session", "candle", "diff", "price", "candle range", "result"];
  const widths = [6, 19, 19, 7, 19, 5, 8, 18, 6];
  const formatRow = (values) =>
    values.map((value, index) => String(value).padEnd(widths[index])).join("  ");

  console.log(formatRow(headers));
  console.log(formatRow(widths.map((width) => "-".repeat(Math.min(width, 8)))));
  for (const row of rows) {
    console.log(
      formatRow([
        row.symbol,
        `${row.sourceDate} ${row.sourceTime}`,
        `${row.date} ${row.time}`,
        row.session,
        row.candle || "-",
        row.diffSeconds ?? "-",
        row.price,
        row.candleRange ?? "-",
        row.pass ? "PASS" : "CHECK",
      ])
    );
  }
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
  if (!apiKey) throw new Error("Set MASSIVE_API_KEY in .env.local or your shell before running this script.");

  const csv = readFileSync(args.file, "utf8");
  const executions = extractTradeHistoryExecutions(csv, {
    sourceTimeZone: args.sourceTimeZone,
    marketTimeZone: args.marketTimeZone,
  });
  const groups = new Map();
  for (const execution of executions) {
    const key = `${execution.symbol}|${execution.date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(execution);
  }

  console.log(`Parsed ${executions.length} executions from ${args.file}`);
  console.log(`Interpreting TOS Exec Time as ${args.sourceTimeZone}; reporting candles in ${args.marketTimeZone}`);
  console.log(`Fetching ${groups.size} symbol/day candle sets from Massive`);

  const reportRows = [];
  const groupSummaries = [];
  const maxDiff = Number(args.maxDiff);
  const delayMs = Number(args.delayMs);
  const priceTolerance = Number(args.priceTolerance);
  let groupIndex = 0;

  for (const [key, groupExecutions] of groups) {
    if (groupIndex > 0 && delayMs > 0) {
      await sleep(delayMs);
    }
    groupIndex += 1;

    const [symbol, date] = key.split("|");
    let candleSet;
    try {
      candleSet = await fetchCandles(
        {
          baseUrl: args.baseUrl,
          symbol,
          date,
          adjusted: args.adjusted,
          limit: args.limit,
          auth: args.auth,
        },
        apiKey
      );
    } catch (error) {
      groupSummaries.push({ symbol, date, bars: 0, validShape: false, error: error.message });
      for (const execution of groupExecutions) {
        reportRows.push({
          ...execution,
          session: sessionForMs(execution.executedAtMs, args.marketTimeZone),
          pass: false,
        });
      }
      continue;
    }

    groupSummaries.push({
      symbol,
      date,
      bars: candleSet.results.length,
      validShape: candleSet.validShape,
      error: null,
    });

    for (const execution of groupExecutions) {
      const { bar, diffSeconds } = candleForExecution(candleSet.results, execution.executedAtMs);
      const priceInRange =
        Boolean(bar) &&
        execution.price >= bar.l - priceTolerance &&
        execution.price <= bar.h + priceTolerance;
      const pass = candleSet.validShape && Boolean(bar) && diffSeconds <= maxDiff && priceInRange;
      reportRows.push({
        ...execution,
        session: sessionForMs(execution.executedAtMs, args.marketTimeZone),
        candle: bar ? formatInTimeZone(bar.t, args.marketTimeZone) : null,
        diffSeconds: bar ? Number(diffSeconds.toFixed(3)) : null,
        candleRange: bar ? `${bar.l}-${bar.h}` : null,
        priceInRange,
        pass,
      });
    }
  }

  const passCount = reportRows.filter((row) => row.pass).length;
  const checkCount = reportRows.length - passCount;
  const bySession = reportRows.reduce((counts, row) => {
    counts[row.session] = (counts[row.session] || 0) + 1;
    return counts;
  }, {});

  console.log("");
  console.log("Candle Sets");
  for (const summary of groupSummaries) {
    const status = summary.error
      ? `ERROR ${summary.error}`
      : `${summary.bars} bars, shape=${summary.validShape ? "OK" : "FAILED"}`;
    console.log(`- ${summary.symbol} ${summary.date}: ${status}`);
  }

  console.log("");
  console.log("Execution Coverage");
  printReport(reportRows);

  console.log("");
  console.log(
    `Summary: ${passCount}/${reportRows.length} executions PASS, ${checkCount} CHECK. ` +
      `Sessions: pre=${bySession.pre || 0}, regular=${bySession.regular || 0}, ` +
      `after=${bySession.after || 0}, outside=${bySession.outside || 0}`
  );

  if (checkCount > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
