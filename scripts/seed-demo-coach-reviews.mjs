#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const DEFAULTS = {
  db: "data/tradingjournaldemo.db",
  fixture: "samples/demo/coach-reviews.json",
  account: "Paper Account",
};

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    args[key] = value;
    i += 1;
  }
  return args;
}

function usage() {
  console.log(`
Usage:
  node scripts/seed-demo-coach-reviews.mjs --db data/tradingjournaldemo.db --fixture samples/demo/coach-reviews.json

Seeds approved static coach-review fixtures into the demo database.
`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings.`);
  }
  return value;
}

function validateTradeToStudy(value) {
  if (!isRecord(value)) throw new Error("review.keyTradeToStudy must be an object.");
  if (value.tradeId !== null && typeof value.tradeId !== "number") {
    throw new Error("review.keyTradeToStudy.tradeId must be a number or null.");
  }
  if (value.symbol !== null && typeof value.symbol !== "string") {
    throw new Error("review.keyTradeToStudy.symbol must be a string or null.");
  }
  requireString(value.reason, "review.keyTradeToStudy.reason");
}

function validateExperiment(value) {
  if (!isRecord(value)) throw new Error("review.oneExperiment must be an object.");
  requireString(value.hypothesis, "review.oneExperiment.hypothesis");
  requireString(value.trigger, "review.oneExperiment.trigger");
  requireString(value.action, "review.oneExperiment.action");
  requireString(value.scope, "review.oneExperiment.scope");
  requireString(value.expires, "review.oneExperiment.expires");
  requireStringArray(value.measure, "review.oneExperiment.measure");
}

function validateReview(review) {
  if (!isRecord(review)) throw new Error("review must be an object.");
  requireString(review.dayVerdict, "review.dayVerdict");
  requireStringArray(review.whatMatchedPlaybook, "review.whatMatchedPlaybook");
  requireStringArray(review.whatDriftedFromPlaybook, "review.whatDriftedFromPlaybook");
  validateTradeToStudy(review.keyTradeToStudy);
  requireString(review.behaviorPattern, "review.behaviorPattern");
  requireString(review.statisticalRead, "review.statisticalRead");
  validateExperiment(review.oneExperiment);
  requireStringArray(review.confidenceAndMissingContext, "review.confidenceAndMissingContext");
}

function loadFixtures(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const entries = Array.isArray(parsed) ? parsed : parsed.reviews;
  if (!Array.isArray(entries)) {
    throw new Error("Coach review fixture must be an array or an object with a reviews array.");
  }

  return entries.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`Fixture ${index} must be an object.`);
    const scope = requireString(entry.scope, `Fixture ${index} scope`);
    if (scope !== "day" && scope !== "week" && scope !== "month") {
      throw new Error(`Fixture ${index} scope must be day, week, or month.`);
    }
    const scopeKey = requireString(entry.scopeKey, `Fixture ${index} scopeKey`);
    const model = requireString(entry.model, `Fixture ${index} model`);
    const generatedAt = requireString(entry.generatedAt, `Fixture ${index} generatedAt`);
    validateReview(entry.review);

    return {
      account: typeof entry.account === "string" && entry.account.trim() ? entry.account : null,
      scope,
      scopeKey,
      status: entry.status === "draft" || entry.status === "stale" ? entry.status : "generated",
      model,
      generatedAt,
      payload: isRecord(entry.payload) ? entry.payload : null,
      review: entry.review,
    };
  });
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const fixturePath = resolve(args.fixture);
const fixtures = loadFixtures(fixturePath);

const db = new Database(resolve(args.db));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const accountByName = new Map(db.prepare("select id, name from accounts").all().map((row) => [row.name, row.id]));
const defaultAccountId = accountByName.get(args.account);
if (!defaultAccountId) throw new Error(`Could not find default account "${args.account}".`);

const upsert = db.prepare(`
  insert into coach_reviews (
    account_id, scope, scope_key, status, payload_json, review_json, created_at, updated_at
  ) values (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
  on conflict(account_id, scope, scope_key) do update set
    status = excluded.status,
    payload_json = excluded.payload_json,
    review_json = excluded.review_json,
    updated_at = unixepoch()
`);

const seed = db.transaction(() => {
  let count = 0;
  for (const fixture of fixtures) {
    const accountId = fixture.account ? accountByName.get(fixture.account) : defaultAccountId;
    if (!accountId) throw new Error(`Could not find fixture account "${fixture.account}".`);
    const payload = fixture.payload ?? {
      fixture: true,
      source: args.fixture,
      scope: fixture.scope,
      scopeKey: fixture.scopeKey,
    };
    const reviewJson = {
      version: 1,
      model: fixture.model,
      generatedAt: fixture.generatedAt,
      review: fixture.review,
    };

    upsert.run(
      accountId,
      fixture.scope,
      fixture.scopeKey,
      fixture.status,
      JSON.stringify(payload),
      JSON.stringify(reviewJson),
    );
    count += 1;
  }
  return count;
});

const count = seed();
db.pragma("wal_checkpoint(FULL)");
console.log(`Seeded ${count} static coach reviews from ${args.fixture} into ${args.db}.`);
