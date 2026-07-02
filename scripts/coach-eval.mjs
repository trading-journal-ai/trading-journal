#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const DEFAULTS = {
  casesDir: "data/evals/coach/cases",
  outputDir: "data/evals/coach/outputs",
  model: "gpt-5.5",
};

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "dayVerdict",
    "whatMatchedPlaybook",
    "whatDriftedFromPlaybook",
    "keyTradeToStudy",
    "behaviorPattern",
    "statisticalRead",
    "oneExperiment",
    "confidenceAndMissingContext",
  ],
  properties: {
    dayVerdict: { type: "string" },
    whatMatchedPlaybook: { type: "array", items: { type: "string" } },
    whatDriftedFromPlaybook: { type: "array", items: { type: "string" } },
    keyTradeToStudy: {
      type: "object",
      additionalProperties: false,
      required: ["tradeId", "symbol", "reason"],
      properties: {
        tradeId: { type: ["number", "null"] },
        symbol: { type: ["string", "null"] },
        reason: { type: "string" },
      },
    },
    behaviorPattern: { type: "string" },
    statisticalRead: { type: "string" },
    oneExperiment: {
      type: "object",
      additionalProperties: false,
      required: ["hypothesis", "trigger", "action", "scope", "expires", "measure"],
      properties: {
        hypothesis: { type: "string" },
        trigger: { type: "string" },
        action: { type: "string" },
        scope: { type: "string" },
        expires: { type: "string" },
        measure: { type: "array", items: { type: "string" } },
      },
    },
    confidenceAndMissingContext: { type: "array", items: { type: "string" } },
  },
};

function usage() {
  console.log(`
Usage:
  npm run coach:eval
  npm run coach:eval -- --case data/evals/coach/cases/001-june-16-paper.json
  npm run coach:eval -- --case data/evals/coach/cases/001-june-16-paper.json --generate

Options:
  --case PATH          Run one private eval case.
  --cases-dir PATH     Directory of private eval cases. Default: ${DEFAULTS.casesDir}
  --output-dir PATH    Directory for local outputs. Default: ${DEFAULTS.outputDir}
  --generate           Send the private payload to OpenAI and save the response.
  --no-write           Validate and print summary without writing output files.
`);
}

function parseArgs(argv) {
  const args = { ...DEFAULTS, generate: false, write: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--generate") {
      args.generate = true;
      continue;
    }
    if (arg === "--no-write") {
      args.write = false;
      continue;
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    if (key === "case") args.casePath = value;
    else if (key === "cases-dir") args.casesDir = value;
    else if (key === "output-dir") args.outputDir = value;
    else if (key === "model") args.model = value;
    else throw new Error(`Unknown option: ${arg}`);
    i += 1;
  }
  return args;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value, label) {
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings.`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function loadJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function loadEnvFile(path = ".env.local") {
  const fullPath = resolve(path);
  if (!existsSync(fullPath)) return;
  const lines = readFileSync(fullPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseCase(value, path) {
  const item = requireRecord(value, path);
  if (item.version !== 1) throw new Error(`${path}: version must be 1.`);
  const playbook = requireRecord(item.playbook, `${path}: playbook`);
  const humanContext = requireRecord(item.humanContext, `${path}: humanContext`);
  const expected = requireRecord(item.expected, `${path}: expected`);
  const scope = requireString(item.scope, `${path}: scope`);
  if (scope !== "day" && scope !== "week" && scope !== "month") {
    throw new Error(`${path}: scope must be day, week, or month.`);
  }

  return {
    version: 1,
    id: requireString(item.id, `${path}: id`),
    title: requireString(item.title, `${path}: title`),
    sourceCsv: requireString(item.sourceCsv, `${path}: sourceCsv`),
    scope,
    scopeKey: requireString(item.scopeKey, `${path}: scopeKey`),
    playbook: {
      title: requireString(playbook.title, `${path}: playbook.title`),
      body: requireString(playbook.body, `${path}: playbook.body`),
      rubric: requireString(playbook.rubric, `${path}: playbook.rubric`),
    },
    humanContext: {
      recap: optionalString(humanContext.recap),
      intent: optionalString(humanContext.intent),
      didWell: optionalString(humanContext.didWell),
      standardsDrift: optionalString(humanContext.standardsDrift),
      emotionalState: optionalString(humanContext.emotionalState),
    },
    expected: {
      shouldSay: requireStringArray(expected.shouldSay, `${path}: expected.shouldSay`),
      shouldNotSay: requireStringArray(expected.shouldNotSay, `${path}: expected.shouldNotSay`),
      tags: requireStringArray(expected.tags, `${path}: expected.tags`),
    },
  };
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) row.push(field.replace(/\r$/, ""));
  if (row.length > 0) rows.push(row);
  return rows.filter((entry) => entry.length > 1 || entry[0]);
}

function numberOrNull(value) {
  const number = Number(String(value ?? "").replace(/[,+$%]/g, "").trim());
  return Number.isFinite(number) ? number : null;
}

function parseAppExport(csvPath) {
  const rows = parseCsvRows(readFileSync(resolve(csvPath), "utf8"));
  const [headers, ...dataRows] = rows;
  if (!headers) throw new Error(`${csvPath}: CSV has no header row.`);
  const index = new Map(headers.map((header, i) => [header, i]));
  const requireColumn = (name) => {
    const value = index.get(name);
    if (value == null) throw new Error(`${csvPath}: missing column "${name}".`);
    return value;
  };
  const columns = {
    id: requireColumn("trade_id"),
    symbol: requireColumn("symbol"),
    side: requireColumn("side"),
    quantity: requireColumn("quantity"),
    entryAt: requireColumn("entry_at"),
    exitAt: requireColumn("exit_at"),
    entryPrice: requireColumn("avg_entry_price"),
    exitPrice: requireColumn("avg_exit_price"),
    netPnl: requireColumn("net_pnl"),
    grossPnl: requireColumn("gross_pnl"),
    fees: requireColumn("fees"),
    status: requireColumn("status"),
    setup: requireColumn("setup"),
  };

  return dataRows.flatMap((row) => {
    const id = numberOrNull(row[columns.id]);
    const quantity = numberOrNull(row[columns.quantity]);
    if (id == null || quantity == null) return [];
    return [{
      id,
      symbol: requireString(row[columns.symbol], `${csvPath}: symbol`),
      side: requireString(row[columns.side], `${csvPath}: side`),
      quantity,
      entryAt: optionalString(row[columns.entryAt]),
      exitAt: optionalString(row[columns.exitAt]),
      entryPrice: numberOrNull(row[columns.entryPrice]),
      exitPrice: numberOrNull(row[columns.exitPrice]),
      pnl: numberOrNull(row[columns.netPnl]),
      grossPnl: numberOrNull(row[columns.grossPnl]),
      fees: numberOrNull(row[columns.fees]) ?? 0,
      status: optionalString(row[columns.status]),
      setup: optionalString(row[columns.setup]) || null,
    }];
  });
}

function dateKeyForTrade(trade) {
  return trade.entryAt.slice(0, 10);
}

function inScope(trade, scope, scopeKey) {
  const date = dateKeyForTrade(trade);
  if (scope === "day") return date === scopeKey;
  if (scope === "month") return date.startsWith(`${scopeKey}-`);
  return date >= scopeKey && date <= addDays(scopeKey, 4);
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function sum(values) {
  return values.reduce((total, value) => total + (value ?? 0), 0);
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function buildDeterministicFacts(trades) {
  const closed = trades.filter((trade) => trade.status !== "open");
  const pnlValues = closed.map((trade) => trade.pnl ?? 0);
  const winners = closed.filter((trade) => (trade.pnl ?? 0) > 0);
  const losers = closed.filter((trade) => (trade.pnl ?? 0) < 0);
  const symbolPnl = new Map();
  for (const trade of closed) {
    symbolPnl.set(trade.symbol, (symbolPnl.get(trade.symbol) ?? 0) + (trade.pnl ?? 0));
  }
  const bySymbol = [...symbolPnl.entries()]
    .map(([symbol, pnl]) => ({ symbol, pnl: roundMoney(pnl) }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));

  return {
    session: {
      tradeCount: closed.length,
      netPnl: roundMoney(sum(pnlValues)),
      grossPnl: roundMoney(sum(closed.map((trade) => trade.grossPnl ?? 0))),
      fees: roundMoney(sum(closed.map((trade) => trade.fees ?? 0))),
      winners: winners.length,
      losers: losers.length,
      winRate: closed.length === 0 ? null : roundMoney((winners.length / closed.length) * 100),
      averageWinner: winners.length === 0 ? null : roundMoney(sum(winners.map((trade) => trade.pnl ?? 0)) / winners.length),
      averageLoser: losers.length === 0 ? null : roundMoney(sum(losers.map((trade) => trade.pnl ?? 0)) / losers.length),
      largestWinner: winners.length === 0 ? null : roundMoney(Math.max(...winners.map((trade) => trade.pnl ?? 0))),
      largestLoser: losers.length === 0 ? null : roundMoney(Math.min(...losers.map((trade) => trade.pnl ?? 0))),
    },
    bySymbol,
    limitations: [
      "Private eval harness uses app-export CSV rows and case notes.",
      "Chart/level facts are not included yet.",
      "The coach must not infer intent beyond humanContext and playbook.",
    ],
  };
}

function buildPayload(testCase, trades) {
  const scopedTrades = trades.filter((trade) => inScope(trade, testCase.scope, testCase.scopeKey));
  return {
    version: 1,
    scope: testCase.scope,
    scopeKey: testCase.scopeKey,
    generatedAt: new Date().toISOString(),
    playbook: testCase.playbook,
    humanContext: testCase.humanContext,
    deterministicFacts: buildDeterministicFacts(scopedTrades),
    trades: scopedTrades.map((trade) => ({
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      entryAt: trade.entryAt,
      exitAt: trade.exitAt,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      pnl: trade.pnl,
      setup: trade.setup,
      primaryLabel: null,
      note: null,
      processTags: [],
      emotionTags: [],
    })),
    instructions: {
      role: "Post-trade review coach. Review completed trades only. Do not give live trade calls.",
      numericBoundary: "Use deterministicFacts for every number. Do not calculate, infer, or modify numeric claims.",
      outputContract: [
        "dayVerdict",
        "whatMatchedPlaybook",
        "whatDriftedFromPlaybook",
        "keyTradeToStudy",
        "behaviorPattern",
        "statisticalRead",
        "oneExperiment",
        "confidenceAndMissingContext",
      ],
    },
  };
}

function outputPathFor(outputDir, testCase, suffix) {
  const safeId = testCase.id.replace(/[^a-zA-Z0-9._-]/g, "-");
  return resolve(outputDir, `${safeId}.${suffix}.json`);
}

function extractTextFromResponse(responseBody) {
  if (isRecord(responseBody) && typeof responseBody.output_text === "string") return responseBody.output_text;
  if (!isRecord(responseBody) || !Array.isArray(responseBody.output)) {
    throw new Error("OpenAI response did not include output text.");
  }
  for (const item of responseBody.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (!isRecord(content)) continue;
      if (typeof content.text === "string") return content.text;
      if (typeof content.output_text === "string") return content.output_text;
    }
  }
  throw new Error("OpenAI response did not include output text.");
}

async function generateReview(payload, model) {
  loadEnvFile();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || model,
      input: [
        {
          role: "system",
          content: [
            "You are a post-trade review coach for a momentum trader.",
            "Use only the provided private eval payload.",
            "Every numeric claim must come from deterministicFacts.",
            "Be direct, process-focused, and honest about missing context.",
          ].join(" "),
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "coach_review",
          strict: true,
          schema: REVIEW_SCHEMA,
        },
      },
    }),
  });
  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(responseBody) && isRecord(responseBody.error) && typeof responseBody.error.message === "string"
      ? responseBody.error.message
      : `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return JSON.parse(extractTextFromResponse(responseBody));
}

function listCasePaths(args) {
  if (args.casePath) return [args.casePath];
  const dir = resolve(args.casesDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => resolve(dir, file));
}

async function runCase(path, args) {
  const testCase = parseCase(loadJson(path), path);
  const trades = parseAppExport(testCase.sourceCsv);
  const payload = buildPayload(testCase, trades);
  const result = {
    version: 1,
    case: {
      id: testCase.id,
      title: testCase.title,
      sourceCsv: testCase.sourceCsv,
      scope: testCase.scope,
      scopeKey: testCase.scopeKey,
    },
    evaluatedAt: new Date().toISOString(),
    expected: testCase.expected,
    payload,
  };

  if (args.generate) {
    result.review = await generateReview(payload, args.model);
  }

  if (args.write) {
    mkdirSync(resolve(args.outputDir), { recursive: true });
    const suffix = args.generate ? "review" : "payload";
    const path = outputPathFor(args.outputDir, testCase, suffix);
    writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`);
    return { testCase, payload, path };
  }

  return { testCase, payload, path: null };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const casePaths = listCasePaths(args);
if (casePaths.length === 0) {
  console.log(`No private eval cases found in ${args.casesDir}.`);
  console.log("Create a JSON case under data/evals/coach/cases/ or pass --case PATH.");
  process.exit(0);
}

for (const casePath of casePaths) {
  const { payload, path } = await runCase(casePath, args);
  const destination = path ? ` -> ${path}` : "";
  console.log(
    `${basename(casePath)}: ${payload.trades.length} trades, net P&L ${payload.deterministicFacts.session.netPnl}${destination}`,
  );
}
