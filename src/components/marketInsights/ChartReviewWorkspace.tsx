"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import PeriodTabs from "@/components/ui/PeriodTabs";
import CompactSelect from "@/components/ui/CompactSelect";
import SharedNoteComposer from "@/components/SharedNoteComposer";
import type { ChartPricePoint, ChartPriceZone } from "@/components/LightweightTradeChart";
import type { CurlDay } from "@/lib/marketInsights";
import { REVIEW_KINDS, visibleReviewObservations, type ReviewDraft, type ReviewKind, type ReviewObservation } from "@/lib/marketChartReview";

const Chart = dynamic(() => import("@/components/LightweightTradeChart"), { ssr: false,
  loading: () => <div className="h-[420px] animate-pulse bg-[var(--surface)]" /> });
const timeFormat = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const clock = (t: number) => timeFormat.format(new Date(t * 1000));
const name = (kind: ReviewKind) => REVIEW_KINDS.find((item) => item.value === kind)!.label;
type Point = { time: number; price: number };

export default function ChartReviewWorkspace({ day, observations, seenThroughT, onSeen, onSave, onRemove }: {
  day: CurlDay; observations: ReviewObservation[]; seenThroughT: number;
  onRemove: (id: string) => Promise<boolean>;
  onSeen: (time: number) => void; onSave: (draft: ReviewDraft) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"replay" | "hindsight">("replay");
  const [index, setIndex] = useState(0);
  const [kind, setKind] = useState<ReviewKind>("advance");
  const [points, setPoints] = useState<Point[]>([]);
  const [reason, setReason] = useState("");
  const [marking, setMarking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [layers, setLayers] = useState({ structure: true, curls: true, levels: true, entries: true, exits: true });
  const cutoffIndex = mode === "hindsight" ? day.bars.length - 1 : index;
  const cutoffT = day.bars[cutoffIndex]?.[0] ?? 0;
  const seen = Math.max(seenThroughT, cutoffT);
  const pointOnly = kind === "entry" || kind === "exit";
  const candles = useMemo(() => day.bars.slice(0, cutoffIndex + 1).map(([t, o, h, l, c, vol]) => ({ t, o, h, l, c, vol })), [day, cutoffIndex]);
  const shown = useMemo(() => visibleReviewObservations(observations, mode, cutoffT).filter((item) =>
    item.kind === "entry" ? layers.entries : item.kind === "exit" ? layers.exits : item.kind === "curl" ? layers.curls
      : ["support", "resistance"].includes(item.kind) ? layers.levels : layers.structure), [observations, mode, cutoffT, layers]);
  const priceZones = useMemo<ChartPriceZone[]>(() => shown.filter((item) => item.kind !== "entry" && item.kind !== "exit")
    .map((item) => ({ id: item.id, low: item.low, high: item.high,
      tone: item.kind === "support" ? "support" : item.kind === "resistance" ? "resistance" : "candidate",
      startT: item.startT, endT: item.endT, label: `${name(item.kind)} · your observation` })), [shown]);
  const markers = useMemo(() => [...shown.flatMap((item) => [
    { t: item.startT, price: item.low, side: item.kind === "exit" ? "sell" as const : "buy" as const },
    ...(item.endT !== item.startT ? [{ t: item.endT, price: item.high, side: "sell" as const }] : []),
  ]), ...points.map((point, i) => ({ t: point.time, price: point.price, side: i ? "sell" as const : "buy" as const }))], [shown, points]);
  const start = points.length ? Math.min(...points.map((p) => p.time)) : 0;
  const end = points.length ? Math.max(...points.map((p) => p.time)) : 0;
  const low = points.length ? Math.min(...points.map((p) => p.price)) : 0;
  const high = points.length ? Math.max(...points.map((p) => p.price)) : 0;
  const complete = points.length === (pointOnly ? 1 : 2) && (kind !== "support" && kind !== "resistance" || high > low);

  function changeIndex(next: number) {
    const bounded = Math.max(0, Math.min(day.bars.length - 1, next));
    setIndex(bounded); onSeen(Math.max(seen, day.bars[bounded][0]));
    setPoints([]); setMarking(false); setStatus("");
  }
  function clickPoint(point: ChartPricePoint) {
    if (!marking || saving || point.time == null || point.time > cutoffT || !day.bars.some((b) => b[0] === point.time)) return;
    const next = [...points, { time: point.time, price: point.price }];
    setPoints(next);
    if (next.length >= (pointOnly ? 1 : 2)) setMarking(false);
  }

  if (!day.bars.length) return <p>No candles are available for this day.</p>;
  return (
    <section aria-label="Chart review workspace" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{day.sym} · {day.date}</h3>
        <PeriodTabs ariaLabel="Review perspective" value={mode} items={[{ value: "replay", label: "Candle replay" }, { value: "hindsight", label: "Full-day hindsight" }]}
          onChange={(value) => { if (saving) return; onSeen(value === "hindsight" ? day.bars.at(-1)![0] : seen); setMode(value as typeof mode); setPoints([]); setMarking(false); setStatus(""); }} />
      </div>
      <p className="text-sm text-[var(--muted)]">{mode === "replay" ? "Only completed candles through the selected minute are shown. Full-day detector results and hindsight annotations are hidden." : "The entire day is visible. New observations are saved as hindsight and stay separate from replay observations."}</p>
      {mode === "replay" ? <div className="grid gap-3 border-y border-[var(--hairline)] py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={saving || index === 0} onClick={() => changeIndex(index - 1)}>Previous candle</Button>
          <Button disabled={saving || index === day.bars.length - 1} onClick={() => changeIndex(index + 1)}>Next candle</Button>
          <Button disabled={saving || index === day.bars.length - 1} onClick={() => changeIndex(index + 5)}>+5 candles</Button>
          <span className="text-sm tabular-nums" aria-live="polite">Through {clock(cutoffT)} ET candle · {cutoffIndex + 1} {cutoffIndex === 0 ? "candle" : "candles"} shown</span>
        </div>
        <label className="grid gap-1 text-xs text-[var(--muted)]">Review cutoff
          <input aria-label="Review cutoff" type="range" min={0} max={day.bars.length - 1} value={index} disabled={saving}
            onChange={(event) => changeIndex(Number(event.target.value))} className="w-full accent-[var(--accent)]" />
        </label>
        {seen > cutoffT ? <p className="text-xs text-[var(--muted)]">Later candles through {clock(seen)} ET have already been shown in this review session. This will be recorded with your observation.</p> : null}
      </div> : null}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--muted)]" role="group" aria-label="Your observation overlays">
        {([ ["structure", "Structure"], ["curls", "Curls"], ["levels", "Levels"], ["entries", "Entries"], ["exits", "Exits"] ] as const).map(([key, label]) =>
          <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={layers[key]} onChange={(event) => setLayers({ ...layers, [key]: event.target.checked })} />{label}</label>)}
      </div>
      <Chart candles={candles} markers={markers} priceZones={priceZones} onPriceClick={clickPoint} enableFullscreen chartHeightClass="h-[420px]" />
      <p className="text-xs text-[var(--muted)]">Shaded areas show your marked structure, curls and levels; arrows mark observation boundaries (green start, red end), not app recommendations. Replay skips missing minutes; it does not simulate activity inside a candle.</p>
      <div className="grid gap-3 border-y border-[var(--hairline)] py-4">
        <div className="flex flex-wrap items-center gap-3">
          <CompactSelect label="Observation type" placeholder="Observation" value={kind} options={[...REVIEW_KINDS]}
            onChange={(value) => { if (saving) return; setKind(value as ReviewKind); setPoints([]); setMarking(false); }} />
          <Button disabled={saving} variant={marking ? "primary" : "ghost"} onClick={() => { setPoints([]); setMarking(!marking); setStatus(""); }}>
            {marking ? "Cancel marking" : pointOnly ? "Mark a candle" : "Mark an area"}
          </Button>
          <span className="text-xs text-[var(--muted)]">{marking ? pointOnly ? "Click the candle at your intended price." : points.length ? "Click the other boundary of the area." : "Click the first time/price boundary, then the second." : complete ? `${clock(start)}–${clock(end)} ET · $${low.toFixed(2)}–$${high.toFixed(2)}` : "Choose an observation, then mark it on the chart."}</span>
        </div>
        <label htmlFor="review-reason" className="text-xs text-[var(--muted)]">Why you marked it</label>
        <SharedNoteComposer name="review-reason" textareaId="review-reason" defaultValue="" value={reason} onTextChange={setReason}
          placeholder="What do the candles, volume and nearby levels show? For an entry or exit, explain your criterion." rows={2} size="compact" hideActions submitLabel="Save observation" disabled={saving} textareaProps={{ maxLength: 1000 }} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={!complete || !reason.trim() || saving} onClick={async () => {
            setSaving(true); setStatus("");
            try {
              const saved = await onSave({ kind, startT: start, endT: end, low, high, reason, mode, cutoffT, seenThroughT: seen });
              if (saved) { setPoints([]); setReason(""); setStatus("Observation saved."); }
              else setStatus("Could not save. Your draft is still here; try again.");
            } finally { setSaving(false); }
          }}>{saving ? "Saving…" : `Save ${mode === "replay" ? "replay" : "hindsight"} observation`}</Button>
          {status ? <p role="status" className="text-sm text-[var(--muted)]">{status}</p> : null}
        </div>
      </div>
      <div className="grid gap-2">
        <h4 className="text-sm font-semibold">Your observations · {shown.length}</h4>
        {shown.length ? shown.map((item) => <div key={item.id} className="border-b border-[var(--hairline)] py-2 text-sm">
          <div className="flex flex-wrap gap-x-3 gap-y-1"><strong>{name(item.kind)}</strong><span>{clock(item.startT)}–{clock(item.endT)} ET</span><span className="text-[var(--muted)]">{item.mode === "hindsight" ? "Hindsight" : `Replay through ${clock(item.cutoffT)}${item.seenThroughT > item.cutoffT ? " · later candles already seen" : ""}`}</span></div>
          <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{item.reason}</p>
          <Button disabled={saving} onClick={async () => { setSaving(true); try { setStatus(await onRemove(item.id) ? "Observation removed. Mark the chart again to replace it." : "Could not remove the observation. Try again."); } finally { setSaving(false); } }}>Remove observation</Button>
        </div>) : <p className="text-sm text-[var(--muted)]">No observations visible at this cutoff. Mark what you see before revealing more.</p>}
      </div>
      <p className="text-xs text-[var(--muted)]">Research annotations, not an automated strategy. Exposure tracking covers this page session only; earlier visits or charts seen elsewhere are unknown. Observations save separately from existing curl labels.</p>
    </section>
  );
}
