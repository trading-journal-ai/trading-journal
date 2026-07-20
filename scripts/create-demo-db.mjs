import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";

const outputPath = resolve(process.argv[2] ?? "data/tradingjournaldemo.db");

const symbols = [
  "SIM01",
  "SIM02",
  "SIM03",
  "SIM04",
  "SIM05",
  "SIM06",
  "SIM07",
  "SIM08",
  "SIM09",
  "SIM10",
  "SIM11",
  "SIM12",
  "SIM13",
  "SIM14",
  "SIM15",
  "SIM16",
  "SIM17",
];

const tagNames = [
  "Opening drive",
  "First pullback",
  "Green-to-red reclaim",
  "VWAP reclaim",
  "Halt runner",
  "Small cap momentum",
  "A+ setup",
  "Needs review",
];

const tradeNoteTemplates = {
  best: [
    "Best execution of the day. Waited for the pullback, entered close to support, and let the move work before taking profit.",
    "Cleanest setup on the sheet. Volume confirmed the move and the entry gave enough room to sit through the first shake.",
    "This was the trade to model. The idea was simple, risk was clear, and the exit came into strength instead of panic.",
  ],
  good: [
    "Good trade. Took the setup without chasing and kept the exit process controlled.",
    "Solid execution. The entry was not perfect, but the trade stayed inside the plan and the loss risk was contained early.",
    "Useful winner. The move was not huge, but patience and clean sizing made the trade worth taking.",
  ],
  review: [
    "Needs review. The setup had a reason, but the entry was late enough that risk expanded quickly.",
    "Review this one for timing. The trade was close to working, but the entry did not leave much room for normal chop.",
    "Not a disaster, but not clean. Worth checking whether the trade was based on structure or just momentum.",
  ],
  mistake: [
    "Process mistake. Size was too large for the quality of the setup, and the loss should have been smaller.",
    "Bad trade to study. The entry came after the easy move and the stop was not respected quickly enough.",
    "This is the one to reduce next time. The idea may have been valid, but the execution turned a normal loss into a bigger one.",
  ],
};

const monthNotes = {
  "2026-02": "February was a steady baseline month for the paper account: selective entries, small size, and a focus on building the review workflow.",
  "2026-03": "March introduced more active momentum names while keeping risk controlled. The best trades came from waiting for confirmation.",
  "2026-04": "April improved consistency. Smaller losses, cleaner notes, and more patient entries made the review process more useful.",
  "2026-05": "May was a constructive growth month. A few trades needed review, but the overall process stayed disciplined and profitable.",
  "2026-06": "June recap test: strong paper-trading progress, green overall, and good evidence that patient entries plus small losses can compound.",
};

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const random = seededRandom(20260614);

function rand(min, max) {
  return min + (max - min) * random();
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pick(items) {
  return items[randInt(0, items.length - 1)];
}

function easternOffsetHours(date) {
  return date < "2026-03-08" ? 5 : 4;
}

function easternEpoch(date, hour, minute, second = 0) {
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day, hour + easternOffsetHours(date), minute, second) / 1000);
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function weekday(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function weekStart(date) {
  return addDays(date, -((weekday(date) + 6) % 7));
}

function tradingDaysForMonth(year, month, limitDay = 31) {
  const dates = [];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= Math.min(last, limitDay); day += 1) {
    const date = isoDate(year, month, day);
    const dow = weekday(date);
    if (dow >= 1 && dow <= 5) dates.push(date);
  }
  return dates;
}

function setupSchema(db) {
  db.exec(`
    PRAGMA foreign_keys=OFF;
    CREATE TABLE "__drizzle_migrations" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    );
    CREATE TABLE "accounts" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "name" text NOT NULL,
      "created_at" integer DEFAULT (unixepoch()) NOT NULL
    );
    CREATE UNIQUE INDEX "accounts_name_unique" ON "accounts" ("name");
    CREATE TABLE "attachments" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "trade_id" integer NOT NULL,
      "file_path" text NOT NULL,
      "caption" text,
      FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON UPDATE no action ON DELETE no action
    );
    CREATE TABLE "candles" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "symbol" text NOT NULL,
      "timeframe" text DEFAULT '1m' NOT NULL,
      "t" integer NOT NULL,
      "o" real NOT NULL,
      "h" real NOT NULL,
      "l" real NOT NULL,
      "c" real NOT NULL,
      "vol" real DEFAULT 0 NOT NULL
    );
    CREATE UNIQUE INDEX "candles_symbol_tf_t_unq" ON "candles" ("symbol","timeframe","t");
    CREATE TABLE "executions" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "symbol" text NOT NULL,
      "side" text NOT NULL,
      "quantity" integer NOT NULL,
      "price" real NOT NULL,
      "executed_at" integer NOT NULL,
      "fees" real DEFAULT 0 NOT NULL,
      "route" text,
      "pos_effect" text,
      "trade_id" integer,
      "account_id" integer,
      "import_batch_id" integer,
      "source_row_hash" text,
      FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON UPDATE no action ON DELETE no action,
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON UPDATE no action ON DELETE no action,
      FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON UPDATE no action ON DELETE no action
    );
    CREATE UNIQUE INDEX "executions_source_row_hash_account_unq" ON "executions" ("source_row_hash","account_id");
    CREATE TABLE "import_batches" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "account_id" integer,
      "kind" text NOT NULL,
      "source" text NOT NULL,
      "file_name" text,
      "row_count" integer DEFAULT 0 NOT NULL,
      "imported_at" integer DEFAULT (unixepoch()) NOT NULL,
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON UPDATE no action ON DELETE no action
    );
    CREATE TABLE "journal_entries" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "account_id" integer,
      "trade_id" integer,
      "scope" text DEFAULT 'trade' NOT NULL,
      "scope_key" text,
      "thesis" text,
      "what_went_well" text,
      "what_went_wrong" text,
      "lessons" text,
      "followed_plan" integer,
      "emotional_state" text,
      "created_at" integer DEFAULT (unixepoch()) NOT NULL,
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON UPDATE no action ON DELETE no action,
      FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON UPDATE no action ON DELETE no action
    );
    CREATE TABLE "tags" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "name" text NOT NULL
    );
    CREATE UNIQUE INDEX "tags_name_unique" ON "tags" ("name");
    CREATE TABLE "journal_entry_tags" (
      "journal_entry_id" integer NOT NULL,
      "tag_id" integer NOT NULL,
      PRIMARY KEY("journal_entry_id", "tag_id"),
      FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON UPDATE no action ON DELETE cascade
    );
    CREATE TABLE "trade_tags" (
      "trade_id" integer NOT NULL,
      "tag_id" integer NOT NULL,
      PRIMARY KEY("trade_id", "tag_id"),
      FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON UPDATE no action ON DELETE no action,
      FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON UPDATE no action ON DELETE no action
    );
    CREATE TABLE "trades" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "account_id" integer,
      "symbol" text NOT NULL,
      "side" text NOT NULL,
      "quantity" integer NOT NULL,
      "avg_entry_price" real,
      "entry_at" integer,
      "avg_exit_price" real,
      "exit_at" integer,
      "fees" real DEFAULT 0 NOT NULL,
      "stop_loss" real,
      "target" real,
      "setup" text,
      "status" text DEFAULT 'open' NOT NULL,
      "created_at" integer DEFAULT (unixepoch()) NOT NULL,
      "updated_at" integer DEFAULT (unixepoch()) NOT NULL,
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON UPDATE no action ON DELETE no action
    );
    PRAGMA foreign_keys=ON;
  `);
}

function buildInsertStatements(db) {
  return {
    account: db.prepare("INSERT INTO accounts (name) VALUES (?)"),
    batch: db.prepare("INSERT INTO import_batches (account_id, kind, source, file_name, row_count, imported_at) VALUES (?, ?, ?, ?, ?, ?)"),
    tag: db.prepare("INSERT INTO tags (name) VALUES (?)"),
    tradeTag: db.prepare("INSERT OR IGNORE INTO trade_tags (trade_id, tag_id) VALUES (?, ?)"),
    trade: db.prepare(`
      INSERT INTO trades (
        account_id, symbol, side, quantity, avg_entry_price, entry_at, avg_exit_price, exit_at, fees,
        stop_loss, target, setup, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    execution: db.prepare(`
      INSERT INTO executions (
        account_id, symbol, side, quantity, price, executed_at, fees, route, pos_effect, trade_id, import_batch_id, source_row_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    candle: db.prepare(`
      INSERT OR IGNORE INTO candles (symbol, timeframe, t, o, h, l, c, vol)
      VALUES (?, '1m', ?, ?, ?, ?, ?, ?)
    `),
    journal: db.prepare(`
      INSERT INTO journal_entries (
        account_id, trade_id, scope, scope_key, thesis, what_went_well, what_went_wrong, lessons, followed_plan, emotional_state, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
  };
}

function round(value, decimals = 4) {
  return Number(value.toFixed(decimals));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function splitQuantity(quantity) {
  if (quantity < 100 || random() < 0.45) return [quantity];
  const first = Math.max(1, Math.round(quantity * rand(0.35, 0.7)));
  return [first, quantity - first].filter((qty) => qty > 0);
}

function weightedAverage(parts) {
  const quantity = parts.reduce((sum, part) => sum + part.quantity, 0);
  if (quantity === 0) return 0;
  return round(parts.reduce((sum, part) => sum + part.quantity * part.price, 0) / quantity, 4);
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function splitTemplateSessions(rows) {
  const sessions = [];
  let current = [];
  let lastSymbol = "";
  let lastTime = 0;

  for (const row of rows) {
    const gap = row.t - lastTime;
    if (row.symbol !== lastSymbol || gap > 20 * 60 || gap < 0) {
      if (current.length >= 180) sessions.push(current);
      current = [];
    }
    current.push(row);
    lastSymbol = row.symbol;
    lastTime = row.t;
  }

  if (current.length >= 180) sessions.push(current);
  return sessions;
}

function createFallbackSession(seedOffset) {
  const candles = [];
  let price = rand(1.6, 8.8);
  const trend = rand(-0.00035, 0.00055) + seedOffset * 0.00003;
  const firstSpike = randInt(35, 95);
  const secondSpike = randInt(145, 255);

  for (let index = 0; index <= 390; index += 1) {
    const open = price;
    const wave = Math.sin(index / rand(18, 32)) * rand(0.0003, 0.0018);
    const firstImpulse = Math.max(0, 1 - Math.abs(index - firstSpike) / 26) * rand(0.0015, 0.0055);
    const secondImpulse = Math.max(0, 1 - Math.abs(index - secondSpike) / 34) * rand(-0.0045, 0.005);
    const drift = trend + wave + firstImpulse + secondImpulse + rand(-0.0028, 0.0028);
    const close = Math.max(0.2, open * (1 + drift));
    const wick = Math.max(0.008, Math.abs(close - open) * rand(0.25, 0.95) + rand(0.002, 0.035));
    const high = Math.max(open, close) + wick;
    const low = Math.max(0.1, Math.min(open, close) - wick);
    const nearImpulse = Math.abs(index - firstSpike) < 22 || Math.abs(index - secondSpike) < 28;
    const vol = Math.round(rand(600, 4200) * (nearImpulse ? rand(4, 18) : rand(0.4, 1.8)));
    candles.push({ t: index, o: round(open), h: round(high), l: round(low), c: round(close), vol });
    price = close;
  }

  return candles;
}

function loadTemplateSessions() {
  const templatePath = resolve(process.env.DEMO_TEMPLATE_DB ?? "data/journal.db");
  if (!existsSync(templatePath)) {
    return Array.from({ length: 8 }, (_, index) => createFallbackSession(index));
  }

  try {
    const source = new Database(templatePath, { readonly: true, fileMustExist: true });
    const rows = source
      .prepare(`
        SELECT symbol, t, o, h, l, c, vol
        FROM candles
        WHERE timeframe = '1m'
        ORDER BY symbol, t
      `)
      .all();
    source.close();

    const sessions = splitTemplateSessions(rows).filter((session) => session.length >= 240);
    if (sessions.length > 0) return sessions;
  } catch {
    // Fall back to generated sessions when the local private DB is not present.
  }

  return Array.from({ length: 8 }, (_, index) => createFallbackSession(index));
}

function transformedPrice(value, anchor, base, amplitude, index) {
  const safeValue = Math.max(0.01, value);
  const safeAnchor = Math.max(0.01, anchor);
  const ratio = safeValue / safeAnchor;
  const drift = 1 + index * rand(-0.00002, 0.000025);
  return Math.max(0.18, base * ratio ** amplitude * drift);
}

function buildDemoCandles(template, date) {
  const sessionLength = Math.min(391, template.length);
  const maxStart = Math.max(0, template.length - sessionLength);
  const start = maxStart > 0 ? randInt(0, maxStart) : 0;
  const source = template.slice(start, start + sessionLength);
  const anchor = source[0]?.c || source[0]?.o || 1;
  const base = rand(1.35, 9.4);
  const amplitude = rand(0.55, 0.95);
  const sourceVolumes = source.map((candle) => Math.max(0, Number(candle.vol) || 0));
  const sourceMedianVolume = Math.max(1, median(sourceVolumes));
  const volumeBase = rand(1_200, 7_500);

  return source.map((candle, index) => {
    const open = transformedPrice(candle.o, anchor, base, amplitude, index);
    const close = transformedPrice(candle.c, anchor, base, amplitude, index);
    const highRaw = transformedPrice(candle.h, anchor, base, amplitude, index);
    const lowRaw = transformedPrice(candle.l, anchor, base, amplitude, index);
    const high = Math.max(open, close, highRaw) + rand(0.001, 0.018);
    const low = Math.max(0.05, Math.min(open, close, lowRaw) - rand(0.001, 0.018));
    const relativeVol = clamp((Number(candle.vol) || 0) / sourceMedianVolume, 0.08, 18);
    const volume = Math.round(volumeBase * relativeVol * rand(0.72, 1.28));

    return {
      t: easternEpoch(date, 9, 30 + index),
      o: round(open),
      h: round(high),
      l: round(low),
      c: round(close),
      vol: volume,
    };
  });
}

function insertCandles(stmts, symbol, candles) {
  for (const candle of candles) {
    stmts.candle.run(symbol, candle.t, candle.o, candle.h, candle.l, candle.c, candle.vol);
  }
}

function planLabel(win, standout = false) {
  if (win) return standout || random() > 0.72 ? "Best setup" : "Good trade";
  return pick(["Needs review", "Needs review", "Rule break", "Revenge trade"]);
}

function chooseRedDays(dates) {
  const target = Math.round(dates.length * 0.2);
  const weekdayCounts = new Map();
  const selectedWeeks = new Set();
  const selected = new Set();
  const candidates = [...dates].sort(() => random() - 0.5);

  for (const date of candidates) {
    if (selected.size >= target) break;
    const day = weekday(date);
    const week = weekStart(date);
    const dayCount = weekdayCounts.get(day) ?? 0;
    const previousDate = addDays(date, -1);
    const nextDate = addDays(date, 1);

    if (dayCount >= Math.ceil(target / 5) + 1) continue;
    if (selectedWeeks.has(week) && selected.size < target - 2) continue;
    if (selected.has(previousDate) || selected.has(nextDate)) continue;

    selected.add(date);
    selectedWeeks.add(week);
    weekdayCounts.set(day, dayCount + 1);
  }

  for (const date of candidates) {
    if (selected.size >= target) break;
    selected.add(date);
  }

  return selected;
}

function buildPlansForDate(date, index, redDay) {
  const count = randInt(2, 7);
  const winCount = clamp(Math.round(count * (redDay ? 0.36 : 0.65)), 1, count - (redDay ? 1 : 0));
  const outcomes = Array.from({ length: count }, (_, tradeIndex) => tradeIndex < winCount);
  outcomes.sort(() => random() - 0.5);

  const daySymbols = [];
  const uniqueCount = Math.max(1, Math.min(count, randInt(Math.ceil(count / 2), count)));
  const start = (index * 3) % symbols.length;
  for (let i = 0; i < uniqueCount; i += 1) {
    daySymbols.push(symbols[(start + i * 2) % symbols.length]);
  }

  return outcomes.map((win, tradeIndex) => ({
    symbol: daySymbols[tradeIndex % daySymbols.length],
    win,
    label: planLabel(win, tradeIndex === 0 && !redDay),
    redDay,
  }));
}

function chooseTradeWindow(candles, desiredWin, usedWindows) {
  const maxEntry = Math.max(35, candles.length - 35);
  const candidates = [];
  const targetScore = desiredWin ? rand(0.008, 0.035) : rand(0.004, 0.022);

  for (let entryIndex = 18; entryIndex <= maxEntry; entryIndex += 1) {
    for (let hold = 3; hold <= 28; hold += 1) {
      const exitIndex = Math.min(candles.length - 6, entryIndex + hold);
      if (exitIndex <= entryIndex) continue;

      const overlaps = usedWindows.some(([start, end]) => entryIndex <= end + 3 && exitIndex >= start - 3);
      if (overlaps) continue;

      const entry = candles[entryIndex].c;
      const exit = candles[exitIndex].c;
      const change = exit - entry;
      const directional = desiredWin ? change > 0 : change < 0;
      if (!directional) continue;

      const move = Math.abs(change);
      const minMove = Math.max(0.008, entry * 0.0025);
      if (move < minMove) continue;
      const moveScore = move / entry;
      if (moveScore > 0.12) continue;

      candidates.push({
        entryIndex,
        exitIndex,
        score: Math.abs(moveScore - targetScore) + random() * 0.002,
      });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.score - b.score);
    const chosen = pick(candidates.slice(0, Math.min(16, candidates.length)));
    usedWindows.push([chosen.entryIndex, chosen.exitIndex]);
    return { entryIndex: chosen.entryIndex, exitIndex: chosen.exitIndex };
  }

  const fallbackEntry = randInt(20, Math.max(21, candles.length - 45));
  const fallbackExit = Math.min(candles.length - 5, fallbackEntry + randInt(5, 22));
  usedWindows.push([fallbackEntry, fallbackExit]);
  return { entryIndex: fallbackEntry, exitIndex: fallbackExit };
}

function priceInCandle(candle, preferred, nudge = 0) {
  const span = Math.max(0.004, candle.h - candle.l);
  return round(clamp(preferred + nudge, candle.l + span * 0.08, candle.h - span * 0.08), 4);
}

function buildExecutionParts(candles, index, totalQuantity, preferredPrice, direction) {
  const partials = splitQuantity(totalQuantity);
  return partials.map((quantity, partialIndex) => {
    const candle = candles[Math.min(candles.length - 1, index + partialIndex)];
    const nudge = direction * rand(0, Math.max(0.002, (candle.h - candle.l) * 0.12));
    return {
      quantity,
      price: priceInCandle(candle, preferredPrice, nudge),
      executedAt: candle.t + 7 + partialIndex * 8 + randInt(0, 8),
      candle,
    };
  });
}

function createTradeFromCandles(stmts, accountId, batchId, tagIds, date, plan, candles, usedWindows, sequence) {
  const { entryIndex, exitIndex } = chooseTradeWindow(candles, plan.win, usedWindows);
  const entryCandle = candles[entryIndex];
  const exitCandle = candles[exitIndex];
  const side = "long";
  const quantity = plan.win
    ? pick(plan.redDay ? [50, 100, 150, 200] : [100, 150, 200, 300, 500])
    : pick(plan.redDay ? [200, 300, 400, 500, 700] : [25, 50, 75, 100, 150]);
  const entryPreferred = entryCandle.c;
  const exitPreferred = exitCandle.c;
  const entryParts = buildExecutionParts(candles, entryIndex, quantity, entryPreferred, -0.35);
  const exitParts = buildExecutionParts(candles, exitIndex, quantity, exitPreferred, plan.win ? 0.35 : -0.35);
  const avgEntry = weightedAverage(entryParts);
  const avgExit = weightedAverage(exitParts);
  let actualPnl = (avgExit - avgEntry) * quantity;

  if ((plan.win && actualPnl <= 0) || (!plan.win && actualPnl >= 0)) {
    const adjustedExit = avgEntry + Math.max(0.01, avgEntry * 0.004) * (plan.win ? 1 : -1);
    exitParts.forEach((part) => {
      part.price = priceInCandle(part.candle, adjustedExit);
    });
    actualPnl = (weightedAverage(exitParts) - avgEntry) * quantity;
  }

  const finalAvgExit = weightedAverage(exitParts);
  const entryAt = entryParts[0].executedAt;
  const exitAt = exitParts.at(-1).executedAt;
  const perShareRisk = Math.max(0.02, Math.abs(finalAvgExit - avgEntry));
  const stopLoss = avgEntry - perShareRisk * 0.85;
  const target = avgEntry + perShareRisk * 1.65;
  const createdAt = entryAt - randInt(60, 240);
  const tradeInfo = stmts.trade.run(
    accountId,
    plan.symbol,
    side,
    quantity,
    avgEntry,
    entryAt,
    finalAvgExit,
    exitAt,
    0,
    round(stopLoss),
    round(target),
    pick(tagNames),
    "closed",
    createdAt,
    exitAt,
  );
  const tradeId = Number(tradeInfo.lastInsertRowid);
  const openingSide = "buy";
  const closingSide = "sell";

  entryParts.forEach((part, index) => {
    stmts.execution.run(
      accountId,
      plan.symbol,
      openingSide,
      part.quantity,
      part.price,
      part.executedAt,
      0,
      "DEMO",
      "TO OPEN",
      tradeId,
      batchId,
      `demo|${date}|${plan.symbol}|${sequence}|open|${index}`,
    );
  });

  exitParts.forEach((part, index) => {
    stmts.execution.run(
      accountId,
      plan.symbol,
      closingSide,
      part.quantity,
      part.price,
      part.executedAt,
      0,
      "DEMO",
      "TO CLOSE",
      tradeId,
      batchId,
      `demo|${date}|${plan.symbol}|${sequence}|close|${index}`,
    );
  });

  const tagId = tagIds.get(pick(tagNames));
  if (tagId) stmts.tradeTag.run(tradeId, tagId);

  return {
    tradeId,
    symbol: plan.symbol,
    pnl: round(actualPnl, 2),
    quantity,
    entryAt,
    exitAt,
    label: plan.label,
    redDay: plan.redDay,
  };
}

function daySummary(results) {
  const pnl = round(results.reduce((sum, result) => sum + result.pnl, 0), 2);
  const winners = results.filter((result) => result.pnl > 0).sort((a, b) => b.pnl - a.pnl);
  const losers = results.filter((result) => result.pnl < 0).sort((a, b) => a.pnl - b.pnl);
  const accuracy = results.length === 0 ? 0 : Math.round((winners.length / results.length) * 100);
  return { pnl, winners, losers, accuracy };
}

function dailyReviewText(results) {
  const summary = daySummary(results);
  const best = summary.winners[0];
  const worst = summary.losers[0];

  if (summary.pnl > 0 && summary.accuracy >= 60) {
    return pick([
      `${summary.accuracy}% accuracy and green on the day. The best trade was ${best?.symbol ?? "the morning setup"}; the main takeaway is that patient entries kept the losses small enough for the winners to matter.`,
      `Good day overall. A few trades were not perfect, but the larger winners did the work and the smaller scratches kept the session controlled.`,
      `Strong session. The read was clearest when volume expanded with the trend, and the day stayed green because the weaker attempts were cut quickly.`,
    ]);
  }

  if (summary.pnl > 0) {
    return pick([
      `Green day, but it took some work. ${best?.symbol ?? "The best setup"} carried the session while a couple of entries still need review for timing.`,
      `Finished green despite some chop. The important part is that the red trades stayed manageable and did not turn into a bigger emotional reset.`,
      `Positive result with mixed execution. Worth reviewing the weaker entries, but the day still showed good restraint after the first few trades.`,
    ]);
  }

  if (summary.pnl < 0) {
    return pick([
      `Red day. The loss stayed contained, but ${worst?.symbol ?? "the biggest loser"} needs a closer look because the entry did not leave enough room for normal volatility.`,
      `Small red day and a useful review session. The best response was stopping the damage instead of pressing for a full recovery.`,
      `The market was choppy and the entries were not clean enough. Main focus tomorrow is waiting for confirmation and keeping size smaller until the setup is obvious.`,
    ]);
  }

  return "Flat day. Nothing dramatic, which is useful in its own way: stay patient, review the entries, and keep the next session simple.";
}

function tradeNoteFor(result, role) {
  if (role === "best") {
    return {
      label: "Best setup",
      tags: ["Followed plan", "Patient", "Let winner work", "Confident"],
      text: pick(tradeNoteTemplates.best),
      lesson: "Repeat this setup when volume, structure, and risk line up.",
    };
  }

  if (role === "good") {
    return {
      label: "Good trade",
      tags: ["Followed plan", "Focused", "Sized correctly"],
      text: pick(tradeNoteTemplates.good),
      lesson: "Keep this as a reference for clean execution without overcomplicating the read.",
    };
  }

  if (result.pnl < -75 || result.redDay) {
    return {
      label: "Rule break",
      tags: ["Oversized", "Moved stop", "Frustrated"],
      text: pick(tradeNoteTemplates.mistake),
      lesson: "The goal is not avoiding losses; it is keeping normal losses from expanding.",
    };
  }

  return {
    label: "Needs review",
    tags: ["Focused", "Took profits early"],
    text: pick(tradeNoteTemplates.review),
    lesson: "Check whether the setup quality justified the entry and share size.",
  };
}

function writeTradeNote(stmts, accountId, date, result, role) {
  const note = tradeNoteFor(result, role);
  stmts.journal.run(
    accountId,
    result.tradeId,
    "trade",
    date,
    note.text,
    JSON.stringify(note.tags),
    null,
    note.lesson,
    note.label === "Good trade" || note.label === "Best setup" ? 1 : 0,
    note.label,
    result.exitAt + 60,
  );
}

function writeDayJournal(stmts, accountId, date, results) {
  const summary = daySummary(results);
  const best = summary.winners[0];
  const worst = summary.losers[0];
  const selected = [];

  if (best) selected.push({ result: best, role: "best" });
  if (summary.winners[1] && summary.pnl > 0) selected.push({ result: summary.winners[1], role: "good" });
  if (worst) selected.push({ result: worst, role: "review" });
  if (summary.pnl < 0 && summary.losers[1]) selected.push({ result: summary.losers[1], role: "review" });

  const uniqueSelected = [];
  const seen = new Set();
  for (const item of selected) {
    if (seen.has(item.result.tradeId)) continue;
    seen.add(item.result.tradeId);
    uniqueSelected.push(item);
  }

  const maxTradeNotes = results.length <= 2 ? 1 : summary.pnl < 0 && results.length >= 5 ? 3 : 2;
  uniqueSelected.slice(0, maxTradeNotes).forEach((item) => {
    writeTradeNote(stmts, accountId, date, item.result, item.role);
  });

  stmts.journal.run(
    accountId,
    null,
    "day",
    date,
    dailyReviewText(results),
    best ? `${best.symbol} was the cleanest trade and gave the day its best lift.` : null,
    worst ? `${worst.symbol} was the trade to review first.` : null,
    "Daily review: identify the best repeatable setup, the worst avoidable loss, and the emotional state behind the decisions.",
    summary.pnl >= 0 && summary.accuracy >= 50 ? 1 : 0,
    summary.pnl >= 0 ? "Calm" : "Frustrated",
    easternEpoch(date, 16, 10),
  );
}

function seed(db) {
  const stmts = buildInsertStatements(db);
  const accountId = Number(stmts.account.run("Paper Trading").lastInsertRowid);
  const batch = stmts.batch.run(accountId, "executions", "demo_seed", "tradingjournaldemo.seed", 0, easternEpoch("2026-06-14", 18, 0));
  const batchId = Number(batch.lastInsertRowid);
  const templateSessions = loadTemplateSessions();
  const tagIds = new Map();

  for (const name of tagNames) {
    const info = stmts.tag.run(name);
    tagIds.set(name, Number(info.lastInsertRowid));
  }

  const dates = [
    ...tradingDaysForMonth(2026, 2).filter((date) => Number(date.slice(-2)) >= 9),
    ...tradingDaysForMonth(2026, 3),
    ...tradingDaysForMonth(2026, 4),
    ...tradingDaysForMonth(2026, 5),
    ...tradingDaysForMonth(2026, 6, 12),
  ];

  let sequence = 1;
  let candleGroupCount = 0;
  const redDays = chooseRedDays(dates);

  for (const [dateIndex, date] of dates.entries()) {
    const plans = buildPlansForDate(date, dateIndex, redDays.has(date));
    const plansBySymbol = new Map();
    const dayResults = [];
    for (const plan of plans) {
      const list = plansBySymbol.get(plan.symbol) ?? [];
      list.push(plan);
      plansBySymbol.set(plan.symbol, list);
    }

    for (const [symbol, symbolPlans] of plansBySymbol.entries()) {
      const template = pick(templateSessions);
      const candles = buildDemoCandles(template, date);
      const usedWindows = [];
      insertCandles(stmts, symbol, candles);
      candleGroupCount += 1;

      for (const plan of symbolPlans) {
        const result = createTradeFromCandles(stmts, accountId, batchId, tagIds, date, plan, candles, usedWindows, sequence);
        dayResults.push(result);
        sequence += 1;
      }
    }

    writeDayJournal(stmts, accountId, date, dayResults);
  }

  for (const [month, text] of Object.entries(monthNotes)) {
    stmts.journal.run(
      accountId,
      null,
      "month",
      month,
      text,
      null,
      null,
      "Review the month by asking whether the biggest losses were controlled and whether the best setups were repeated.",
      1,
      null,
      easternEpoch(`${month}-01`, 16, 30),
    );
  }

  const seenWeeks = new Set();
  for (const date of dates) {
    const start = weekStart(date);
    if (!seenWeeks.has(start)) {
      seenWeeks.add(start);
      stmts.journal.run(
        accountId,
        null,
        "week",
        start,
        "Weekly recap: keep red days small, repeat the cleanest setups, and avoid adding size when the market gets choppy.",
        null,
        null,
        "Zoom out from one red day and evaluate the week as a unit.",
        1,
        null,
        easternEpoch(date, 16, 20),
      );
    }
  }

  stmts.batch.run(accountId, "candles", "demo_seed", "tradingjournaldemo.seed", candleGroupCount, easternEpoch("2026-06-14", 18, 1));
}

mkdirSync(dirname(outputPath), { recursive: true });
for (const suffix of ["", "-wal", "-shm"]) {
  try {
    unlinkSync(`${outputPath}${suffix}`);
  } catch {
    // The file may not exist yet.
  }
}

const db = new Database(outputPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
setupSchema(db);
db.transaction(() => seed(db))();
db.pragma("optimize");
db.pragma("wal_checkpoint(TRUNCATE)");

const counts = db
  .prepare(`
    SELECT
      (SELECT count(*) FROM trades) AS trades,
      (SELECT count(*) FROM executions) AS executions,
      (SELECT count(*) FROM candles) AS candles,
      (SELECT count(*) FROM journal_entries) AS notes
  `)
  .get();
const validation = db
  .prepare(`
    WITH trade_pnl AS (
      SELECT
        id,
        date(entry_at, 'unixepoch') AS day,
        CASE
          WHEN side = 'long' THEN (avg_exit_price - avg_entry_price) * quantity - fees
          ELSE (avg_entry_price - avg_exit_price) * quantity - fees
        END AS pnl
      FROM trades
      WHERE status = 'closed'
    ),
    day_pnl AS (
      SELECT day, sum(pnl) AS pnl
      FROM trade_pnl
      GROUP BY day
    )
    SELECT
      round(sum(trade_pnl.pnl), 2) AS pnl,
      round(100.0 * sum(CASE WHEN trade_pnl.pnl > 0 THEN 1 ELSE 0 END) / count(*), 1) AS accuracy,
      (SELECT count(*) FROM day_pnl WHERE pnl > 0) AS green_days,
      (SELECT count(*) FROM day_pnl) AS days,
      (SELECT count(*) FROM trades WHERE side <> 'long') AS short_trades,
      (
        SELECT count(*)
        FROM (
          SELECT
            t.id,
            min(CASE WHEN e.side = 'buy' THEN e.executed_at END) AS first_buy,
            min(CASE WHEN e.side = 'sell' THEN e.executed_at END) AS first_sell
          FROM trades t
          JOIN executions e ON e.trade_id = t.id
          GROUP BY t.id
        )
        WHERE first_buy IS NULL OR first_sell IS NULL OR first_buy > first_sell
      ) AS backward_trades,
      (
        SELECT count(*)
        FROM executions e
        JOIN candles c
          ON c.symbol = e.symbol
         AND c.timeframe = '1m'
         AND c.t = cast(e.executed_at / 60 AS integer) * 60
        WHERE e.price < c.l OR e.price > c.h
      ) AS bad_fills
    FROM trade_pnl
  `)
  .get();
db.close();

console.log(`Created ${outputPath}`);
console.log(`Trades: ${counts.trades}`);
console.log(`Executions: ${counts.executions}`);
console.log(`Candles: ${counts.candles}`);
console.log(`Journal entries: ${counts.notes}`);
console.log(`P&L: $${validation.pnl}`);
console.log(`Accuracy: ${validation.accuracy}%`);
console.log(`Green days: ${validation.green_days}/${validation.days}`);
console.log(`Short trades: ${validation.short_trades}`);
console.log(`Trades with sell before buy: ${validation.backward_trades}`);
console.log(`Execution prices outside candle ranges: ${validation.bad_fills}`);
