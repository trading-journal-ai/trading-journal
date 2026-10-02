"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import CompactSelect from "@/components/ui/CompactSelect";
import type { ChartPriceZone } from "@/components/LightweightTradeChart";
import type { CurlDay, DayZoneLabels, PriceZoneCandidate, ZoneRole } from "@/lib/marketInsights";

export const ROLE_OPTIONS: { value: ZoneRole; label: string }[] = [
  { value: "support", label: "Support" },
  { value: "resistance", label: "Resistance" },
  { value: "flip", label: "Flip (resistance → support)" },
];

const etFormat = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hourCycle: "h23" });
const clock = (t: number | null) => (t == null ? "—" : etFormat.format(new Date(t * 1000)));
const money = (value: number) => `$${value.toFixed(2)}`;

export type ZoneChange =
  | { zoneDecision: { id: string; verdict: "keep" | "reject" | null; role?: ZoneRole; low?: number; high?: number } }
  | { zoneAdd: { id?: string; low: number; high: number; role: ZoneRole; comment?: string } }
  | { zoneRemove: string };

/** Zones for the chart in edit mode: unreviewed candidates in gray, kept/added in their role color, rejected hidden. */
export function editorChartZones(day: CurlDay, zones: DayZoneLabels | undefined, selectedId: string | null): ChartPriceZone[] {
  const kept = day.priceZones.flatMap((zone) => {
    const decision = zones?.decisions[zone.id];
    if (decision?.verdict === "reject") return [];
    const low = decision?.low ?? zone.low, high = decision?.high ?? zone.high;
    return [{ id: zone.id, low, high, tone: decision ? decision.role ?? zone.role : "candidate",
      label: `${money(low)}–${money(high)}${decision ? ` · ${decision.role ?? zone.role}` : ""}`, emphasized: zone.id === selectedId } satisfies ChartPriceZone];
  });
  const added = (zones?.added ?? []).map((zone) => ({ id: zone.id, low: zone.low, high: zone.high, tone: zone.role,
    label: `${money(zone.low)}–${money(zone.high)} · ${zone.role} (added)`, emphasized: zone.id === selectedId } satisfies ChartPriceZone));
  return [...kept, ...added];
}

export default function ZoneEditor({ day, zones, selectedId, onSelect, onChange, adding, onAddingChange, addRole, onAddRoleChange }: {
  day: CurlDay;
  zones: DayZoneLabels | undefined;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (change: ZoneChange, success: string) => Promise<boolean>;
  adding: boolean;
  onAddingChange: (value: boolean) => void;
  addRole: ZoneRole;
  onAddRoleChange: (role: ZoneRole) => void;
}) {
  const reviewed = Object.keys(zones?.decisions ?? {}).length;
  const candidates = [...day.priceZones].sort((a, b) => b.center - a.center);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-y border-[var(--hairline)] py-4">
        <p className="max-w-2xl text-[13px] leading-6 text-[var(--muted)]">
          Gray bands are the detector’s zones: swing highs and lows within 10¢ (or 1.5% of price) of each other, touched at least twice.
          Keep or reject each one, fix its edges or role, and add zones it missed by clicking the chart. {reviewed} of {day.priceZones.length} reviewed.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1 text-xs text-[var(--muted)]">New zone role
            <CompactSelect label="New zone role" placeholder="Role" value={addRole} options={ROLE_OPTIONS} onChange={(value) => onAddRoleChange(value as ZoneRole)} />
          </div>
          <Button variant={adding ? "primary" : "ghost"} aria-pressed={adding} onClick={() => onAddingChange(!adding)}>
            {adding ? "Click the chart to place it…" : "Add a zone"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border-y border-[var(--hairline)]">
        <table className="w-full min-w-[900px] border-collapse text-left text-[13px] tabular-nums">
          <thead className="text-xs text-[var(--muted)]">
            <tr className="border-b border-[var(--hairline)]">
              <th className="px-2 py-2.5 font-medium">Zone</th><th className="px-2 py-2.5 font-medium">Detector read</th><th className="px-2 py-2.5 font-medium">Touches (ET)</th>
              <th className="px-2 py-2.5 font-medium">Your call</th><th className="px-2 py-2.5 font-medium">Role</th><th className="px-2 py-2.5 font-medium">Edges</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((zone) => (
              <CandidateRow key={zone.id} zone={zone} decision={zones?.decisions[zone.id]} selected={zone.id === selectedId} onSelect={onSelect} onChange={onChange} />
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="added-zones" className="grid gap-2">
        <h3 id="added-zones" className="text-[15px] font-semibold text-[var(--foreground)]">Zones you added</h3>
        {zones?.added.length ? (
          <ul className="grid gap-2">
            {zones.added.map((zone) => <AddedRow key={zone.id} zone={zone} selected={zone.id === selectedId} onSelect={onSelect} onChange={onChange} />)}
          </ul>
        ) : <p className="text-[13px] text-[var(--muted)]">None yet. Choose a role, press Add a zone, then click the chart at the level.</p>}
      </section>
    </div>
  );
}

function EdgeInputs({ id, low, high, onSave }: { id: string; low: number; high: number; onSave: (low: number, high: number) => void }) {
  const [draft, setDraft] = useState<{ low: string; high: string } | null>(null);
  const value = draft ?? { low: low.toFixed(2), high: high.toFixed(2) };
  const commit = () => {
    if (!draft) return;
    const nextLow = Number(draft.low), nextHigh = Number(draft.high);
    setDraft(null);
    if (Number.isFinite(nextLow) && Number.isFinite(nextHigh) && (nextLow !== low || nextHigh !== high)) onSave(nextLow, nextHigh);
  };
  return (
    <div className="flex items-center gap-1">
      <label htmlFor={`${id}-low`} className="sr-only">Zone low</label>
      <input id={`${id}-low`} inputMode="decimal" value={value.low} onChange={(event) => setDraft({ ...value, low: event.target.value })} onBlur={commit}
        onKeyDown={(event) => { if (event.key === "Enter") commit(); }}
        className="h-8 w-[4.5rem] rounded-md border border-[var(--border)] bg-transparent px-2 text-[13px] text-[var(--foreground)]" />
      <span className="text-[var(--muted)]">–</span>
      <label htmlFor={`${id}-high`} className="sr-only">Zone high</label>
      <input id={`${id}-high`} inputMode="decimal" value={value.high} onChange={(event) => setDraft({ ...value, high: event.target.value })} onBlur={commit}
        onKeyDown={(event) => { if (event.key === "Enter") commit(); }}
        className="h-8 w-[4.5rem] rounded-md border border-[var(--border)] bg-transparent px-2 text-[13px] text-[var(--foreground)]" />
    </div>
  );
}

function CandidateRow({ zone, decision, selected, onSelect, onChange }: {
  zone: PriceZoneCandidate;
  decision: DayZoneLabels["decisions"][string] | undefined;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onChange: (change: ZoneChange, success: string) => Promise<boolean>;
}) {
  const low = decision?.low ?? zone.low, high = decision?.high ?? zone.high;
  const role = decision?.role ?? zone.role;
  const name = `${money(low)}–${money(high)}`;
  const decide = (verdict: "keep" | "reject") => void onChange(
    { zoneDecision: { id: zone.id, verdict: decision?.verdict === verdict ? null : verdict } },
    decision?.verdict === verdict ? `Cleared your call on ${name}.` : `${verdict === "keep" ? "Kept" : "Rejected"} ${name}.`);
  const touches = zone.touches.map((touch) => `${clock(touch.t)} ${touch.kind === "resistance" ? "R" : "S"}`).join(" · ");
  return (
    <tr className={`border-b border-[var(--hairline)] ${selected ? "bg-[var(--surface)]" : ""} ${decision?.verdict === "reject" ? "opacity-60" : ""}`}>
      <td className="px-2 py-2"><button type="button" onClick={() => onSelect(selected ? null : zone.id)} aria-pressed={selected}
        className="font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">{name}</button></td>
      <td className="px-2 py-2 text-[var(--body)]">{zone.role}{zone.brokeT ? ` · broke ${clock(zone.brokeT)}` : ""}{zone.flipT ? ` · held ${clock(zone.flipT)}` : ""}</td>
      <td className="max-w-[260px] px-2 py-2 text-xs text-[var(--muted)]">{zone.touches.length}: {touches}</td>
      <td className="px-2 py-2">
        <div className="flex gap-1" role="group" aria-label={`Your call on ${name}`}>
          {(["keep", "reject"] as const).map((verdict) => (
            <button key={verdict} type="button" aria-pressed={decision?.verdict === verdict} onClick={() => decide(verdict)}
              className={`rounded-md border px-2 py-1 text-[12px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                decision?.verdict === verdict
                  ? verdict === "keep" ? "border-[var(--green)] bg-[var(--green)] text-[var(--background)]" : "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--hairline)] text-[var(--body)] hover:border-[var(--muted)]"}`}>
              {verdict === "keep" ? "Keep" : "Reject"}
            </button>
          ))}
        </div>
      </td>
      <td className="px-2 py-2">
        <CompactSelect label={`Role for ${name}`} placeholder="Role" value={role} options={ROLE_OPTIONS}
          onChange={(value) => void onChange({ zoneDecision: { id: zone.id, verdict: "keep", role: value as ZoneRole } }, `Kept ${name} as ${value}.`)} />
      </td>
      <td className="px-2 py-2">
        <EdgeInputs id={`zone-${zone.id}`} low={low} high={high}
          onSave={(nextLow, nextHigh) => void onChange({ zoneDecision: { id: zone.id, verdict: "keep", low: nextLow, high: nextHigh } }, `Kept ${money(nextLow)}–${money(nextHigh)} with your edges.`)} />
      </td>
    </tr>
  );
}

function AddedRow({ zone, selected, onSelect, onChange }: {
  zone: DayZoneLabels["added"][number];
  selected: boolean;
  onSelect: (id: string | null) => void;
  onChange: (change: ZoneChange, success: string) => Promise<boolean>;
}) {
  const name = `${money(zone.low)}–${money(zone.high)}`;
  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 ${selected ? "border-[var(--foreground)]" : "border-[var(--hairline)]"}`}>
      <button type="button" onClick={() => onSelect(selected ? null : zone.id)} aria-pressed={selected}
        className="text-[13px] font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">{name}</button>
      <CompactSelect label={`Role for ${name}`} placeholder="Role" value={zone.role} options={ROLE_OPTIONS}
        onChange={(value) => void onChange({ zoneAdd: { id: zone.id, low: zone.low, high: zone.high, role: value as ZoneRole } }, `Saved ${name} as ${value}.`)} />
      <EdgeInputs id={zone.id} low={zone.low} high={zone.high}
        onSave={(low, high) => void onChange({ zoneAdd: { id: zone.id, low, high, role: zone.role } }, `Saved ${money(low)}–${money(high)}.`)} />
      <button type="button" onClick={() => void onChange({ zoneRemove: zone.id }, `Removed ${name}.`)}
        className="text-[13px] font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">Remove</button>
    </li>
  );
}
