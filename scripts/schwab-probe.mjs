#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { TradingApiClient } from "schwab-client-js";

const MARKET_TZ = "America/New_York";

function parseEnv(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    values[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

function loadJournalEnv() {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) {
    throw new Error("Journal .env is missing. Follow docs/setup/SCHWAB_SETUP.md.");
  }
  const values = parseEnv(fs.readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(values)) {
    if (!process.env[key] && value) process.env[key] = value;
  }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function dateInMarketTime(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: MARKET_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function zonedWallClockToUtcMs(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = time.split(":").map(Number);
  const wanted = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = wanted;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(guess))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const rendered = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour === 24 ? 0 : parts.hour,
      parts.minute,
      parts.second,
    );
    guess += wanted - rendered;
  }
  return guess;
}

function nextDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

function shapeOf(value, depth = 0) {
  if (value == null) return "null";
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      item: value.length > 0 && depth < 7 ? shapeOf(value[0], depth + 1) : null,
    };
  }
  if (typeof value === "object") {
    if (depth >= 7) return { type: "object", keys: Object.keys(value).sort() };
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, shapeOf(item, depth + 1)]),
    );
  }
  return typeof value;
}

function collectEnumValues(value, keys) {
  const collected = Object.fromEntries([...keys].map((key) => [key, new Set()]));

  function visit(current) {
    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, item] of Object.entries(current)) {
      if (keys.has(key) && typeof item === "string") collected[key].add(item);
      visit(item);
    }
  }

  visit(value);
  return Object.fromEntries(
    Object.entries(collected).map(([key, values]) => [
      key,
      [...values].sort().slice(0, 20),
    ]),
  );
}

function orderAggregates(orders) {
  if (!Array.isArray(orders)) return null;
  let executionLegs = 0;
  let ordersWithExecutionLegs = 0;
  let ordersWithMultipleActivities = 0;
  let activitiesWithMultipleExecutionLegs = 0;
  let ordersWithChildren = 0;

  for (const order of orders) {
    if (!order || typeof order !== "object") continue;
    const activities = Array.isArray(order.orderActivityCollection)
      ? order.orderActivityCollection
      : [];
    if (activities.length > 1) ordersWithMultipleActivities += 1;
    if (Array.isArray(order.childOrderStrategies) && order.childOrderStrategies.length > 0) {
      ordersWithChildren += 1;
    }
    let orderExecutionLegs = 0;
    for (const activity of activities) {
      const legs = Array.isArray(activity?.executionLegs) ? activity.executionLegs : [];
      executionLegs += legs.length;
      orderExecutionLegs += legs.length;
      if (legs.length > 1) activitiesWithMultipleExecutionLegs += 1;
    }
    if (orderExecutionLegs > 0) ordersWithExecutionLegs += 1;
  }

  return {
    executionLegs,
    ordersWithExecutionLegs,
    ordersWithMultipleActivities,
    activitiesWithMultipleExecutionLegs,
    ordersWithChildren,
  };
}

async function main() {
  loadJournalEnv();
  const date = argumentValue("--date") ?? dateInMarketTime(new Date());
  const outputPath = path.resolve(
    argumentValue("--output") ?? path.join("/private/tmp", `schwab-probe-${date}.json`),
  );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("--date must use YYYY-MM-DD.");
  }

  const appKey = process.env.SCHWAB_APP_KEY?.trim();
  const appSecret = process.env.SCHWAB_SECRET?.trim();
  const refreshToken = process.env.SCHWAB_REFRESH_TOKEN?.trim();
  if (!appKey || !appSecret || !refreshToken) {
    throw new Error("Journal Schwab credentials are incomplete.");
  }

  const client = new TradingApiClient(appKey, appSecret, refreshToken);
  const accountRows = await client.accountsNumbers();
  const accounts = Array.isArray(accountRows) ? accountRows : [];
  const configuredHash = process.env.SCHWAB_ACCOUNT_HASH?.trim();
  const selected = configuredHash
    ? accounts.find((account) => account?.hashValue === configuredHash)
    : accounts[0];
  if (!selected?.hashValue) {
    throw new Error("No authorized Schwab account is available for the probe.");
  }

  const from = new Date(zonedWallClockToUtcMs(date, "00:00:00")).toISOString();
  const to = new Date(zonedWallClockToUtcMs(nextDate(date), "00:00:00") - 1).toISOString();
  const [orders, transactions] = await Promise.all([
    client.ordersByAccount(selected.hashValue, from, to, null, 3000),
    client.transactByAcct(selected.hashValue, "TRADE", from, to),
  ]);

  const result = {
    generatedAt: new Date().toISOString(),
    date,
    timezone: MARKET_TZ,
    accountCount: accounts.length,
    orderCount: Array.isArray(orders) ? orders.length : null,
    transactionCount: Array.isArray(transactions) ? transactions.length : null,
    orderAggregates: orderAggregates(orders),
    orderEnums: collectEnumValues(
      orders,
      new Set([
        "activityType",
        "assetType",
        "complexOrderStrategyType",
        "duration",
        "executionType",
        "instruction",
        "orderLegType",
        "orderStrategyType",
        "orderType",
        "positionEffect",
        "session",
        "status",
      ]),
    ),
    transactionEnums: collectEnumValues(
      transactions,
      new Set(["assetType", "feeType", "status", "subAccount", "type"]),
    ),
    orderShape: shapeOf(orders),
    transactionShape: shapeOf(transactions),
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.chmodSync(outputPath, 0o600);
  console.log(`Redacted Schwab payload shape written to ${outputPath}.`);
  console.log("No account numbers, symbols, prices, quantities, IDs, or tokens were written.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const sanitized = message
    .replace(/[A-F0-9]{24,}/gi, "[redacted]")
    .replace(/(?:access|refresh)[_-]?token[^\s]*/gi, "[redacted-token]");
  console.error(`Schwab probe failed: ${sanitized}`);
  process.exitCode = 1;
});
