"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import CompactSelect from "@/components/ui/CompactSelect";
import SharedNoteComposer from "@/components/SharedNoteComposer";
import type { ChartPricePoint, ChartPriceZone } from "@/components/LightweightTradeChart";
import type { CurlDay } from "@/lib/marketInsights";
import type { AddedLevel, LevelDecision, LevelGeometry, LevelReviewInput, LevelReviewState } from "@/lib/marketLevelReview";

const Chart = dynamic(() => import("@/components/LightweightTradeChart"), { ssr: false,
  loading: () => <div className="h-[520px] animate-pulse bg-[var(--surface)]" /> });
const et = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const clock = (t: number) => et.format(new Date(t * 1000));
const price = (n: number) => `$${n.toFixed(2)}`;
const levelPrice = (g: LevelGeometry) => (g.low + g.high) / 2;
const exactPrice = (n: number) => Number(n.toFixed(4));
const geometry = ({ role, low, high, startT, endT }: LevelGeometry): LevelGeometry => ({ role, low, high, startT, endT });
const verdictText = { accepted: "Accepted", corrected: "Corrected", rejected: "Rejected", unsure: "Unsure" };

export default function LevelReviewWorkspace({ day, onDirtyChange }: { day: CurlDay; onDirtyChange: (dirty: boolean) => void }) {
  const [state, setState] = useState<LevelReviewState | null>(null);
  const [decisions, setDecisions] = useState<Record<string, LevelDecision>>({});
  const [added, setAdded] = useState<AddedLevel[]>([]);
  const [coverage, setCoverage] = useState<LevelReviewInput["coverage"]>("proposals-only");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [marking, setMarking] = useState(false);
  const retry = useRef<{ payload: string; id: string } | null>(null);
  const candles = useMemo(() => day.bars.map(([t, o, h, l, c, vol]) => ({ t, o, h, l, c, vol })), [day]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/market-insights/level-review?dayId=${encodeURIComponent(day.id)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load level proposals.");
        return result as LevelReviewState;
      }).then((result) => {
        setState(result);
        setDecisions(Object.fromEntries((result.latest?.decisions ?? []).map((d) => [d.proposalId, d])));
        setAdded(result.latest?.added ?? []); setCoverage(result.latest?.coverage ?? "proposals-only");
        const roleChange = result.run.proposals.filter((p) => p.evidence.some((e) => e.role === "support") && p.evidence.some((e) => e.role === "resistance"))
          .sort((a, b) => (b.evidence.at(-1)?.t ?? 0) - (a.evidence.at(-1)?.t ?? 0))[0];
        setSelectedId(roleChange?.id ?? result.run.proposals[0]?.id ?? result.latest?.added[0]?.id ?? null);
        setDirty(false); setError(""); setMarking(false);
      }).catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load level proposals."); });
    return () => controller.abort();
  }, [day.id, reload]);

  useEffect(() => { onDirtyChange(dirty || saving); }, [dirty, saving, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    if (!dirty && !saving) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const leave = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (anchor && !window.confirm("Leave this review? Unsubmitted changes will be lost.")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leave, true); };
  }, [dirty, saving]);

  const proposals = state?.run.proposals ?? [];
  const selected = proposals.find((p) => p.id === selectedId);
  const selectedAdded = added.find((p) => p.id === selectedId);
  const decision = selected ? decisions[selected.id] : undefined;
  const current = selectedAdded ?? (selected ? decision?.geometry ?? selected : null);
  const reason = selectedAdded?.reason ?? decision?.reason ?? "";
  const remaining = proposals.filter((p) => !decisions[p.id]).length;
  const zones = useMemo<ChartPriceZone[]>(() => {
    if (!state) return [];
    const output: ChartPriceZone[] = state.run.proposals.flatMap((p) => {
      const d = decisions[p.id];
      if (d?.verdict === "rejected" && !showRejected) return [];
      if (!showAll && p.id !== selectedId && d?.verdict !== "accepted" && d?.verdict !== "corrected" && !(d?.verdict === "rejected" && showRejected)) return [];
      const g = d?.geometry ?? p;
      return [{ id: p.id, ...g, display: "line" as const, tone: d?.verdict === "rejected" || d?.verdict === "unsure" ? "candidate" as const : g.role,
        emphasized: p.id === selectedId, label: p.id === selectedId ? `${price((g.low + g.high) / 2)} · ${g.role}` : undefined }];
    });
    output.push(...added.map((p) => ({ ...p, display: "line" as const, tone: p.role, emphasized: p.id === selectedId, label: `${price((p.low + p.high) / 2)} · added ${p.role}` })));
    if (showOriginal && selected) output.push({ ...selected, id: `original-${selected.id}`, display: "line", tone: "candidate", label: "Original proposal" });
    return output;
  }, [state, decisions, added, showAll, showRejected, showOriginal, selectedId, selected]);
  const markers = useMemo(() => (selected?.evidence ?? []).map((e) => ({ t: e.t, price: e.price, side: e.role === "support" ? "buy" as const : "sell" as const })), [selected]);

  function changed() { setDirty(true); setMessage(""); setError(""); }
  function editGeometry(next: LevelGeometry) {
    if (saving || !selectedId) return;
    changed();
    if (selectedAdded) setAdded((items) => items.map((p) => p.id === selectedId ? { ...p, ...next } : p));
    else if (selected) setDecisions((items) => ({ ...items, [selected.id]: { proposalId: selected.id, verdict: "corrected", geometry: next, reason } }));
  }
  function editReason(value: string) {
    changed();
    if (selectedAdded) setAdded((items) => items.map((p) => p.id === selectedId ? { ...p, reason: value } : p));
    else if (selected) setDecisions((items) => ({ ...items, [selected.id]: { ...items[selected.id], proposalId: selected.id, verdict: items[selected.id]?.verdict ?? "unsure", reason: value } }));
  }
  function decide(verdict: LevelDecision["verdict"]) {
    if (!selected || saving) return;
    changed();
    setDecisions((items) => ({ ...items, [selected.id]: { proposalId: selected.id, verdict, reason,
      ...(verdict === "corrected" ? { geometry: geometry(current!) } : {}) } }));
  }
  function click(point: ChartPricePoint) {
    if (saving) return;
    if (!marking) {
      const hit = zones.filter((z) => !z.id.startsWith("original-") && point.price >= z.low && point.price <= z.high && point.time != null && point.time >= (z.startT ?? 0) && point.time <= (z.endT ?? Infinity))
        .sort((a, b) => (a.high - a.low) - (b.high - b.low))[0];
      if (hit) setSelectedId(hit.id);
      return;
    }
    if (point.time == null || !day.bars.some((b) => b[0] === point.time)) return;
    const anchor = Math.round(point.price * 100) / 100;
    if (anchor <= 0.01) return;
    const id = `manual-${crypto.randomUUID()}`;
    const startT = point.time;
    // Keep a minimal internal tolerance for the existing review schema; draw one price.
    setAdded((items) => [...items, { id, low: anchor - 0.005, high: anchor + 0.005, role: "support",
      startT, endT: day.bars.at(-1)![0], reason: "" }]);
    setSelectedId(id); setMarking(false); changed();
  }
  function removeLevel(id: string) {
    if (saving) return;
    changed();
    if (added.some((p) => p.id === id)) setAdded((items) => items.filter((p) => p.id !== id));
    else setDecisions((items) => ({ ...items, [id]: { proposalId: id, verdict: "rejected", reason: items[id]?.reason.trim() || "Removed this proposed level from the chart." } }));
    setSelectedId(null);
  }

  async function submit() {
    if (!state || saving) return;
    const missingReason = Object.values(decisions).some((d) => d.verdict !== "accepted" && !d.reason.trim()) || added.some((p) => !p.reason.trim());
    if (missingReason) { setError("Add a reason to each correction, rejection, unsure decision, and added level before submitting."); return; }
    if (coverage === "whole-chart" && remaining) { setError("Review every proposal before marking the whole chart reviewed."); return; }
    const input = { dayId: day.id, runId: state.run.id, baseRevision: state.revision, decisions: Object.values(decisions), added, coverage };
    const payload = JSON.stringify(input);
    if (retry.current?.payload !== payload) retry.current = { payload, id: crypto.randomUUID() };
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/market-insights/level-review", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, submissionId: retry.current.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Review could not be submitted. Your changes are still here.");
      setState(result as LevelReviewState); setDirty(false); retry.current = null;
      setMessage(`Review submitted · revision ${result.revision}. Original proposals and your decisions are preserved.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Review could not be submitted. Your changes are still here."); }
    finally { setSaving(false); }
  }

  return <section aria-label="Level review workspace" className="grid min-w-0 gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-lg font-semibold">{day.sym} · {day.date}</h3><p className="mt-1 text-sm text-[var(--muted)]">Hindsight through {clock(day.bars.at(-1)?.[0] ?? 0)} ET · proposals use all available candles.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={saving || !state} onClick={() => { setMarking(!marking); }}>{marking ? "Cancel drawing" : "Add missed level"}</Button>
        <Button disabled={saving} onClick={() => { if (!dirty || window.confirm("Discard unsubmitted changes and reload this review?")) { setState(null); setReload((v) => v + 1); setMessage(""); } }}>Reload saved review</Button>
      </div>
    </div>
    {error ? <p role="alert" className="text-sm text-[var(--red)]">{error}</p> : null}
    {message ? <p role="status" className="text-sm text-[var(--green)]">{message}</p> : null}
    {!state ? <p role="status" className="text-sm text-[var(--muted)]">{error ? "Reload to retry." : "Finding level proposals…"}</p> : <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
        <span>{proposals.length} proposed · {remaining} unreviewed · {added.length} added</span>
        <label className="flex items-center gap-2"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />Show all proposals</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={showRejected} onChange={(e) => setShowRejected(e.target.checked)} />Show rejected</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={showOriginal} onChange={(e) => setShowOriginal(e.target.checked)} />Compare original</label>
      </div>
      <p className="text-sm text-[var(--muted)]">{marking ? "Click once at the price where the missing level begins." : "Select a level below. Drag its square handle to move it; × removes it. Only selected and kept levels are shown unless you show all proposals."}</p>
      <Chart candles={candles} markers={markers} priceZones={zones} onPriceClick={click}
        onPriceZoneSelect={!marking && !saving ? (id) => { if (!id.startsWith("original-")) setSelectedId(id); } : undefined}
        onPriceZoneRemove={!marking && !saving ? removeLevel : undefined}
        onPriceZoneChange={!saving && !marking && current ? (_id, edges) => editGeometry({ ...geometry(current), ...edges }) : undefined}
        indicatorsEnabled={false} volumeEnabled enableTradeScopeToggle={false} excursionsEnabled={false} enableFullscreen
        fullscreenHeader={<div className="mr-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <strong>{day.sym} · {day.date} · Levels (hindsight)</strong>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />Show all proposals</label>
          <span className="text-[var(--muted)]">Select a line, drag its square to move it, or × to remove. Close to submit your review.</span>
        </div>} />
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="grid max-h-96 content-start gap-1 overflow-y-auto pr-1" role="group" aria-label="Level proposals">
          {proposals.length || added.length ? null : <p className="text-sm text-[var(--muted)]">No repeated wick levels met this detector’s thresholds. Add any levels it missed.</p>}
          {[...proposals, ...added].map((p) => {
            const d = decisions[p.id]; const g = d?.geometry ?? p;
            return <button key={p.id} type="button" aria-pressed={p.id === selectedId} onClick={() => setSelectedId(p.id)}
              className={`flex flex-wrap justify-between gap-2 rounded-md border px-3 py-3 text-left text-sm ${p.id === selectedId ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--hairline)]"}`}>
              <span><strong>{price(levelPrice(g))}</strong> · {g.role}</span>
              <span className="text-[var(--muted)]">{"evidence" in p ? d ? verdictText[d.verdict] : "Unreviewed" : "Added"}</span>
            </button>;
          })}
        </div>
        {current ? <fieldset disabled={saving} className="grid min-w-0 content-start gap-3 border-t border-[var(--hairline)] pt-3 lg:border-t-0 lg:pt-0">
          <legend className="sr-only">Selected level</legend>
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{selectedAdded ? "Your added level" : "Review selected level"}</h4>
            <CompactSelect label="Level role" placeholder="Role" value={current.role} options={[{ value: "support", label: "Support" }, { value: "resistance", label: "Resistance" }]}
              onChange={(role) => editGeometry({ ...geometry(current), role: role as LevelGeometry["role"] })} /></div>
          {selected ? <p className="text-sm leading-6 text-[var(--muted)]">{selected.explanation} Original level: {price(levelPrice(selected))} · {selected.role}.</p> : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 grid gap-1 text-sm">Level price
              <input key={`${selectedId}-${levelPrice(current)}`} aria-label="Level price" type="number" step="0.01" min="0.01" defaultValue={exactPrice(levelPrice(current))}
                onBlur={(e) => {
                  const value = Number(e.target.value), shift = value - levelPrice(current);
                  if (value === exactPrice(levelPrice(current))) return;
                  if (Number.isFinite(value) && current.low + shift > 0 && current.high + shift < 100_000) {
                    editGeometry({ ...geometry(current), low: Number((current.low + shift).toFixed(6)), high: Number((current.high + shift).toFixed(6)) });
                  } else { e.target.value = String(exactPrice(levelPrice(current))); setError("Enter a positive level price."); }
                }}
                className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2" />
            </label>
            {(["startT", "endT"] as const).map((edge) => <label key={edge} className="grid gap-1 text-sm">{edge === "startT" ? "Starts (ET)" : "Ends (ET)"}
              <select aria-label={edge === "startT" ? "Starts (ET)" : "Ends (ET)"} value={current[edge]}
                onChange={(e) => { const t = Number(e.target.value); if (edge === "startT" ? t <= current.endT : t >= current.startT) editGeometry({ ...geometry(current), [edge]: t }); else setError("Start must be at or before the end candle."); }}
                className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                {day.bars.map((b) => <option key={b[0]} value={b[0]}>{clock(b[0])}</option>)}
              </select></label>)}
          </div>
          <label htmlFor="level-review-reason" className="text-sm">Level review reason</label>
          <SharedNoteComposer name="level-review-reason" textareaId="level-review-reason" defaultValue="" value={reason} onTextChange={editReason}
            placeholder="Why keep, change, reject, or add this level?" rows={2} size="compact" hideActions submitLabel="Submit level review" disabled={saving} dictationEnabled={false} textareaProps={{ maxLength: 1000 }} />
          {selected ? <div className="flex flex-wrap gap-2">
            <Button aria-pressed={decision?.verdict === "accepted"} onClick={() => decide("accepted")}>{decision?.geometry ? "Accept original" : "Accept"}</Button>
            <Button aria-pressed={decision?.verdict === "corrected"} onClick={() => decide("corrected")}>Keep correction</Button>
            <Button aria-pressed={decision?.verdict === "rejected"} onClick={() => removeLevel(selected.id)}>Remove level</Button>
            <Button aria-pressed={decision?.verdict === "unsure"} onClick={() => decide("unsure")}>Unsure</Button>
            {decision ? <Button onClick={() => { changed(); setDecisions((items) => { const next = { ...items }; delete next[selected.id]; return next; }); }}>Reset decision</Button> : null}
          </div> : <Button onClick={() => removeLevel(selectedAdded!.id)}>Remove added level</Button>}
          {selected ? <details className="text-sm"><summary className="cursor-pointer text-[var(--muted)]">Evidence · {selected.evidence.length} wick tests (ET)</summary>
            <ul className="mt-2 grid gap-1 text-[var(--muted)]">{selected.evidence.map((e, i) => <li key={`${e.t}-${e.role}-${i}`}>{clock(e.t)} · {price(e.price)} · {e.role} test · pivot confirmed {clock(e.confirmedAt)}</li>)}</ul>
            <p className="mt-2 text-xs text-[var(--muted)]">Pivot confirmation times describe individual tests. The grouped level uses the full day and is not an at-the-time signal.</p>
          </details> : null}
        </fieldset> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--hairline)] pt-4">
        <div className="grid gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" disabled={saving} checked={coverage === "whole-chart"} onChange={(e) => { changed(); setCoverage(e.target.checked ? "whole-chart" : "proposals-only"); }} />I also checked the whole chart for missing levels</label>
          <p className="text-xs text-[var(--muted)]">{state.latest ? `Saved revision ${state.latest.revision}` : "No submitted review for these proposals"}{dirty ? " · unsubmitted changes" : ""}. Unreviewed areas remain unknown. Submission saves feedback; it does not train a model.</p></div>
        <Button variant="action" disabled={saving || !dirty} onClick={() => void submit()}>{saving ? "Submitting…" : "Submit level review"}</Button>
      </div>
    </>}
  </section>;
}
