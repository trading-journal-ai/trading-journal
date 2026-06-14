import Link from "next/link";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCandles } from "@/lib/candles";
import TradeChart from "@/components/TradeChart";
import RecapNote from "@/components/RecapNote";
import TradeJournalNote from "@/components/TradeJournalNote";
import { fmtDate, fmtMoney, fmtPrice } from "@/lib/format";
import { decodeJournalTags } from "@/lib/journalLabels";
import { netPnl } from "@/lib/pnl";
import { etDayRange, etDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const fmtTime = (t: number) => timeFmt.format(new Date(t * 1000));

function validDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function safeReturnTo(value: string | undefined, fallback: string): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function pnlClass(value: number | null): string {
  if (value == null) return "text-[var(--muted)]";
  if (value > 0) return "text-[var(--green)]";
  if (value < 0) return "text-[var(--red)]";
  return "text-[var(--muted)]";
}

function tradeNoteBody(note: typeof schema.journalEntries.$inferSelect): string {
  return note.lessons || note.thesis || "No note text.";
}

export default async function TickerDayReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; symbol?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const date = validDate(params.date);
  const symbol = params.symbol?.trim().toUpperCase();
  const backHref = safeReturnTo(params.returnTo, "/trades");

  if (!symbol || !date) {
    return (
      <div className="mx-auto max-w-[860px] space-y-6">
        <Link href={backHref} className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]">
          Back
        </Link>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          Select a ticker and date to review its trades for the day.
        </div>
      </div>
    );
  }

  const { start, end } = etDayRange(date);
  let trades = await db
    .select()
    .from(schema.trades)
    .where(
      and(
        eq(schema.trades.symbol, symbol),
        gte(schema.trades.entryAt, start),
        lte(schema.trades.entryAt, end),
      ),
    )
    .orderBy(asc(schema.trades.entryAt));

  trades = trades.filter((trade) => trade.entryAt != null && etDateString(trade.entryAt) === date);
  const tradeIds = trades.map((trade) => trade.id);

  const execs =
    tradeIds.length > 0
      ? await db
          .select()
          .from(schema.executions)
          .where(inArray(schema.executions.tradeId, tradeIds))
          .orderBy(asc(schema.executions.executedAt))
      : [];

  const dayNote = (
    await db
      .select()
      .from(schema.journalEntries)
      .where(
        and(
          eq(schema.journalEntries.scope, "day"),
          eq(schema.journalEntries.scopeKey, date),
        ),
      )
      .limit(1)
  )[0];

  const tradeNotes =
    tradeIds.length > 0
      ? await db
          .select()
          .from(schema.journalEntries)
          .where(inArray(schema.journalEntries.tradeId, tradeIds))
          .orderBy(asc(schema.journalEntries.createdAt))
      : [];
  const tradesById = new Map(trades.map((trade) => [trade.id, trade]));

  const firstAt = execs[0]?.executedAt ?? trades[0]?.entryAt ?? start;
  const lastAt = execs.at(-1)?.executedAt ?? trades.at(-1)?.exitAt ?? firstAt;
  const pad = 20 * 60;
  const { candles, error } = await getCandles(symbol, firstAt - pad, lastAt + pad);

  const totalPnl = trades.reduce((sum, trade) => sum + (netPnl(trade) ?? 0), 0);
  const totalShares = trades.reduce((sum, trade) => sum + Math.abs(trade.quantity), 0);
  const wins = trades.filter((trade) => (netPnl(trade) ?? 0) > 0).length;
  const losses = trades.filter((trade) => (netPnl(trade) ?? 0) < 0).length;
  const counted = wins + losses;

  type Stat = { label: string; value: string; className?: string };
  const stats: Stat[] = [
    { label: "Trades", value: trades.length.toLocaleString() },
    { label: "Fills", value: execs.length.toLocaleString() },
    { label: "Shares", value: totalShares.toLocaleString() },
    { label: "Accuracy", value: counted === 0 ? "—" : `${Math.round((wins / counted) * 100)}%` },
    { label: "P&L", value: fmtMoney(totalPnl), className: pnlClass(totalPnl) },
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-12">
        <Link href={backHref} className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]">
          Back
        </Link>
      </div>

      <div className="mb-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {symbol}
          <span className="ml-2 text-sm font-normal text-[var(--muted)]">
            {fmtDate(start)}
          </span>
        </h1>
      </div>

      <section className="mb-2 grid max-w-[820px] gap-6 border-t border-[var(--hairline)] py-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              {stat.label}
            </div>
            <div className={`text-xl font-semibold tabular-nums ${stat.className ?? ""}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </section>

      <section className="mb-8 grid gap-10 xl:grid-cols-[820px_420px] xl:items-start">
        <div className="min-w-0">
          {error ? (
            <div className="rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3 text-sm text-[var(--red)]">
              Couldn&apos;t load candles: {error}
            </div>
          ) : (
            <TradeChart
              candles={candles}
              markers={execs.map((execution) => ({
                t: execution.executedAt,
                price: execution.price,
                side: execution.side as "buy" | "sell",
              }))}
            />
          )}
        </div>

        <aside className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Daily Note
            </h2>
            <div className="text-sm leading-6">
              <RecapNote
                scope="day"
                scopeKey={date}
                text={dayNote?.lessons ?? ""}
                placeholder="Add a daily note: market read, plan, execution, emotions, what worked, what to fix tomorrow."
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Trade Notes
            </h2>
            {tradeNotes.length > 0 ? (
              <div className="space-y-6">
                {tradeNotes.map((note) => {
                  const trade = note.tradeId == null ? undefined : tradesById.get(note.tradeId);
                  if (!trade) return null;

                  return (
                    <div key={note.id} className="space-y-3">
                      <TradeJournalNote
                        noteId={note.id}
                        tradeId={trade.id}
                        symbol={trade.symbol}
                        text={tradeNoteBody(note)}
                        primaryLabel={note.emotionalState}
                        processTags={decodeJournalTags(note.whatWentWell)}
                        emotionTags={decodeJournalTags(note.whatWentWrong)}
                        showHeader
                        showFormHeader
                      />
                      <Link
                        href={`/trades/${trade.id}?returnTo=${encodeURIComponent(`/trades/review?date=${date}&symbol=${symbol}&returnTo=${encodeURIComponent(backHref)}`)}`}
                        className="inline-flex font-mono text-[12px] text-[var(--blue)] hover:underline"
                      >
                        View trade -&gt;
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[var(--muted)] italic">
                No trade notes for {symbol} on this day yet.
              </p>
            )}
          </section>
        </aside>
      </section>

      <section className="max-w-[820px]">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Executions
        </h2>
        <div className="overflow-x-auto border-y border-[var(--hairline)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--hairline)] text-left font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                {["Time (ET)", "Side", "Shares", "Price", "Effect"].map((column) => (
                  <th key={column} className="px-3 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {execs.map((execution) => (
                <tr key={execution.id}>
                  <td className="px-3 py-2 tabular-nums">{fmtTime(execution.executedAt)}</td>
                  <td
                    className="px-3 py-2"
                    style={{ color: execution.side === "buy" ? "var(--green)" : "var(--red)" }}
                  >
                    {execution.side.toUpperCase()}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{execution.quantity.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{fmtPrice(execution.price)}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{execution.posEffect ?? "—"}</td>
                </tr>
              ))}
              {execs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[var(--muted)]">
                    No executions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
