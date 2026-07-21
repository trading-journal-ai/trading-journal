"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteTickerReviewAction, upsertTickerReviewAction } from "@/app/journal/actions";
import DictationTextarea, { type DictationStatus } from "@/components/DictationTextarea";
import { CHART_FOCUS_EVENT } from "@/components/LightweightTradeChart";
import SharedNoteComposer from "@/components/SharedNoteComposer";
import {
  TradeAttachments,
  TickerReviewTagPicker,
  TradeTagPicker,
  type ReviewAttachment,
  type ReviewTagOption,
} from "@/components/TickerReviewTradeExtras";
import type { AnalyzedTradeExecution, TradeExecutionAnalysis } from "@/lib/executionAnalysis";

export type TickerReviewTrade = {
  id: number;
  number: number;
  /** Epoch seconds of the first entry — used to focus the chart on click. */
  entryAt?: number | null;
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
  executionAnalysis?: TradeExecutionAnalysis;
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

function formatExecutionPrice(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function executionLifecycleLabel(execution: AnalyzedTradeExecution) {
  if (execution.lifecycle === "open") return "Entry";
  if (execution.lifecycle === "increase") return "Add";
  if (execution.lifecycle === "reduce") return "Reduce";
  return "Exit";
}

function TradeExecutionDisclosure({
  analysis,
  regionId,
}: {
  analysis?: TradeExecutionAnalysis;
  regionId: string;
}) {
  if (!analysis || analysis.executions.length === 0) {
    return (
      <div id={regionId} className="border-t border-[var(--hairline)] bg-[var(--background)] px-4 py-3 text-[12px] text-[var(--muted)]">
        Execution details are unavailable for this trade.
      </div>
    );
  }

  return (
    <div id={regionId} className="border-t border-[var(--hairline)] bg-[var(--background)] px-4 py-2">
      <div className="divide-y divide-[var(--hairline)] font-mono text-[11px] tabular-nums">
        {analysis.executions.map((execution, index) => {
          const realizedTone = execution.realizedPnl == null
            ? "text-[var(--muted)]"
            : execution.realizedPnl > 0
              ? "text-[var(--green)]"
              : execution.realizedPnl < 0
                ? "text-[var(--red)]"
                : "text-[var(--muted)]";
          return (
            <div
              key={execution.id ?? `${execution.side}-${execution.executedAt}-${index}`}
              className="grid grid-cols-[54px_56px_minmax(48px,1fr)_54px_70px_72px] items-center gap-x-2 py-2"
            >
              <span className="font-normal text-[var(--muted)]">
                {executionLifecycleLabel(execution)}
              </span>
              <span className={`ml-5 font-semibold ${execution.side === "buy" ? "text-[var(--green-chart)]" : "text-[var(--red-chart)]"}`}>
                {execution.side === "buy" ? "Buy" : "Sell"}
              </span>
              <span className="ml-5 whitespace-nowrap text-[var(--body)]">{execution.quantity.toLocaleString("en-US")} shares</span>
              <span className="text-right text-[var(--muted)]">
                {execution.fillCount} {execution.fillCount === 1 ? "fill" : "fills"}
              </span>
              <span className={`text-right ${realizedTone}`}>
                {execution.realizedPnl == null ? "" : formatSignedMoney(execution.realizedPnl)}
              </span>
              <span className="text-right font-semibold text-[var(--foreground)]">{formatExecutionPrice(execution.price)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
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

function serializeReviewSections(sections: SavedReviewSection[]) {
  return sections
    .map((section) => {
      const body = section.body;
      if (section.kind === "overall") return body;
      if (section.kind === "trade") {
        const time = section.time ? ` · @${section.time}` : "";
        return `@trade${section.tradeNumber}${time}${body ? `\n${body}` : ""}`;
      }
      return `@${section.time}${body ? `\n${body}` : ""}`;
    })
    .filter(Boolean)
    // A single newline is enough to place the next section anchor at the start
    // of a line. Extra separator lines would be parsed back into the preceding
    // body and grow on every edit.
    .join("\n");
}

export default function TickerReviewWorkspace({
  date,
  symbol,
  returnTo,
  tickerNote,
  tickerTags,
  trades,
  availableTags,
  readOnly,
  initialTradeId = null,
  compact = false,
}: {
  date: string;
  symbol: string;
  returnTo: string;
  tickerNote: string;
  tickerTags: string[];
  trades: TickerReviewTrade[];
  availableTags: ReviewTagOption[];
  readOnly: boolean;
  initialTradeId?: number | null;
  compact?: boolean;
}) {
  const initialTrade = initialTradeId == null ? undefined : trades.find((trade) => trade.id === initialTradeId);
  const [note, setNote] = useState(() => {
    const normalizedNote = normalizeDuplicateEmptyTradeAnchors(tickerNote);
    return initialTrade ? appendTradeAnchor(normalizedNote, initialTrade) : normalizedNote;
  });
  const [editing, setEditing] = useState(() => initialTrade != null || !tickerNote.trim());
  const [editingTradeNumber, setEditingTradeNumber] = useState<number | null>(() => initialTrade?.number ?? null);
  const [overallHeaderVisible, setOverallHeaderVisible] = useState(() => Boolean(tickerNote.trim()));
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null);
  const [hasSavedNote, setHasSavedNote] = useState(() => Boolean(tickerNote.trim()));
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(() => initialTrade?.id ?? null);
  const [isSaving, startSaving] = useTransition();
  // Keep the suggested best/worst shortcuts available for the entire edit
  // session instead of removing them as soon as the first words are entered.
  const showSuggestedStrip = editing;
  const anchoredTradeIds = useMemo(() => mentionedTradeIds(note, trades), [note, trades]);
  const savedSections = useMemo(() => savedReviewSections(note, trades), [note, trades]);
  const visibleSavedSections = savedSections
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => !compact || (
      section.kind === "trade" && section.tradeNumber === initialTrade?.number
    ));
  const activeTrade = editingTradeNumber == null
    ? undefined
    : trades.find((trade) => trade.number === editingTradeNumber);
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

  function openNote(tradeNumber: number | null = null) {
    setEditingTradeNumber(tradeNumber);
    setEditing(true);
    const editorId = hasSavedNote
      ? tradeNumber == null ? "ticker-review-overall-editor" : `ticker-review-trade-${tradeNumber}-editor`
      : "ticker-review-note";
    requestAnimationFrame(() => document.getElementById(editorId)?.focus());
  }

  function focusNoteAtEnd(tradeNumber?: number) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const editorId = hasSavedNote && tradeNumber != null
          ? `ticker-review-trade-${tradeNumber}-editor`
          : "ticker-review-note";
        const textarea = document.getElementById(editorId) as HTMLTextAreaElement | null;
        if (!textarea) return;
        const end = textarea.value.length;
        textarea.focus();
        textarea.setSelectionRange(end, end);
      });
    });
  }

  function addTradeMoment(trade: TickerReviewTrade) {
    setNote((current) => appendTradeAnchor(current, trade));
    setEditingTradeNumber(trade.number);
    setEditing(true);
    focusNoteAtEnd(trade.number);
  }

  function handleDictationStatusChange(status: DictationStatus) {
    if (status === "recording" || status === "transcribing") {
      setOverallHeaderVisible(true);
    }
  }

  function updateSectionBody(sectionIndex: number, body: string) {
    setNote((current) => {
      const sections = savedReviewSections(current, trades);
      if (!sections[sectionIndex]) return current;
      sections[sectionIndex] = { ...sections[sectionIndex], body };
      return serializeReviewSections(sections);
    });
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
      setOverallHeaderVisible(false);
      setHasSavedNote(false);
      setEditing(false);
    });
  }

  return (
    <section className={compact ? "min-w-0" : "mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-start"}>
      <div className="min-w-0">
        <section
          className={compact ? "min-w-0" : "border-t border-[var(--hairline)] pt-6"}
          aria-label={compact ? "Trade note" : undefined}
          aria-labelledby={compact ? undefined : "ticker-review-heading"}
        >
          {!compact ? (
            <h2 id="ticker-review-heading" className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
              How did I trade {symbol}?
            </h2>
          ) : null}

          {!compact && showSuggestedStrip && suggestedTrades.length > 0 ? (
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
              className={compact ? "mt-0" : hasSavedNote ? "mt-5" : `mt-5 ${activeTrade ? "rounded-md border border-[var(--border)] bg-[var(--surface)]/35 px-5 py-5" : ""}`}
            >
              <input type="hidden" name="scopeKey" value={`${date}:${symbol}`} />
              <input type="hidden" name="returnTo" value={returnTo} />
              {hasSavedNote || compact ? (
                <>
                  <input type="hidden" name="body" value={note} />
                  <div
                    className={`${compact ? "overflow-visible" : "overflow-hidden"} rounded-md border border-[var(--border)] bg-[var(--surface)]`}
                    onBlurCapture={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setActiveSectionIndex(null);
                      }
                    }}
                  >
                    {visibleSavedSections.map(({ section, index }) => {
                      const editorClassName = `${compact ? "min-h-[132px]" : "min-h-[84px]"} w-full resize-none border-0 bg-transparent px-0 py-2 text-[15px] leading-7 text-[var(--body)] outline-none [field-sizing:content] placeholder:text-[var(--muted)]`;
                      const sectionClassName = `${compact ? "px-4 py-4 sm:px-5" : "px-5 py-5"} transition-[background-color,opacity] duration-150 ${
                        activeSectionIndex == null
                          ? "opacity-100"
                          : activeSectionIndex === index
                            ? "bg-transparent opacity-100"
                            : "bg-[var(--background)] opacity-75"
                      }`;

                      if (section.kind === "overall") return (
                        <section key={`edit-overall-${index}`} className={sectionClassName} onFocusCapture={() => setActiveSectionIndex(index)}>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-[15px] font-semibold text-[var(--foreground)]">The ticker overall</h3>
                            <TickerReviewTagPicker
                              scopeKey={`${date}:${symbol}`}
                              selectedTags={tickerTags}
                              options={availableTags}
                              readOnly={readOnly}
                            />
                          </div>
                          <DictationTextarea
                            id="ticker-review-overall-editor"
                            value={section.body}
                            onValueChange={(body) => updateSectionBody(index, body)}
                            rows={Math.max(2, section.body.split("\n").length)}
                            placeholder="Add your overall note…"
                            contextualMic
                            className={editorClassName}
                          />
                        </section>
                      );

                      if (section.kind === "trade") {
                        const trade = trades.find((candidate) => candidate.number === section.tradeNumber);
                        return (
                          <section key={`edit-trade-${section.tradeNumber}-${index}`} className={sectionClassName} onFocusCapture={() => setActiveSectionIndex(index)}>
                            <div className={`flex flex-wrap items-center gap-2.5 ${compact ? "mb-1" : ""}`}>
                              {!compact ? <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Trade {section.tradeNumber}</h3> : null}
                              {trade ? <TradeTagPicker tradeId={trade.id} selectedTags={trade.tags} options={availableTags} readOnly={readOnly} /> : null}
                            </div>
                            <DictationTextarea
                              id={`ticker-review-trade-${section.tradeNumber}-editor`}
                              value={section.body}
                              onValueChange={(body) => updateSectionBody(index, body)}
                              rows={Math.max(2, section.body.split("\n").length)}
                              placeholder={compact ? "Add a note about this trade…" : `Add a note for Trade ${section.tradeNumber}…`}
                              contextualMic
                              className={editorClassName}
                            />
                            {!compact && trade ? <TradeAttachments tradeId={trade.id} attachments={trade.attachments} readOnly={readOnly} /> : null}
                          </section>
                        );
                      }

                      return (
                        <section key={`edit-moment-${section.time}-${index}`} className={sectionClassName} onFocusCapture={() => setActiveSectionIndex(index)}>
                          <div className="flex flex-wrap items-baseline gap-2">
                            <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Chart moment</h3>
                            <span className="font-mono text-[12px] text-[var(--accent)]">@{section.time}</span>
                          </div>
                          <DictationTextarea
                            id={`ticker-review-moment-${section.time}-editor`}
                            value={section.body}
                            onValueChange={(body) => updateSectionBody(index, body)}
                            rows={Math.max(2, section.body.split("\n").length)}
                            placeholder="Add a note for this chart moment…"
                            contextualMic
                            className={editorClassName}
                          />
                        </section>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    {!compact && !readOnly ? (
                      <button
                        type="button"
                        onClick={deleteNote}
                        disabled={isSaving}
                        className="h-10 rounded-md px-3 text-sm text-[var(--red)] hover:bg-[color-mix(in_srgb,var(--red)_10%,transparent)]"
                      >
                        Delete note
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      disabled={readOnly || isSaving}
                      className="h-10 rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? "Saving…" : "Save note"}
                    </button>
                  </div>
                </>
              ) : (
                <>
              {activeTrade ? (
                <div className="mb-4 flex flex-wrap items-center gap-2.5">
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Trade {activeTrade.number}</h3>
                  <TradeTagPicker
                    tradeId={activeTrade.id}
                    selectedTags={activeTrade.tags}
                    options={availableTags}
                    readOnly={readOnly}
                  />
                </div>
              ) : overallHeaderVisible || note.trim() ? (
                <div className="mb-4 flex flex-wrap items-center gap-2.5">
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">The ticker overall</h3>
                  <TickerReviewTagPicker
                    scopeKey={`${date}:${symbol}`}
                    selectedTags={tickerTags}
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
                onDictationStatusChange={handleDictationStatusChange}
                localStorageKey={readOnly ? `demo:ticker-story:${date}:${symbol}` : undefined}
                onLocalSave={() => setEditing(false)}
                primaryAction
                pending={isSaving}
                dictationPromptMode={!note.trim()}
                dictationPromptContent={!note.trim() ? (
                  <div>
                    <div className="text-[15px] font-semibold text-[var(--foreground)]">How did {symbol} trade, and how did you trade it?</div>
                    <div className="mt-2 text-[12px] leading-5">
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
                </>
              )}
            </form>
          ) : visibleSavedSections.length > 0 ? (
            <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface)]">
              {visibleSavedSections.map(({ section, index }) => {
                if (section.kind === "overall") return (
                <section key={`overall-${index}`} className="px-5 py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-[15px] font-semibold text-[var(--foreground)]">The ticker overall</h3>
                      <TickerReviewTagPicker
                        scopeKey={`${date}:${symbol}`}
                        selectedTags={tickerTags}
                        options={availableTags}
                        readOnly={readOnly}
                      />
                    </div>
                    {index === 0 ? (
                      <button type="button" onClick={() => openNote()} className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">Edit note</button>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[var(--body)]">{section.body.trim()}</p>
                </section>
                );

                if (section.kind === "trade") {
                  const trade = trades.find((candidate) => candidate.number === section.tradeNumber);
                  return (
                <section key={`trade-${section.tradeNumber}-${index}`} className="px-5 py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {!compact ? <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Trade {section.tradeNumber}</h3> : null}
                      {trade ? <TradeTagPicker tradeId={trade.id} selectedTags={trade.tags} options={availableTags} readOnly={readOnly} /> : null}
                    </div>
                    {compact || index === 0 ? (
                      <button type="button" onClick={() => openNote(section.tradeNumber)} className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">Edit note</button>
                    ) : null}
                  </div>
                  {section.body.trim() ? (
                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[var(--body)]">{section.body.trim()}</p>
                  ) : null}
                  {!compact && trade ? <TradeAttachments tradeId={trade.id} attachments={trade.attachments} readOnly={readOnly} /> : null}
                </section>
                  );
                }

                return (
                <section key={`moment-${section.time}-${index}`} className="px-5 py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Chart moment</h3>
                      <span className="font-mono text-[12px] text-[var(--accent)]">@{section.time}</span>
                    </div>
                    {index === 0 ? (
                      <button type="button" onClick={() => openNote()} className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">Edit note</button>
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

      </div>

      {!compact ? <aside className="lg:sticky lg:top-6" aria-label="Trades">
        <div className="border-t border-[var(--hairline)]">
          <div
            aria-label="Trade summary"
            className="flex flex-wrap items-center gap-x-2.5 gap-y-1 bg-[var(--surface)] px-3 py-4 font-mono text-[13px] tabular-nums text-[var(--muted)]"
          >
            <span><span className="font-semibold text-[var(--foreground)]">{trades.length}</span> {trades.length === 1 ? "trade" : "trades"}</span>
            <span aria-hidden="true">·</span>
            <span><span className="font-semibold text-[var(--foreground)]">{tradeSummary.accuracy}</span> accuracy</span>
            <span aria-hidden="true">·</span>
            <span>PF <span className="font-semibold text-[var(--foreground)]">{tradeSummary.profitFactor}</span></span>
            <span aria-hidden="true">·</span>
            <span className={`font-semibold ${pnlClass(tradeSummary.totalPnlTone)}`}>{tradeSummary.totalPnl} total</span>
          </div>
          <div className="divide-y divide-[var(--hairline)] border-y border-[var(--hairline)] bg-[var(--surface)]">
            <div className="grid grid-cols-[minmax(0,1fr)_28px] items-center gap-1 px-1 py-2 text-[11px] font-semibold text-[var(--muted)]">
              <div className="grid grid-cols-[0.9fr_0.8fr_0.65fr_1.55fr_1fr_0.8fr_1fr] gap-x-2 px-1">
                <span>Trade</span>
                <span className="text-center">Shares</span>
                <span className="text-center">Fills</span>
                <span className="text-center">Entry / exit</span>
                <span className="text-center">Per share</span>
                <span className="text-center">Held</span>
                <span className="text-center">P&amp;L</span>
              </div>
              <span aria-hidden="true" />
            </div>
            {trades.map((trade) => {
              const hasMoment = anchoredTradeIds.has(trade.id);
              const isExpanded = expandedTradeId === trade.id;
              const executionRegionId = `trade-${trade.id}-executions`;
              return (
                <div key={trade.id}>
                  <div className={`grid grid-cols-[minmax(0,1fr)_28px] items-center gap-1 px-1 py-1 transition-colors duration-200 ease-out motion-reduce:transition-none ${isExpanded ? "bg-[var(--surface-2)]" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setExpandedTradeId((current) => {
                        const next = current === trade.id ? null : trade.id;
                        // Bring the trade's moment into the chart window (it
                        // may sit off-screen when the ticker traded all day).
                        if (next != null && trade.entryAt != null) {
                          window.dispatchEvent(new CustomEvent(CHART_FOCUS_EVENT, { detail: { time: trade.entryAt } }));
                        }
                        return next;
                      })}
                      aria-expanded={isExpanded}
                      aria-controls={executionRegionId}
                      className="grid grid-cols-[0.9fr_0.8fr_0.65fr_1.55fr_1fr_0.8fr_1fr] items-center gap-x-2 rounded px-1 py-2 text-left text-[12px] tabular-nums transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
                      title={`${isExpanded ? "Hide" : "Show"} Trade ${trade.number} entries and exits`}
                    >
                      <span className="flex items-baseline gap-2 whitespace-nowrap">
                        <span aria-hidden="true" className={`text-[10px] text-[var(--accent)] transition-transform duration-200 ease-out motion-reduce:transition-none ${isExpanded ? "rotate-90" : ""}`}>›</span>
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
                  <div
                    aria-hidden={!isExpanded}
                    className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <TradeExecutionDisclosure analysis={trade.executionAnalysis} regionId={executionRegionId} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
            <p><span className="font-semibold text-[var(--accent)]">+</span> add a note · <span className="font-semibold text-[var(--accent)]">✎</span> edit note</p>
          </div>
        </div>
      </aside> : null}
    </section>
  );
}
