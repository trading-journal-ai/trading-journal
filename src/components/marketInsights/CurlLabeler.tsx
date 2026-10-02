"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import SharedNoteComposer from "@/components/SharedNoteComposer";
import Button from "@/components/ui/Button";
import CompactSelect from "@/components/ui/CompactSelect";
import Eyebrow from "@/components/ui/Eyebrow";
import PeriodTabs from "@/components/ui/PeriodTabs";
import TradingStatsBar from "@/components/ui/TradingStatsBar";
import type { ChartCandle, ChartMarker } from "@/components/TradeChart";
import type { ChartPricePoint, ChartPriceZone } from "@/components/LightweightTradeChart";
import LevelReviewWorkspace from "@/components/marketInsights/LevelReviewWorkspace";
import ChartReviewWorkspace from "@/components/marketInsights/ChartReviewWorkspace";
import ZoneEditor, { editorChartZones, type ZoneChange } from "@/components/marketInsights/ZoneEditor";
import {
  CURL_LABELS, CURL_RULE, contextZones, curlRule, curlStructure,
  type Curl, type CurlDay, type CurlDaySummary, type CurlLabels, type CurlLabelValue, type ResolvedZone, type ZoneRole,
} from "@/lib/marketInsights";

type ZoneReview = { reviewedDays: number; kept: number; rejected: number; edited: number; added: number };
type Mode = "levels" | "review" | "curls" | "zones";
const money2 = (value: number) => `$${value.toFixed(2)}`;
const zoneHalfWidth = (price: number) => Math.max(0.1, 0.015 * price);
const resolvedToChart = (zones: ResolvedZone[]): ChartPriceZone[] => zones.map((zone) => ({
  id: zone.id, low: zone.low, high: zone.high, tone: zone.source === "detector" ? "candidate" : zone.role,
  label: `${money2(zone.low)}–${money2(zone.high)} · ${zone.role}${zone.source === "detector" ? " (detector)" : ""}`,
}));

const LightweightTradeChart = dynamic(() => import("@/components/LightweightTradeChart"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-md bg-[var(--surface)]" />,
});

type Agreement = { ruleYesYouYes: number; ruleYesYouNo: number; ruleNoYouYes: number; ruleNoYouNo: number; labeled: number };
type TimeFilter = "all" | "early" | "window";

const etFormat = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function etMinutes(epochSeconds: number) {
  const [h, m] = etFormat.format(new Date(epochSeconds * 1000)).split(":").map(Number);
  return h * 60 + m;
}
const clock = (epochSeconds: number | null) => {
  if (epochSeconds == null) return "—";
  const minutes = etMinutes(epochSeconds);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};
const shortDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const money = (value: number) => (value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : `$${Math.round(value / 1000)}K`);

export default function CurlLabeler({ days, initialLabels, initialAgreement, initialZoneReview }: {
  days: CurlDaySummary[];
  initialLabels: CurlLabels;
  initialAgreement: Agreement;
  initialZoneReview: ZoneReview;
}) {
  const [mode, setMode] = useState<Mode>("levels");
  const [levelDirty, setLevelDirty] = useState(false);
  const [seenByDay, setSeenByDay] = useState<Record<string, number>>({});
  const [zoneReview, setZoneReview] = useState(initialZoneReview);
  const [showZones, setShowZones] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addRole, setAddRole] = useState<ZoneRole>("support");
  const [dayId, setDayId] = useState(days.find((item) => item.sym === "SDEV")?.id ?? days[0]?.id ?? "");
  const [day, setDay] = useState<CurlDay | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [labels, setLabels] = useState(initialLabels);
  const [agreement, setAgreement] = useState(initialAgreement);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [missed, setMissed] = useState({ low: "", high: "", label: "yes" as CurlLabelValue, comment: "" });

  useEffect(() => {
    if (!dayId) return;
    let live = true;
    fetch(`/api/market-insights/curl-days?id=${encodeURIComponent(dayId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error ?? "This day could not be loaded.");
        return response.json() as Promise<CurlDay>;
      })
      .then((next) => { if (live) { setDay(next); setLoadError(null); } })
      .catch((error) => { if (live) setLoadError(error instanceof Error ? error.message : "This day could not be loaded."); });
    return () => { live = false; };
  }, [dayId]);

  function selectDay(id: string) {
    if (levelDirty && !window.confirm("Discard unsubmitted level-review changes and change day?")) return;
    if (day && mode !== "review") setSeenByDay((seen) => ({ ...seen, [day.id]: day.bars.at(-1)?.[0] ?? 0 }));
    setDayId(id); setDay(null); setFocusKey(null); setStatus(null);
  }

  const dayIndex = days.findIndex((item) => item.id === dayId);
  const dayLabels = labels.days[dayId] ?? { curls: {}, missed: [] };
  const curls = useMemo(() => (day?.curls ?? []).filter((curl) => {
    const minutes = etMinutes(curl.lowT);
    return timeFilter === "all" || (timeFilter === "early" ? minutes < 420 : minutes >= 420);
  }), [day, timeFilter]);
  const focused = curls.find((curl) => curl.key === focusKey) ?? curls[0] ?? null;

  // Unsaved comment text per curl; falls back to the saved comment.
  const commentDraft = focused ? drafts[`${dayId}:${focused.key}`] ?? dayLabels.curls[focused.key]?.comment ?? "" : "";
  const setCommentDraft = (value: string) => { if (focused) setDrafts({ ...drafts, [`${dayId}:${focused.key}`]: value }); };

  async function save(body: object, success: string): Promise<boolean> {
    setStatus(null);
    try {
      const response = await fetch("/api/market-insights/labels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dayId, ...body }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The label could not be saved.");
      setLabels(result.labels); setAgreement(result.agreement); if (result.zoneReview) setZoneReview(result.zoneReview);
      setStatus({ tone: "ok", text: success });
      return true;
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "The label could not be saved." });
      return false;
    }
  }

  function setLabel(curl: Curl, value: CurlLabelValue) {
    const current = dayLabels.curls[curl.key]?.label;
    const next = current === value ? null : value;
    void save({ key: curl.key, label: next, comment: curl.key === focused?.key ? commentDraft : dayLabels.curls[curl.key]?.comment },
      next ? `Saved #${curl.n} as ${CURL_LABELS.find((item) => item.value === next)?.label}.` : `Cleared the label on #${curl.n}.`);
  }

  const structureZones = day ? contextZones(day, dayLabels.zones) : [];
  const chartZones: ChartPriceZone[] = !day ? [] : mode === "zones"
    ? editorChartZones(day, dayLabels.zones, selectedZoneId)
    : showZones ? resolvedToChart(structureZones) : [];

  function handlePriceClick({ price }: ChartPricePoint) {
    if (!day) return;
    if (adding) {
      const half = zoneHalfWidth(price);
      const low = Math.round((price - half) * 100) / 100, high = Math.round((price + half) * 100) / 100;
      setAdding(false);
      void save({ zoneAdd: { low, high, role: addRole } }, `Added ${money2(low)}–${money2(high)} as ${addRole}. Adjust its edges below if needed.`);
      return;
    }
    const hit = chartZones.find((zone) => price >= zone.low && price <= zone.high);
    setSelectedZoneId(hit?.id ?? null);
  }

  const labeledToday = Object.keys(dayLabels.curls).length;
  const daysLabeled = days.filter((item) => Object.keys(labels.days[item.id]?.curls ?? {}).length > 0).length;
  const agreeing = agreement.ruleYesYouYes + agreement.ruleNoYouNo;

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <Eyebrow tone="accent">{mode === "levels" ? "Structure review" : mode === "review" ? "Candle replay" : mode === "curls" ? "Label curls" : "Support and resistance"}</Eyebrow>
        <h2 className="text-[22px] font-semibold leading-tight text-[var(--foreground)]">
          {mode === "levels" ? "Which levels describe this chart?" : mode === "review" ? "What can you see at this moment?" : mode === "curls" ? "Which of these would you trade?" : "Where are the real levels?"}
        </h2>
        <p className="max-w-3xl text-[14px] leading-6 text-[var(--muted)]">
          {mode === "levels" ? "Inspect the proposed levels, correct their bounds, and submit your read. Green marks support; red marks resistance." : mode === "review" ? "Review structure, levels, curls and your entry or exit criteria. Record your read, then reveal what happened next." : mode === "curls"
            ? "Each numbered curl is a swing low that rallied at least 10%. Label the ones you can judge; your labels are saved locally and become the answer key for the draft rule. Click a label again to clear it."
            : "Review the detector’s zones for this day: keep the real levels, reject the noise, fix edges and roles, and add the ones it missed. Your zones then appear behind the curls and feed their structure read."}
        </p>
        <PeriodTabs ariaLabel="Labeling mode" value={mode} className="mt-2 flex-wrap border-b border-[var(--hairline)]"
          onChange={(value) => { if (levelDirty && !window.confirm("Discard unsubmitted level-review changes and switch view?")) return; setMode(value as Mode); if (day && value !== mode) setSeenByDay((seen) => ({ ...seen, [day.id]: day.bars.at(-1)?.[0] ?? 0 })); setAdding(false); setSelectedZoneId(null); }}
          items={[{ value: "levels", label: "Levels" }, { value: "review", label: "Candle replay" }, { value: "curls", label: "Curl research" }, { value: "zones", label: "Earlier level labels" }]} />
      </div>

      {mode === "review" || mode === "levels" ? null : mode === "zones" ? (
        <section aria-label="Zone review" className="border-y border-[var(--hairline)] py-4">
          <TradingStatsBar ariaLabel="Zone review progress" metrics={[
            { label: "Days reviewed", value: `${zoneReview.reviewedDays} of ${days.length}` },
            { label: "Zones kept", value: zoneReview.kept.toLocaleString() },
            { label: "Zones rejected", value: zoneReview.rejected.toLocaleString() },
            { label: "Edges adjusted", value: zoneReview.edited.toLocaleString() },
            { label: "Zones you added", value: zoneReview.added.toLocaleString() },
            { label: "Detector kept rate", value: zoneReview.kept + zoneReview.rejected ? `${Math.round((100 * zoneReview.kept) / (zoneReview.kept + zoneReview.rejected))}%` : "—", tone: "muted" },
          ]} />
        </section>
      ) : (
      <section aria-label="Rule agreement" className="grid gap-4 border-y border-[var(--hairline)] py-4">
        <TradingStatsBar ariaLabel="Labeling progress" metrics={[
          { label: "Labeled curls", value: agreement.labeled.toLocaleString() },
          { label: "Days with labels", value: `${daysLabeled} of ${days.length}` },
          { label: "Rule agrees with you", value: agreement.labeled ? `${Math.round((100 * agreeing) / agreement.labeled)}%` : "—" },
          { label: "Rule missed your yes", value: agreement.ruleNoYouYes.toLocaleString(), tone: agreement.ruleNoYouYes ? "negative" : "muted" },
          { label: "Rule flagged your no", value: agreement.ruleYesYouNo.toLocaleString(), tone: agreement.ruleYesYouNo ? "negative" : "muted" },
        ]} />
        <p className="text-[13px] text-[var(--muted)]">
          Draft rule: a new-high trigger; candles at least {CURL_RULE.minRangeCents}¢ and either expanding {CURL_RULE.minExpansion}× over the five before the low or already {CURL_RULE.momentumCents}¢+;
          trigger volume at least {CURL_RULE.minTriggerVol}× the volume at the low, or pullback volume fading to {CURL_RULE.maxPullbackFade}× or less; and the heaviest-volume candle not red.
          Strong and Yes count as yes.
        </p>
      </section>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={dayIndex <= 0} onClick={() => selectDay(days[dayIndex - 1].id)}>Previous day</Button>
          <CompactSelect label="Gainer-day" placeholder="Choose a day" value={dayId}
            options={days.map((item) => {
              const count = Object.keys(labels.days[item.id]?.curls ?? {}).length;
              return { value: item.id, label: `${item.sym} · ${shortDate(item.date)}${mode === "curls" && count ? ` · ${count} labeled` : ""}` };
            })}
            onChange={selectDay} />
          <Button disabled={dayIndex < 0 || dayIndex >= days.length - 1} onClick={() => selectDay(days[dayIndex + 1].id)}>Next day</Button>
        </div>
        {mode === "curls" ? (
          <PeriodTabs ariaLabel="Time of day" value={timeFilter} onChange={(value) => { setTimeFilter(value as TimeFilter); setFocusKey(null); }}
            items={[{ value: "all", label: "All day" }, { value: "early", label: "Before 7:00" }, { value: "window", label: "7:00 and later" }]} />
        ) : null}
      </div>

      {loadError ? <p className="text-[14px] text-[var(--red)]">{loadError}</p> : !day ? (
        <div className="h-[420px] animate-pulse rounded-md bg-[var(--surface)]" />
      ) : mode === "levels" ? (
        <LevelReviewWorkspace key={day.id} day={day} onDirtyChange={setLevelDirty} />
      ) : mode === "review" ? (
        <ChartReviewWorkspace key={day.id} day={day} observations={dayLabels.observations ?? []}
          seenThroughT={seenByDay[day.id] ?? 0}
          onSeen={(time) => setSeenByDay((seen) => ({ ...seen, [day.id]: Math.max(seen[day.id] ?? 0, time) }))}
          onSave={(observation) => save({ observation }, "Observation saved.")}
          onRemove={(id) => save({ removeObservation: id }, "Observation removed.")} />
      ) : (
        <>
          <div className="grid gap-3">
            <h3 className="text-[17px] font-semibold text-[var(--foreground)]">
              {day.sym} · {shortDate(day.date)} <span className="font-normal text-[var(--muted)]">· prior close ${day.pc.toFixed(2)} · {day.curls.length} curls · {labeledToday} labeled</span>
            </h3>
            <ZoneStrip day={day} curls={curls} focusedKey={focused?.key ?? null} onFocus={setFocusKey} />
            <LightweightTradeChart key={mode === "zones" ? `${day.id}-zones` : `${day.id}-${focused?.key ?? "day"}`} chartHeightClass="h-[420px]"
              candles={day.bars.map(([t, o, h, l, c, vol]) => ({ t, o, h, l, c, vol }) satisfies ChartCandle)}
              markers={mode === "zones" ? [] : curls.filter((curl) => curl.triggerT != null).map((curl) => ({ t: curl.triggerT!, price: curl.triggerPrice!, side: "buy" }) satisfies ChartMarker)}
              initialFocusTime={mode === "zones" ? undefined : focused?.lowT} focusMinutesBefore={25} focusMinutesAfter={35} enableFullscreen
              priceZones={chartZones} onPriceClick={mode === "zones" ? handlePriceClick : undefined} />
            {mode === "zones" ? (
              <p className="text-xs text-[var(--muted)]">{adding ? `Click the chart at the level to add a ${addRole} zone (about ±${Math.round(zoneHalfWidth(day.bars.at(-1)?.[4] ?? 1) * 100)}¢).` : "Click a band on the chart to select it. Green = support, red = resistance, blue = flip, gray = not reviewed yet."}</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
                <span>Green markers are each curl’s trigger: the first candle after the low that makes a higher high and closes green.</span>
                <label htmlFor="show-zones" className="inline-flex items-center gap-2">
                  <input id="show-zones" type="checkbox" checked={showZones} onChange={(event) => setShowZones(event.target.checked)} className="accent-[var(--accent)]" />
                  Show {structureZones[0]?.source === "detector" ? "detector" : "your"} support/resistance zones
                </label>
              </div>
            )}
          </div>

          {mode === "zones" ? (
            <>
              {status ? <p role="status" className={`text-[13px] ${status.tone === "error" ? "text-[var(--red)]" : "text-[var(--muted)]"}`}>{status.text}</p> : null}
              <ZoneEditor day={day} zones={dayLabels.zones} selectedId={selectedZoneId} onSelect={setSelectedZoneId}
                onChange={(change: ZoneChange, success: string) => save(change, success)}
                adding={adding} onAddingChange={setAdding} addRole={addRole} onAddRoleChange={setAddRole} />
            </>
          ) : <>
          {focused ? (
            <FocusPanel curl={focused} zones={structureZones} mark={dayLabels.curls[focused.key]?.label ?? null} comment={commentDraft}
              onComment={setCommentDraft} onLabel={(value) => setLabel(focused, value)}
              onSaveComment={() => {
                const mark = dayLabels.curls[focused.key]?.label;
                if (!mark) { setStatus({ tone: "error", text: "Choose a label before saving a comment." }); return; }
                void save({ key: focused.key, label: mark, comment: commentDraft }, `Saved the comment on #${focused.n}.`);
              }} />
          ) : <p className="text-[14px] text-[var(--muted)]">No curls in this part of the day.</p>}
          {status ? <p role="status" className={`text-[13px] ${status.tone === "error" ? "text-[var(--red)]" : "text-[var(--muted)]"}`}>{status.text}</p> : null}

          <CurlTable curls={curls} marks={dayLabels.curls} focusedKey={focused?.key ?? null} onFocus={setFocusKey} onLabel={setLabel} />

          <section aria-labelledby="missed-title" className="grid gap-3 border-t border-[var(--hairline)] pt-6">
            <h3 id="missed-title" className="text-[15px] font-semibold text-[var(--foreground)]">A curl the detector missed</h3>
            <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
              event.preventDefault();
              void save({ missed }, `Added the missed curl from ${missed.low} to ${missed.high}.`).then((saved) => { if (saved) setMissed({ ...missed, low: "", high: "", comment: "" }); });
            }}>
              <label htmlFor="missed-low" className="grid gap-1 text-xs text-[var(--muted)]">Low (ET)
                <input id="missed-low" value={missed.low} onChange={(event) => setMissed({ ...missed, low: event.target.value })} placeholder="05:13" inputMode="numeric"
                  className="h-10 w-24 rounded-md border border-[var(--border)] bg-transparent px-3 text-[14px] text-[var(--foreground)]" />
              </label>
              <label htmlFor="missed-high" className="grid gap-1 text-xs text-[var(--muted)]">High (ET)
                <input id="missed-high" value={missed.high} onChange={(event) => setMissed({ ...missed, high: event.target.value })} placeholder="05:19" inputMode="numeric"
                  className="h-10 w-24 rounded-md border border-[var(--border)] bg-transparent px-3 text-[14px] text-[var(--foreground)]" />
              </label>
              <div className="grid gap-1 text-xs text-[var(--muted)]">Label
                <CompactSelect label="Missed curl label" placeholder="Label" value={missed.label} options={CURL_LABELS}
                  onChange={(value) => setMissed({ ...missed, label: value as CurlLabelValue })} />
              </div>
              <label htmlFor="missed-comment" className="grid min-w-[220px] flex-1 gap-1 text-xs text-[var(--muted)]">Comment (optional)
                <input id="missed-comment" value={missed.comment} onChange={(event) => setMissed({ ...missed, comment: event.target.value })}
                  className="h-10 rounded-md border border-[var(--border)] bg-transparent px-3 text-[14px] text-[var(--foreground)]" />
              </label>
              <Button type="submit" variant="primary">Add missed curl</Button>
            </form>
            {dayLabels.missed.length ? (
              <ul className="grid gap-1 text-[13px] text-[var(--body)]">
                {dayLabels.missed.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-semibold text-[var(--foreground)]">{item.low}–{item.high}</span>
                    <span>{CURL_LABELS.find((option) => option.value === item.label)?.label}</span>
                    {item.comment ? <span className="text-[var(--muted)]">{item.comment}</span> : null}
                    <button type="button" onClick={() => void save({ removeMissed: item.id }, "Removed the missed curl.")}
                      className="text-[13px] font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">Remove</button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13px] text-[var(--muted)]">None recorded for this day.</p>}
          </section>
          </>}
        </>
      )}
    </div>
  );
}

function LabelButtons({ value, onLabel, size = "sm" }: { value: CurlLabelValue | null; onLabel: (value: CurlLabelValue) => void; size?: "sm" | "md" }) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Your label">
      {CURL_LABELS.map((option) => {
        const active = value === option.value;
        const positive = option.value === "yes" || option.value === "strong";
        return (
          <button key={option.value} type="button" aria-pressed={active} onClick={() => onLabel(option.value)}
            className={`rounded-md border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${size === "md" ? "px-3 py-1.5 text-[13px]" : "px-2 py-1 text-[12px]"} ${
              active
                ? positive ? "border-[var(--green)] bg-[var(--green)] text-[var(--background)]" : "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--hairline)] text-[var(--body)] hover:border-[var(--muted)]"}`}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FocusPanel({ curl, zones, mark, comment, onComment, onLabel, onSaveComment }: {
  curl: Curl;
  zones: ResolvedZone[];
  mark: CurlLabelValue | null;
  comment: string;
  onComment: (value: string) => void;
  onLabel: (value: CurlLabelValue) => void;
  onSaveComment: () => void;
}) {
  const rule = curlRule(curl);
  const facts: [string, string][] = [
    ["Low → high (ET)", `${clock(curl.lowT)} → ${clock(curl.highT)}`],
    ["Move", `${curl.low.toFixed(2)} → ${curl.high.toFixed(2)} · +${curl.movePct}%`],
    ["Candle size", `${curl.rangeCents}¢ (before the low ${curl.rangeBefore}¢)`],
    ["Expansion", curl.expansion == null ? "—" : `${curl.expansion}×`],
    ["Trigger", curl.triggerT == null ? "none" : `${clock(curl.triggerT)} at ${curl.triggerPrice?.toFixed(2)} · volume ${curl.triggerVol}× the low`],
    ["Structure", [curl.higherLow ? "higher low" : "no higher low", curl.doubleBottom ? "double bottom" : null].filter(Boolean).join(" · ")],
    ["Zone at the trigger", curl.zone === "between" ? "between momentum and chop" : curl.zone],
    ["Selling pressure", `${Math.round(curl.redShare * 100)}% of volume on red candles · heaviest candle ${curl.heaviestRed ? "red" : "green"}`],
    ["Pullback volume", curl.pullbackFade == null ? "—" : `last candles ${curl.pullbackFade}× the first${curl.pullVsPush != null ? ` · heaviest ${curl.pullVsPush}× the push` : ""}`],
    ...(() => {
      const structure = curlStructure(curl, zones);
      const source = zones[0]?.source === "detector" ? " (detector)" : "";
      return [
        ["Support under the low", structure.supportUnder ? `${money2(structure.supportUnder.low)}–${money2(structure.supportUnder.high)} · ${structure.supportUnder.role}${source}` : "none found"],
        ["Next zone above the trigger", structure.nextAbove ? `${money2(structure.nextAbove.low)}–${money2(structure.nextAbove.high)} · ${structure.roomCents}¢ of room${source}` : "none above"],
      ] as [string, string][];
    })(),
    ["Traded during the curl", money(curl.dollars)],
  ];
  return (
    <section aria-label={`Curl ${curl.n}`} className="grid gap-4 rounded-md border border-[var(--hairline)] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-2">
        <h3 className="text-[15px] font-semibold text-[var(--foreground)]">Curl #{curl.n}
          <span className={`ml-3 text-[13px] font-medium ${rule.pass ? "text-[var(--green)]" : "text-[var(--muted)]"}`}>
            Rule: {rule.pass ? "would take it" : `would pass (${rule.misses.join(", ")})`}
          </span>
        </h3>
        <dl className="grid gap-1 text-[13px]">
          {facts.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4"><dt className="text-[var(--muted)]">{label}</dt><dd className="text-right font-medium tabular-nums text-[var(--foreground)]">{value}</dd></div>
          ))}
        </dl>
      </div>
      <div className="grid content-start gap-3">
        <span className="text-xs text-[var(--muted)]">Your label</span>
        <LabelButtons value={mark} onLabel={onLabel} size="md" />
        <div className="grid gap-1">
          <label htmlFor="curl-comment" className="text-xs text-[var(--muted)]">What you see (optional)</label>
          <SharedNoteComposer key={curl.key} name="curl-comment" textareaId="curl-comment" defaultValue="" value={comment} onTextChange={onComment}
            placeholder="Double bottom, then the first new-high candle with volume coming in." rows={3} size="compact" hideActions
            submitLabel="Save comment" textareaProps={{ maxLength: 500 }} />
        </div>
        <div><Button onClick={onSaveComment}>Save comment</Button></div>
      </div>
    </section>
  );
}

function CurlTable({ curls, marks, focusedKey, onFocus, onLabel }: {
  curls: Curl[];
  marks: CurlLabels["days"][string]["curls"];
  focusedKey: string | null;
  onFocus: (key: string) => void;
  onLabel: (curl: Curl, value: CurlLabelValue) => void;
}) {
  return (
    <div className="overflow-x-auto border-y border-[var(--hairline)]">
      <table className="w-full min-w-[980px] border-collapse text-left text-[13px] tabular-nums">
        <thead className="text-xs text-[var(--muted)]">
          <tr className="border-b border-[var(--hairline)]">
            <th className="px-2 py-2.5 font-medium">#</th><th className="px-2 py-2.5 font-medium">Low → high</th>
            <th className="px-2 py-2.5 text-right font-medium">Move</th><th className="px-2 py-2.5 text-right font-medium">Candles</th>
            <th className="px-2 py-2.5 text-right font-medium">Expansion</th><th className="px-2 py-2.5 text-right font-medium">Trigger vol</th>
            <th className="px-2 py-2.5 font-medium">Structure</th><th className="px-2 py-2.5 text-right font-medium">Red vol</th><th className="px-2 py-2.5 text-right font-medium">Pullback fade</th><th className="px-2 py-2.5 font-medium">Rule</th><th className="px-2 py-2.5 font-medium">Your label</th>
          </tr>
        </thead>
        <tbody>
          {curls.map((curl) => {
            const rule = curlRule(curl);
            const active = curl.key === focusedKey;
            return (
              <tr key={curl.key} className={`border-b border-[var(--hairline)] ${active ? "bg-[var(--surface)]" : ""}`}>
                <td className="px-2 py-2"><button type="button" onClick={() => onFocus(curl.key)} aria-pressed={active}
                  className="font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">#{curl.n}</button></td>
                <td className="px-2 py-2 text-[var(--body)]">{clock(curl.lowT)} → {clock(curl.highT)}</td>
                <td className="px-2 py-2 text-right text-[var(--foreground)]">+{curl.movePct}%</td>
                <td className="px-2 py-2 text-right text-[var(--foreground)]">{curl.rangeCents}¢</td>
                <td className="px-2 py-2 text-right text-[var(--foreground)]">{curl.expansion == null ? "—" : `${curl.expansion}×`}</td>
                <td className="px-2 py-2 text-right text-[var(--foreground)]">{curl.triggerVol == null ? "—" : `${curl.triggerVol}×`}</td>
                <td className="px-2 py-2 text-[var(--body)]">{[curl.higherLow ? "HL" : null, curl.doubleBottom ? "DB" : null].filter(Boolean).join(" · ") || "—"}</td>
                <td className={`px-2 py-2 text-right ${curl.heaviestRed ? "font-semibold text-[var(--red)]" : "text-[var(--foreground)]"}`}
                  title={curl.heaviestRed ? "Heaviest-volume candle closed red" : "Heaviest-volume candle closed green"}>{Math.round(curl.redShare * 100)}%{curl.heaviestRed ? " · R" : ""}</td>
                <td className="px-2 py-2 text-right text-[var(--foreground)]">{curl.pullbackFade == null ? "—" : `${curl.pullbackFade}×`}</td>
                <td className={`px-2 py-2 ${rule.pass ? "font-semibold text-[var(--green)]" : "text-[var(--muted)]"}`} title={rule.misses.join(", ")}>{rule.pass ? "Take" : "Pass"}</td>
                <td className="px-2 py-2"><LabelButtons value={marks[curl.key]?.label ?? null} onLabel={(value) => onLabel(curl, value)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-2 py-2 text-xs text-[var(--muted)]">HL = higher low than the previous swing low · DB = double bottom in the pullback · Candles = median one-minute candle size during the curl · Red vol = share of volume on red candles from the pullback through the high; R = the heaviest-volume candle closed red · Pullback fade = last two pullback candles’ volume vs the first (under 1× = selling drying up).</p>
    </div>
  );
}

function ZoneStrip({ day, curls, focusedKey, onFocus }: { day: CurlDay; curls: Curl[]; focusedKey: string | null; onFocus: (key: string) => void }) {
  const W = 960, H = 46, start = 240, end = 1200;
  const x = (minutes: number) => ((minutes - start) / (end - start)) * W;
  const fill = { momentum: "var(--accent)", between: "var(--muted)", chop: "var(--hairline)" } as const;
  const opacity = { momentum: 0.85, between: 0.3, chop: 1 } as const;
  return (
    <div className="grid gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Momentum and chop zones through the day, with curl positions">
        {day.zones.map((zone) => (
          <rect key={zone.start} x={x(zone.start)} y={6} width={Math.max(1, x(zone.start + 5) - x(zone.start) - 0.5)} height={14}
            fill={fill[zone.zone]} opacity={opacity[zone.zone]}><title>{`${Math.floor(zone.start / 60)}:${String(zone.start % 60).padStart(2, "0")} · ${zone.medianCents}¢ candles · ${zone.zone}`}</title></rect>
        ))}
        {curls.map((curl) => {
          const cx = x(etMinutes(curl.lowT));
          const active = curl.key === focusedKey;
          return (
            <g key={curl.key} role="button" tabIndex={0} aria-label={`Focus curl ${curl.n}`} className="cursor-pointer"
              onClick={() => onFocus(curl.key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onFocus(curl.key); }}>
              <line x1={cx} x2={cx} y1={22} y2={30} stroke={active ? "var(--foreground)" : "var(--muted)"} />
              <text x={cx} y={42} textAnchor="middle" fontSize="11" fontWeight={active ? 700 : 500} fill={active ? "var(--foreground)" : "var(--muted)"}>{curl.n}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]">
        <span className="inline-flex flex-wrap gap-x-4">
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent)] align-[-1px]" />Momentum (20¢+ candles)</span>
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[var(--muted)] opacity-40 align-[-1px]" />Between</span>
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm border border-[var(--hairline)] bg-[var(--hairline)] align-[-1px]" />Chop (under 10¢)</span>
        </span>
        <span>4:00 → 20:00 ET · numbers are curl lows</span>
      </div>
    </div>
  );
}
