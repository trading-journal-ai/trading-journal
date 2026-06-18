#!/usr/bin/env node

import { resolve } from "node:path";
import Database from "better-sqlite3";

const MARKET_TZ = "America/New_York";
const DEFAULTS = {
  db: "data/tradingjournaldemo.db",
  account: "Paper Account",
  month: "2026-06",
};

const etDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: MARKET_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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
  node scripts/seed-demo-journal-notes.mjs --db data/tradingjournaldemo.db --month 2026-06
  node scripts/seed-demo-journal-notes.mjs --month all

Clears and regenerates demo-only journal notes for a month. It creates one
daily recap per active trading day, plus trade notes for the day's best winner
and worst loser when available.
`);
}

function etDateString(epochSeconds) {
  return etDateFmt.format(new Date(epochSeconds * 1000));
}

function fmtMoney(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtAbsMoney(value) {
  return `$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function percentPhrase(value) {
  const rounded = Math.round(value);
  const article = rounded === 80 || rounded === 81 || rounded === 82 || rounded === 83 || rounded === 84 || rounded === 85 || rounded === 86 || rounded === 87 || rounded === 88 || rounded === 89 ? "an" : "a";
  return `${article} ${rounded}%`;
}

function pnlForTrade(trade) {
  if (trade.avg_entry_price == null || trade.avg_exit_price == null) return 0;
  const direction = trade.side === "long" ? 1 : -1;
  return (trade.avg_exit_price - trade.avg_entry_price) * direction * trade.quantity - trade.fees;
}

function encodeTags(tags) {
  return tags.length > 0 ? JSON.stringify(tags) : null;
}

function dayTone(day) {
  if (day.pnl > 0 && day.winRate >= 60) return "strong";
  if (day.pnl > 0) return "mixed-green";
  if (day.pnl < 0 && day.winRate >= 50) return "red-despite-accuracy";
  if (day.pnl < 0) return "red";
  return "flat";
}

function dailyRecap(day, index) {
  const best = day.winners[0];
  const worst = day.losers.at(-1);
  const winRate = `${Math.round(day.winRate)}%`;
  const winRateWithArticle = percentPhrase(day.winRate);
  const tradeWord = day.trades.length === 1 ? "trade" : "trades";
  const bestText = best ? `${best.symbol} was the best lift at ${fmtMoney(best.pnl)}` : "There was no clean winning trade to lean on";
  const worstText = worst ? `${worst.symbol} was the main drag at ${fmtMoney(worst.pnl)}` : "losses stayed out of the way";
  const tone = dayTone(day);

  if (tone === "strong") {
    const variants = [
      `Green day with ${day.trades.length} ${tradeWord} and ${winRateWithArticle} win rate. ${bestText}, while ${worstText}. The main thing to carry forward is that the better trades had time to work; stay patient when the move confirms instead of forcing extra entries.`,
      `Good day overall. I finished up ${fmtMoney(day.pnl)} with enough accuracy to keep the session controlled. ${bestText}. I still want to review the weaker entry so I can separate normal variance from avoidable execution noise.`,
      `Strong session. The day rewarded patience more than activity, and the biggest winner did most of the heavy lifting. I want to keep looking for the moments where volume, direction, and entry location line up before adding risk.`,
    ];
    return variants[index % variants.length];
  }

  if (tone === "mixed-green") {
    return `Green day, but not especially clean. I finished up ${fmtMoney(day.pnl)} across ${day.trades.length} ${tradeWord} with a ${winRate} win rate. ${bestText}; ${worstText}. The review focus is quality control: keep the winners, but reduce the small avoidable cuts that make the day feel busier than it needs to be.`;
  }

  if (tone === "red-despite-accuracy") {
    return `Red day even though the win rate was ${winRate}. That usually means the losing trades carried too much weight relative to the wins. ${worstText}. The note for next time is simple: if the trade is not working quickly, reduce the loss before it becomes the story of the day.`;
  }

  if (tone === "red") {
    const variants = [
      `Red day with ${day.trades.length} ${tradeWord}. ${worstText}, and ${bestText.toLowerCase()}. The session needs a tighter stop-and-review moment after the first meaningful loser so the next trade is intentional, not a reaction.`,
      `Tough session. I ended down ${fmtAbsMoney(day.pnl)} and the day did not offer enough clean follow-through to justify pressing. The key review question is whether the losing trade was part of the plan or whether I was trying to make something happen.`,
      `This was a damage-control day. The trades did not build into a clean rhythm, and the largest loss set the tone. For the next session, I want fewer attempts, clearer confirmation, and faster acceptance when the setup is not there.`,
    ];
    return variants[index % variants.length];
  }

  return `Flat session with ${day.trades.length} ${tradeWord}. There was not much edge in the result, so the value of the review is mostly process: did I wait for the right spots, and did I avoid forcing trades when the market did not offer much?`;
}

function winnerNote(trade, day) {
  const templates = [
    `Best trade of the day. ${trade.symbol} contributed ${fmtMoney(trade.pnl)} and did the most to shape the session. The entry caught enough of the move to justify holding for the larger piece instead of rushing the exit.`,
    `${trade.symbol} was the cleanest winner. This is the kind of trade I want to study: defined entry, enough room for the move to develop, and no need to force extra decisions once it started working.`,
    `Good execution on ${trade.symbol}. The trade added ${fmtMoney(trade.pnl)} and helped stabilize the day. Next review is whether there was a spot to hold a little longer without giving back too much of the move.`,
  ];
  const note = templates[day.index % templates.length];
  return {
    note,
    primaryLabel: day.pnl > 0 ? "Best setup" : "Good trade",
    processTags: ["Followed plan", "Patient", trade.pnl > 100 ? "Let winner work" : "Focused"],
    emotionTags: day.winRate >= 60 ? ["Calm"] : ["Confident"],
  };
}

function loserNote(trade, day) {
  const templates = [
    `Worst trade of the day. ${trade.symbol} cost ${fmtAbsMoney(trade.pnl)}, so this is the one to inspect closely. I want to check whether the entry was late, whether the stop was respected, and whether the next trade was influenced by this loss.`,
    `${trade.symbol} was the main drag. The loss was large enough to change the feel of the session, which means the review should focus less on being right and more on how quickly the trade was invalidated.`,
    `Needs review. ${trade.symbol} did not pay and the exit came after the trade had already moved against me. Next time, the job is to recognize the failed read earlier and keep the loss small enough that the day stays workable.`,
  ];
  const note = templates[day.index % templates.length];
  return {
    note,
    primaryLabel: trade.pnl < -100 ? "Needs review" : "Bad trade",
    processTags: trade.pnl < -100 ? ["Moved stop", "Held too long"] : ["Cut loss"],
    emotionTags: day.pnl < 0 ? ["Frustrated"] : ["Impatient"],
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

if (args.month !== "all" && !/^\d{4}-\d{2}$/.test(args.month)) {
  throw new Error(`Invalid --month value: ${args.month}`);
}

const db = new Database(resolve(args.db));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const account = db.prepare("select id from accounts where name = ?").get(args.account);
if (!account) throw new Error(`Could not find account "${args.account}".`);

const allTrades = db
  .prepare(
    `select id, account_id, symbol, side, quantity, avg_entry_price, avg_exit_price, entry_at, exit_at, fees
     from trades
     where account_id = ? and entry_at is not null
     order by entry_at, id`,
  )
  .all(account.id)
  .map((trade) => ({ ...trade, day: etDateString(trade.entry_at), pnl: pnlForTrade(trade) }))
  .filter((trade) => args.month === "all" || trade.day.startsWith(`${args.month}-`));

const days = new Map();
for (const trade of allTrades) {
  const existing = days.get(trade.day) ?? [];
  existing.push(trade);
  days.set(trade.day, existing);
}

const insertDayNote = db.prepare(`
  insert into journal_entries (account_id, scope, scope_key, lessons, created_at)
  values (?, 'day', ?, ?, ?)
`);

const insertTradeNote = db.prepare(`
  insert into journal_entries (
    account_id, trade_id, scope, lessons, emotional_state, what_went_well, what_went_wrong, created_at
  ) values (?, ?, 'trade', ?, ?, ?, ?, ?)
`);

const deleteAllDayNotes = db.prepare("delete from journal_entries where account_id = ? and scope = 'day'");
const deleteMonthDayNotes = db.prepare(
  "delete from journal_entries where account_id = ? and scope = 'day' and scope_key like ?",
);
const deleteTradeNote = db.prepare("delete from journal_entries where account_id = ? and trade_id = ?");

const seed = db.transaction(() => {
  if (args.month === "all") {
    deleteAllDayNotes.run(account.id);
  } else {
    deleteMonthDayNotes.run(account.id, `${args.month}-%`);
  }

  for (const trade of allTrades) {
    deleteTradeNote.run(account.id, trade.id);
  }

  let dayNotes = 0;
  let tradeNotes = 0;
  let index = 0;

  for (const [date, trades] of [...days.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const pnls = trades.map((trade) => trade.pnl);
    const winners = trades.filter((trade) => trade.pnl > 0).sort((a, b) => b.pnl - a.pnl);
    const losers = trades.filter((trade) => trade.pnl < 0).sort((a, b) => b.pnl - a.pnl);
    const pnl = pnls.reduce((sum, value) => sum + value, 0);
    const counted = winners.length + losers.length;
    const day = {
      date,
      index,
      trades,
      winners,
      losers,
      pnl,
      winRate: counted === 0 ? 0 : (winners.length / counted) * 100,
    };

    insertDayNote.run(account.id, date, dailyRecap(day, index), trades[0].entry_at);
    dayNotes += 1;

    const best = winners[0];
    const worst = losers.at(-1);
    const selected = [best, worst].filter(Boolean);
    const seen = new Set();

    for (const trade of selected) {
      if (seen.has(trade.id)) continue;
      seen.add(trade.id);
      const data = trade.pnl > 0 ? winnerNote(trade, day) : loserNote(trade, day);
      insertTradeNote.run(
        account.id,
        trade.id,
        data.note,
        data.primaryLabel,
        encodeTags(data.processTags),
        encodeTags(data.emotionTags),
        trade.exit_at ?? trade.entry_at,
      );
      tradeNotes += 1;
    }

    index += 1;
  }

  return { dayNotes, tradeNotes };
});

const result = seed();
db.pragma("wal_checkpoint(FULL)");

console.log(
  `Seeded ${result.dayNotes} daily recaps and ${result.tradeNotes} trade notes for ${args.month} in ${args.db}.`,
);
