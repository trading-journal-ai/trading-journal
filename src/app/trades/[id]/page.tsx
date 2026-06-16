import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import { getCandles } from "@/lib/candles";
import Breadcrumbs, { originCrumbFromHref } from "@/components/Breadcrumbs";
import TradeChart from "@/components/TradeChart";
import TradeJournalNote from "@/components/TradeJournalNote";
import TradeNoteComposer from "@/components/TradeNoteComposer";
import ReviewHeader from "@/components/ReviewHeader";
import { fmtDate, fmtMoney, fmtPrice } from "@/lib/format";
import { decodeJournalTags } from "@/lib/journalLabels";
import { etDateString, etDayRange } from "@/lib/time";

export const dynamic = "force-dynamic";

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const fmtTime = (t: number) => timeFmt.format(new Date(t * 1000));
const shortDateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

function shortDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return shortDateFmt.format(new Date(Date.UTC(year, month - 1, day)));
}

function journalNoteBody(note: typeof schema.journalEntries.$inferSelect): string {
  return note.lessons || note.thesis || "No note text.";
}

function holdingPeriod(from: number, to: number): string {
  const s = Math.max(0, to - from);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default async function TradeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const tradeId = Number(id);
  if (!Number.isInteger(tradeId)) notFound();
  const backHref = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/trades";
  const activeAccount = await getActiveAccount();

  const trade = (
    await db.select().from(schema.trades).where(eq(schema.trades.id, tradeId)).limit(1)
  )[0];
  if (!trade || trade.accountId !== activeAccount.id) notFound();

  const execs = await db
    .select()
    .from(schema.executions)
    .where(eq(schema.executions.tradeId, tradeId))
    .orderBy(asc(schema.executions.executedAt));

  const notes = await db
    .select()
    .from(schema.journalEntries)
    .where(eq(schema.journalEntries.tradeId, tradeId))
    .orderBy(asc(schema.journalEntries.createdAt));

  const lastAt = trade.exitAt ?? execs.at(-1)?.executedAt ?? trade.entryAt ?? 0;
  const firstAt = trade.entryAt ?? execs[0]?.executedAt ?? lastAt;
  const tradeDate = trade.entryAt == null ? undefined : etDateString(trade.entryAt);
  let tradeOrdinal = 1;

  if (tradeDate) {
    const { start, end } = etDayRange(tradeDate);
    const sameDaySymbolTrades = (
      await db
        .select({ id: schema.trades.id, entryAt: schema.trades.entryAt })
        .from(schema.trades)
        .where(
          and(
            eq(schema.trades.accountId, activeAccount.id),
            eq(schema.trades.symbol, trade.symbol),
            gte(schema.trades.entryAt, start),
            lte(schema.trades.entryAt, end),
          ),
        )
        .orderBy(asc(schema.trades.entryAt))
    ).filter((row) => row.entryAt != null && etDateString(row.entryAt) === tradeDate);
    const index = sameDaySymbolTrades.findIndex((row) => row.id === trade.id);
    tradeOrdinal = index >= 0 ? index + 1 : 1;
  }

  const pad = 20 * 60; // 20 minutes either side
  const { candles, error } = await getCandles(trade.symbol, firstAt - pad, lastAt + pad);

  const dir = trade.side === "long" ? 1 : -1;
  const gross =
    trade.avgEntryPrice != null && trade.avgExitPrice != null
      ? (trade.avgExitPrice - trade.avgEntryPrice) * dir * trade.quantity
      : null;
  const net = gross == null ? null : gross - trade.fees;

  const perShare = net == null || trade.quantity === 0 ? null : net / trade.quantity;

  const pnlClass =
    net == null ? "" : net >= 0 ? "text-[var(--green)]" : "text-[var(--red)]";
  const perShareClass =
    perShare == null ? "" : perShare >= 0 ? "text-[var(--green)]" : "text-[var(--red)]";
  const summaryStats = [
    { label: "1 trade" },
    { label: `${execs.length.toLocaleString()} fills` },
    { label: `${trade.quantity.toLocaleString()} ${Math.abs(trade.quantity) === 1 ? "share" : "shares"}` },
    { label: `${trade.exitAt ? holdingPeriod(firstAt, trade.exitAt) : "open"} held` },
    {
      label: `P&L ${net == null ? "—" : fmtMoney(net)}`,
      className: pnlClass,
    },
    {
      label: `Per share ${perShare == null ? "—" : fmtMoney(perShare)}`,
      className: perShareClass,
    },
  ];
  const originCrumb = originCrumbFromHref(backHref, "/trades");
  const sectionCrumbs = originCrumb.label === "Trades" ? [] : [{ label: "Trades", href: "/trades" }];
  const tickerScope =
    tradeDate == null
      ? []
      : [
          {
            label: `${trade.symbol} · ${shortDateLabel(tradeDate)}`,
            href: `/trades/review?date=${tradeDate}&symbol=${trade.symbol}&returnTo=${encodeURIComponent(originCrumb.href ?? "/trades")}`,
          },
        ];

  return (
    <div className="mx-auto max-w-[1180px]">
      <Breadcrumbs
        back={originCrumb}
        items={[...sectionCrumbs, ...tickerScope]}
        current={`Trade ${tradeOrdinal}`}
        className="mb-12"
      />

      <div className="mb-7">
        <ReviewHeader
          eyebrow="Trade Detail"
          title={
            <>
              {trade.symbol}
              {trade.side === "short" && (
                <span className="ml-3 align-middle rounded bg-[var(--red)]/15 px-2 py-1 text-xs font-semibold text-[var(--red)]">
                  SHORT
                </span>
              )}
            </>
          }
          date={fmtDate(trade.entryAt)}
          metrics={summaryStats}
          action={
            trade.entryAt ? (
              <Link
                href={`/trades/review?date=${etDateString(trade.entryAt)}&symbol=${trade.symbol}&returnTo=${encodeURIComponent(`/trades/${trade.id}?returnTo=${encodeURIComponent(backHref)}`)}`}
                className="font-mono text-[12px] font-medium text-[var(--blue)] hover:underline"
              >
                Ticker day review
              </Link>
            ) : null
          }
        />
      </div>

      <section className="mb-6 grid gap-10 border-t border-[var(--hairline)] pt-7 lg:grid-cols-[minmax(0,760px)_minmax(280px,380px)] lg:items-start">
        <div className="min-w-0">
          {error ? (
            <div className="rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3 text-sm text-[var(--red)]">
              Couldn&apos;t load candles: {error}
            </div>
          ) : (
            <TradeChart
              candles={candles}
              markers={execs.map((e) => ({
                t: e.executedAt,
                price: e.price,
                side: e.side as "buy" | "sell",
              }))}
              variant="review"
            />
          )}
        </div>

        <aside className="space-y-8">
          <section aria-label="Executions" className="border-b border-[var(--hairline)] pb-6">
            <div className="grid grid-cols-4 gap-x-2 gap-y-2 font-mono text-[12px]">
              <div className="pb-1 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Time</div>
              <div className="pb-1 text-center text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Side</div>
              <div className="pb-1 text-center text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Shares</div>
              <div className="pb-1 text-right text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Price</div>
              {execs.map((e) => (
                <div key={e.id} className="contents">
                  <div className="tabular-nums text-[var(--foreground)]">{fmtTime(e.executedAt).slice(0, 5)}</div>
                  <div className="text-center" style={{ color: e.side === "buy" ? "var(--green)" : "var(--red)" }}>
                    {e.side.toUpperCase().slice(0, 1)}
                  </div>
                  <div className="text-center tabular-nums text-[var(--foreground)]">{e.quantity.toLocaleString()}</div>
                  <div className="text-right tabular-nums text-[var(--foreground)]">{fmtPrice(e.price)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Trade Note
            </h2>

            {notes.length > 0 ? (
              <div className="space-y-6">
                {notes.map((note) => {
                  return (
                    <TradeJournalNote
                      key={note.id}
                      noteId={note.id}
                      tradeId={trade.id}
                      symbol={trade.symbol}
                      text={journalNoteBody(note)}
                      primaryLabel={note.emotionalState}
                      processTags={decodeJournalTags(note.whatWentWell)}
                      emotionTags={decodeJournalTags(note.whatWentWrong)}
                      showHeader
                      showFormHeader
                    />
                  );
                })}
              </div>
            ) : (
              <TradeNoteComposer tradeId={trade.id} symbol={trade.symbol} />
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
