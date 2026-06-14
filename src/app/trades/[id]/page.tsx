import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCandles } from "@/lib/candles";
import TradeChart from "@/components/TradeChart";
import TradeJournalNote from "@/components/TradeJournalNote";
import TradeNoteComposer from "@/components/TradeNoteComposer";
import { fmtDate, fmtMoney, fmtPrice } from "@/lib/format";
import { decodeJournalTags } from "@/lib/journalLabels";
import { etDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const fmtTime = (t: number) => timeFmt.format(new Date(t * 1000));

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

  const trade = (
    await db.select().from(schema.trades).where(eq(schema.trades.id, tradeId)).limit(1)
  )[0];
  if (!trade) notFound();

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
  const pad = 20 * 60; // 20 minutes either side
  const { candles, error } = await getCandles(trade.symbol, firstAt - pad, lastAt + pad);

  const dir = trade.side === "long" ? 1 : -1;
  const gross =
    trade.avgEntryPrice != null && trade.avgExitPrice != null
      ? (trade.avgExitPrice - trade.avgEntryPrice) * dir * trade.quantity
      : null;
  const net = gross == null ? null : gross - trade.fees;

  const perShare = net == null || trade.quantity === 0 ? null : net / trade.quantity;

  type Stat = { label: string; value: string; color?: string };
  const stats: Stat[] = [
    { label: "Shares", value: trade.quantity.toLocaleString() },
    { label: "Fills", value: String(execs.length) },
    { label: "Held", value: trade.exitAt ? holdingPeriod(firstAt, trade.exitAt) : "open" },
    {
      label: "P&L",
      value: net == null ? "—" : fmtMoney(net),
      color:
        net == null ? undefined : net >= 0 ? "var(--green)" : "var(--red)",
    },
    {
      label: "Per share",
      value: perShare == null ? "—" : fmtMoney(perShare),
      color:
        perShare == null ? undefined : perShare >= 0 ? "var(--green)" : "var(--red)",
    },
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-2">
        <Link href={backHref} className="mb-12 inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]">
          Back
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {trade.symbol}
          {trade.side === "short" && (
            <span className="ml-2 align-middle rounded bg-[var(--red)]/15 px-1.5 py-0.5 text-xs font-semibold text-[var(--red)]">
              SHORT
            </span>
          )}
          <span className="ml-2 text-sm font-normal text-[var(--muted)]">
            {fmtDate(trade.entryAt)}
          </span>
          {trade.entryAt ? (
            <Link
              href={`/trades/review?date=${etDateString(trade.entryAt)}&symbol=${trade.symbol}&returnTo=${encodeURIComponent(`/trades/${trade.id}?returnTo=${encodeURIComponent(backHref)}`)}`}
              className="ml-4 align-middle font-mono text-[12px] font-normal text-[var(--blue)] hover:underline"
            >
              Ticker day review -&gt;
            </Link>
          ) : null}
        </h1>
      </div>

      <section className="mb-2 grid max-w-[820px] gap-6 border-t border-[var(--hairline)] py-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="min-w-0"
          >
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              {s.label}
            </div>
            <div
              className="text-xl font-semibold tabular-nums"
              style={s.color ? { color: s.color } : undefined}
            >
              {s.value}
            </div>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-10 xl:grid-cols-[820px_420px] xl:items-start">
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
            />
          )}
        </div>

        <aside className="space-y-4">
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
        </aside>
      </section>

      <section className="max-w-[820px]">
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">
          Executions
        </h2>
        <div className="overflow-x-auto border-y border-[var(--hairline)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--hairline)] text-left font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                {["Time (ET)", "Side", "Shares", "Price", "Effect"].map((c) => (
                  <th key={c} className="px-3 py-3 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {execs.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 tabular-nums">{fmtTime(e.executedAt)}</td>
                  <td
                    className="px-3 py-2"
                    style={{ color: e.side === "buy" ? "var(--green)" : "var(--red)" }}
                  >
                    {e.side.toUpperCase()}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{e.quantity.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{fmtPrice(e.price)}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">{e.posEffect ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
