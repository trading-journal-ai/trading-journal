"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteTickerReviewAction, markTickerReviewReadyAction, upsertTickerReviewAction } from "@/app/journal/actions";
import SharedNoteComposer from "@/components/SharedNoteComposer";
import {
  TradeAttachments,
  TradeTagPicker,
  type ReviewAttachment,
  type ReviewTagOption,
} from "@/components/TickerReviewTradeExtras";

export type TickerReviewTrade = {
  id: number;
  number: number;
  entryTime: string;
  shares: string;
  executions: string;
  entryPrice: string;
  exitPrice: string;
  holdDuration: string | null;
  pnl: string;
  pnlValue: number | null;
  pnlTone: "positive" | "negative" | "neutral";
  perShare: string;
  perShareValue: number | null;
  perShareTone: "positive" | "negative" | "neutral";
  tags: string[];
  attachments: ReviewAttachment[];
};

function pnlClass(tone: TickerReviewTrade["pnlTone"]) {
  if (tone === "positive") return "text-[var(--green)]";
  if (tone === "negative") return "text-[var(--red)]";
  return "text-[var(--muted)]";
}

function formatSignedMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function tradeAnchor(trade: TickerReviewTrade) {
  return `@trade${trade.number} · @${trade.entryTime}`;
}

function noteMentionsTrade(note: string, tradeNumber: number) {
  return new RegExp(`(?:^|\\n)@(?:trade)?${tradeNumber}(?![\\d:])`, "i").test(note);
}

function appendTradeAnchor(note: string, trade: TickerReviewTrade) {
  if (noteMentionsTrade(note, trade.number)) return note;
  const current = note.trimEnd();
  return `${current}${current ? "\n\n" : ""}${tradeAnchor(trade)}\n`;
}

function normalizeDuplicateEmptyTradeAnchors(note: string) {
  const lines = note.split(/\r?\n/);
  const seenTradeNumbers = new Set<number>();
  const isSectionAnchor = (line: string) => /^@(?:(?:trade)?\d+(?![\d:])|\d{1,2}:\d{2})/i.test(line);

  return lines
    .filter((line, index) => {
      const tradeMatch = line.match(/^@(?:trade)?(\d+)(?![\d:])/i);
      if (!tradeMatch) return true;

      const tradeNumber = Number(tradeMatch[1]);
      const duplicate = seenTradeNumbers.has(tradeNumber);
      seenTradeNumbers.add(tradeNumber);
      if (!duplicate) return true;

      for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
        if (isSectionAnchor(lines[nextIndex])) break;
        if (lines[nextIndex].trim()) return true;
      }
      return false;
    })
    .join("\n")
    .trimEnd();
}

function mentionedTradeIds(note: string, trades: TickerReviewTrade[]) {
  const tradeByNumber = new Map(trades.map((trade) => [trade.number, trade.id]));
  const ids = new Set<number>();

  for (const match of note.matchAll(/@(?:trade)?(\d+)(?![\d:])/gi)) {
    const tradeId = tradeByNumber.get(Number(match[1]));
    if (tradeId) ids.add(tradeId);
  }

  return ids;
}

type SavedReviewSection =
  | { kind: "overall"; body: string }
  | { kind: "trade"; tradeNumber: number; time: string | null; body: string }
  | { kind: "moment"; time: string; body: string };

function savedReviewSections(note: string, trades: TickerReviewTrade[]): SavedReviewSection[] {
  const tradeByNumber = new Map(trades.map((trade) => [trade.number, trade]));
  const sections: SavedReviewSection[] = [];
  let current: SavedReviewSection = { kind: "overall", body: "" };

  for (const line of note.split(/\r?\n/)) {
    const anchor = line.match(/^@(?:trade)?(\d+)(?:\s*·\s*@?(\d{1,2}:\d{2}))?\s*(.*)$/i);
    if (anchor) {
      if (current.body.trim() || current.kind !== "overall") sections.push(current);
      const tradeNumber = Number(anchor[1]);
      const trade = tradeByNumber.get(tradeNumber);
      current = {
        kind: "trade",
        tradeNumber,
        time: anchor[2] ?? trade?.entryTime ?? null,
        body: anchor[3],
      };
      continue;
    }

    const momentAnchor = line.match(/^@(\d{1,2}:\d{2})\s*(.*)$/);
    if (momentAnchor) {
      if (current.body.trim() || current.kind !== "overall") sections.push(current);
      current = {
        kind: "moment",
        time: momentAnchor[1],
        body: momentAnchor[2],
      };
      continue;
    }

    current.body = current.body ? `${current.body}\n${line}` : line;
  }

  if (current.body.trim() || current.kind !== "overall") sections.push(current);
  return sections;
}

export default function TickerReviewWorkspace({
  date,
  symbol,
  returnTo,
  tickerNote,
  trades,
  availableTags,
  readyForCoach,
  readOnly,
  initialTradeId = null,
}: {
  date: string;
  symbol: string;
  returnTo: string;
  tickerNote: string;
  trades: TickerReviewTrade[];
  availableTags: ReviewTagOption[];
  readyForCoach: boolean;
  readOnly: boolean;
  initialTradeId?: number | null;
}) {
  const initialTrade = initialTradeId == null ? undefined : trades.find((trade) => trade.id === initialTradeId);
  const [note, setNote] = useState(() => {
    const normalizedNote = normalizeDuplicateEmptyTradeAnchors(tickerNote);
    return initialTrade ? appendTradeAnchor(normalizedNote, initialTrade) : normalizedNote;
  });
  const [editing, setEditing] = useState(() => initialTrade != null || !tickerNote.trim());
  const [hasSavedNote, setHasSavedNote] = useState(() => Boolean(tickerNote.trim()));
  const [isSaving, startSaving] = useTransition();
  const anchoredTradeIds = useMemo(() => mentionedTradeIds(note, trades), [note, trades]);
  const savedSections = useMemo(() => savedReviewSections(note, trades), [note, trades]);
  const activeTrade = useMemo(() => {
    let activeTradeNumber: number | null = null;
    for (const match of note.matchAll(/@(?:trade)?(\d+)(?![\d:])/gi)) {
      activeTradeNumber = Number(match[1]);
    }
    return activeTradeNumber == null
      ? undefined
      : trades.find((trade) => trade.number === activeTradeNumber);
  }, [note, trades]);
  const suggestedTrades = useMemo(() => {
    const closedTrades = trades.filter((trade) => trade.pnlValue != null);
    if (closedTrades.length === 0) return [];
    const best = closedTrades.reduce((current, trade) => (trade.pnlValue! > current.pnlValue! ? trade : current));
    const worst = closedTrades.reduce((current, trade) => (trade.pnlValue! < current.pnlValue! ? trade : current));
    return best.id === worst.id ? [best] : [best, worst];
  }, [trades]);
  const tradeSummary = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let grossWins = 0;
    let grossLosses = 0;
    let totalPnl = 0;

    for (const trade of trades) {
      if (trade.pnlValue == null) continue;
      totalPnl += trade.pnlValue;
      if (trade.pnlValue > 0) {
        wins += 1;
        grossWins += trade.pnlValue;
      } else if (trade.pnlValue < 0) {
        losses += 1;
        grossLosses += Math.abs(trade.pnlValue);
      }
    }

    const countedTrades = wins + losses;
    return {
      accuracy: countedTrades > 0 ? `${Math.round((wins / countedTrades) * 100)}%` : "—",
      profitFactor: grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : grossWins > 0 ? "∞" : "—",
      totalPnl: formatSignedMoney(totalPnl),
      totalPnlTone: totalPnl > 0 ? "positive" as const : totalPnl < 0 ? "negative" as const : "neutral" as const,
    };
  }, [trades]);

  function openNote() {
    setEditing(true);
    requestAnimationFrame(() => document.getElementById("ticker-review-note")?.focus());
  }

  function focusNoteAtEnd() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const textarea = document.getElementById("ticker-review-note") as HTMLTextAreaElement | null;
        if (!textarea) return;
        const end = textarea.value.length;
        textarea.focus();
        textarea.setSelectionRange(end, end);
      });
    });
  }

  function addTradeMoment(trade: TickerReviewTrade) {
    setNote((current) => appendTradeAnchor(current, trade));
    setEditing(true);
    focusNoteAtEnd();
  }

  function saveNote(formData: FormData) {
    startSaving(async () => {
      await upsertTickerReviewAction(formData);
      setHasSavedNote(Boolean(String(formData.get("body") ?? "").trim()));
      setEditing(false);
    });
  }

  function deleteNote() {
    const formData = new FormData();
    formData.set("scopeKey", `${date}:${symbol}`);
    formData.set("returnTo", returnTo);

    startSaving(async () => {
      await deleteTickerReviewAction(formData);
      setNote("");
      setHasSavedNote(false);
      setEditing(false);
    });
  }

  return (
    <section className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-start">
      <div className="min-w-0">
        <section className="border-t border-[var(--hairline)] pt-6" aria-labelledby="ticker-review-heading">
          <h2 id="ticker-review-heading" className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            How did I trade {symbol}?
          </h2>

          {!note.trim() && suggestedTrades.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-md bg-[var(--review-helper-bg)] px-4 py-3">
              <span className="text-[12px] font-semibold text-[var(--muted)]">Worth 30 seconds each</span>
              <span className="text-[13px] tabular-nums text-[var(--body)]">
                Best <span className={pnlClass(suggestedTrades[0].pnlTone)}>{suggestedTrades[0].pnl}</span>
                {suggestedTrades[1] ? <> · worst <span className={pnlClass(suggestedTrades[1].pnlTone)}>{suggestedTrades[1].pnl}</span></> : null}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                {suggestedTrades.map((trade) => (
                  <button key={trade.id} type="button" onClick={() => addTradeMoment(trade)} className="h-8 rounded-md bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)]">
                    Comment Trade {trade.number}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {editing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveNote(new FormData(event.currentTarget));
              }}
              className={`mt-5 ${activeTrade ? "rounded-md border border-[var(--border)] bg-[var(--surface)]/35 px-5 py-5" : ""}`}
            >
              <input type="hidden" name="scopeKey" value={`${date}:${symbol}`} />
              <input type="hidden" name="returnTo" value={returnTo} />
              {activeTrade ? (
                <div className="mb-4 flex flex-wrap items-center gap-2.5">
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Trade {activeTrade.number}</h3>
                  <span className="font-mono text-[12px] text-[var(--accent)]">entry @{activeTrade.entryTime}</span>
                  <span className={`font-mono text-[13px] font-semibold tabular-nums ${pnlClass(activeTrade.pnlTone)}`}>{activeTrade.pnl}</span>
                  <TradeTagPicker
                    tradeId={activeTrade.id}
                    selectedTags={activeTrade.tags}
                    options={availableTags}
                    readOnly={readOnly}
                  />
                </div>
              ) : null}
              <SharedNoteComposer
                name="body"
                defaultValue={tickerNote}
                value={note}
                textareaId="ticker-review-note"
                placeholder={note.trim() ? `Start with ${symbol} overall. Add a new line for any trade or chart moment you want the Coach to understand.` : ""}
                submitLabel="Save note"
                onTextChange={setNote}
                localStorageKey={readOnly ? `demo:ticker-story:${date}:${symbol}` : undefined}
                onLocalSave={() => setEditing(false)}
                primaryAction
                pending={isSaving}
                dictationPromptMode={!note.trim()}
                dictationPromptContent={!note.trim() ? (
                  <div>
                    <div className="text-[15px] font-semibold text-[var(--foreground)]">How did {symbol} trade, and how did you trade it?</div>
                    <div className="mt-1 text-[12px] leading-5 text-[var(--muted)]">Hold to talk — or start typing.</div>
                    <div className="mt-3 text-[12px] leading-5">
                      <div className="font-medium text-[var(--body)]">Comment on any trade.</div>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[var(--muted)]">
                        <li>Tap <span className="font-semibold text-[var(--accent)]">+</span> on a row in the trade list.</li>
                        <li>Mention <span className="font-mono text-[var(--accent)]">@trade2</span> or <span className="font-mono text-[var(--accent)]">@10:58</span> while you talk.</li>
                      </ul>
                    </div>
                  </div>
                ) : undefined}
                hideActions={!note.trim()}
                textareaClassName={`min-h-[148px] w-full ${note.trim() ? "resize-y" : "resize-none"} rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60`}
                actionsSlot={hasSavedNote && !readOnly ? (
                  <button
                    type="button"
                    onClick={deleteNote}
                    disabled={isSaving}
                    className="h-10 rounded-md px-3 text-sm text-[var(--red)] hover:bg-[color-mix(in_srgb,var(--red)_10%,transparent)]"
                  >
                    Delete note
                  </button>
                ) : undefined}
              />
            </form>
          ) : savedSections.length > 0 ? (
            <div className="mt-6 space-y-5">
              {savedSections.map((section, index) => {
                if (section.kind === "overall") return (
                <section key={`overall-${index}`} className="rounded-md border border-[var(--border)] bg-[var(--surface)]/35 px-5 py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="text-[15px] font-semibold text-[var(--foreground)]">The ticker overall</h3>
                    {index === 0 ? (
                      <button type="button" onClick={openNote} className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">Edit note</button>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[var(--body)]">{section.body.trim()}</p>
                </section>
                );

                if (section.kind === "trade") {
                  const trade = trades.find((candidate) => candidate.number === section.tradeNumber);
                  return (
                <section key={`trade-${section.tradeNumber}-${index}`} className="rounded-md border border-[var(--border)] bg-[var(--surface)]/35 px-5 py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Trade {section.tradeNumber}</h3>
                      {section.time ? <span className="font-mono text-[12px] text-[var(--accent)]">entry @{section.time}</span> : null}
                      {trade ? <span className={`font-mono text-[13px] font-semibold tabular-nums ${pnlClass(trade.pnlTone)}`}>{trade.pnl}</span> : null}
                      {trade ? <TradeTagPicker tradeId={trade.id} selectedTags={trade.tags} options={availableTags} readOnly={readOnly} /> : null}
                    </div>
                    {index === 0 ? (
                      <button type="button" onClick={openNote} className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">Edit note</button>
                    ) : null}
                  </div>
                  {section.body.trim() ? (
                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[var(--body)]">{section.body.trim()}</p>
                  ) : null}
                  {trade ? <TradeAttachments tradeId={trade.id} attachments={trade.attachments} readOnly={readOnly} /> : null}
                </section>
                  );
                }

                return (
                <section key={`moment-${section.time}-${index}`} className="rounded-md border border-[var(--border)] bg-[var(--surface)]/35 px-5 py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Chart moment</h3>
                      <span className="font-mono text-[12px] text-[var(--accent)]">@{section.time}</span>
                    </div>
                    {index === 0 ? (
                      <button type="button" onClick={openNote} className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">Edit note</button>
                    ) : null}
                  </div>
                  {section.body.trim() ? (
                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[var(--body)]">{section.body.trim()}</p>
                  ) : null}
                </section>
                );
              })}
            </div>
          ) : null}

        </section>

        <form action={markTickerReviewReadyAction} className="mt-10 flex flex-wrap items-center gap-3 border-t border-[var(--hairline)] pt-6">
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="symbol" value={symbol} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <p className="text-[12px] leading-5 text-[var(--muted)]">
            {!hasSavedNote
              ? "Enabled once there’s a note."
              : readyForCoach
              ? "This ticker will be included the next time you run the day-level Coach review."
              : "Done marks this ticker reviewed. You can still edit the note later."}
          </p>
          <button
            type="submit"
            disabled={readOnly || readyForCoach || editing || !hasSavedNote}
            className={`ml-auto h-10 rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90 disabled:cursor-default ${readyForCoach ? "disabled:bg-[var(--green)] disabled:text-[var(--background)]" : "disabled:bg-[var(--surface-2)] disabled:text-[var(--muted)] disabled:opacity-60"}`}
          >
            {readyForCoach ? `${symbol} ready for Coach` : `Done reviewing ${symbol}`}
          </button>
        </form>
      </div>

      <aside className="lg:sticky lg:top-6" aria-label="Trades">
        <div className="border-t border-[var(--hairline)] pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Trades</h2>
          </div>
          <div className="mt-3 grid grid-cols-[0.5fr_1fr_1fr_0.5fr] divide-x divide-[var(--hairline)] border-t border-[var(--hairline)] py-3">
            <div className="pl-2 pr-2 text-left">
              <div className="text-[11px] text-[var(--muted)]">Trades</div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--foreground)]">{trades.length}</div>
            </div>
            <div className="px-2 text-center">
              <div className="text-[11px] text-[var(--muted)]">Accuracy</div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--foreground)]">{tradeSummary.accuracy}</div>
            </div>
            <div className="px-2 text-center">
              <div className="whitespace-nowrap text-[11px] text-[var(--muted)]">Profit factor</div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--foreground)]">{tradeSummary.profitFactor}</div>
            </div>
            <div className="pl-2 pr-4 text-right">
              <div className="whitespace-nowrap text-[11px] text-[var(--muted)]">Total P&amp;L</div>
              <div className={`mt-1 whitespace-nowrap text-[15px] font-semibold tabular-nums ${pnlClass(tradeSummary.totalPnlTone)}`}>{tradeSummary.totalPnl}</div>
            </div>
          </div>
          <div className="divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
            <div className="grid grid-cols-[minmax(0,1fr)_28px] items-center gap-1 px-1 py-2 text-[11px] font-semibold text-[var(--muted)]">
              <div className="grid grid-cols-[0.9fr_0.8fr_0.65fr_1.55fr_1fr_0.8fr_1fr] gap-x-2 px-1">
                <span>Trade</span>
                <span className="text-center">Shares</span>
                <span className="text-center">Exec</span>
                <span className="text-center">Entry / exit</span>
                <span className="text-center">Per share</span>
                <span className="text-center">Held</span>
                <span className="text-center">P&amp;L</span>
              </div>
              <span aria-hidden="true" />
            </div>
            {trades.map((trade) => {
              const hasMoment = anchoredTradeIds.has(trade.id);
              return (
                <div key={trade.id} className="grid grid-cols-[minmax(0,1fr)_28px] items-center gap-1 px-1 py-1">
                  <button
                    type="button"
                    onClick={() => addTradeMoment(trade)}
                    className="grid grid-cols-[0.9fr_0.8fr_0.65fr_1.55fr_1fr_0.8fr_1fr] items-center gap-x-2 rounded px-1 py-2 text-left text-[12px] tabular-nums transition-colors hover:bg-[var(--surface)]"
                    title={`Append Trade ${trade.number} to the review note`}
                  >
                    <span className="flex items-baseline gap-2 whitespace-nowrap">
                      <span className="font-semibold text-[var(--foreground)]">{trade.number}</span>
                      <span className="text-[var(--muted)]">{trade.entryTime}</span>
                    </span>
                    <span className="whitespace-nowrap text-center text-[var(--muted)]">{trade.shares}</span>
                    <span className="whitespace-nowrap text-center text-[var(--muted)]">{trade.executions}</span>
                    <span className="whitespace-nowrap text-center text-[var(--muted)]">{trade.entryPrice} / {trade.exitPrice}</span>
                    <span className={`whitespace-nowrap text-center ${pnlClass(trade.perShareTone)}`}>{trade.perShare}</span>
                    <span className="whitespace-nowrap text-center text-[var(--muted)]">{trade.holdDuration ?? "Open"}</span>
                    <span className={`whitespace-nowrap text-center ${pnlClass(trade.pnlTone)}`}>{trade.pnl}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addTradeMoment(trade)}
                    aria-label={`Append Trade ${trade.number} to the review note`}
                    className={`grid size-7 place-items-center rounded text-[16px] font-semibold transition-colors hover:bg-[var(--surface-2)] ${hasMoment ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--accent)]"}`}
                  >
                    {hasMoment ? "✎" : "+"}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
            <p><span className="font-semibold text-[var(--accent)]">+</span> add a note · <span className="font-semibold text-[var(--accent)]">✎</span> edit note</p>
          </div>
        </div>
      </aside>
    </section>
  );
}
