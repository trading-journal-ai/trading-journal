/**
 * Calibrate opportunity-context thresholds against the trader's own history.
 *
 * Usage: npx tsx scripts/opportunity-context-calibrate.mts [--in FILE] [--out FILE]
 *
 * Reads the batch output (contexts.jsonl), prints expectancy by decile for
 * the driving metrics, sweeps candidate thresholds with sample-size guards,
 * and writes a versioned calibration file (constants + metadata + known
 * conditioning gaps). Read-only; changing engine constants stays a reviewed
 * code change, not a script side effect.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const argOf = (flag: string, fallback: string) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const inPath = resolve(argOf("--in", "data/opportunity-context/contexts.jsonl"));
const outPath = resolve(argOf("--out", "data/opportunity-context/calibration-v1.json"));

type Row = {
  pnl: number | null;
  classification: string;
  atEntry: {
    extensionAtr: number | null;
    minutesSinceHigh: number | null;
    volumeState: string | null;
  } | null;
  postTrade: { mfeAtr: number | null; captureRatio: number | null } | null;
};

const rows: Row[] = readFileSync(inPath, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const usable = rows.filter(
  (r): r is Row & { pnl: number; atEntry: NonNullable<Row["atEntry"]> } =>
    r.pnl != null && r.atEntry != null &&
    r.atEntry.extensionAtr != null && r.atEntry.minutesSinceHigh != null,
);
console.log(`Corpus: ${rows.length} trades, ${usable.length} usable (entry facts + P&L)\n`);

const avg = (xs: number[]) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const winRate = (xs: number[]) => {
  const decided = xs.filter((x) => x !== 0);
  return decided.length > 0 ? xs.filter((x) => x > 0).length / decided.length : 0;
};

function decileTable(label: string, value: (r: (typeof usable)[number]) => number) {
  const sorted = [...usable].sort((a, b) => value(a) - value(b));
  console.log(`── Expectancy by ${label} decile ──`);
  for (let d = 0; d < 10; d += 1) {
    const slice = sorted.slice(
      Math.floor((d * sorted.length) / 10),
      Math.floor(((d + 1) * sorted.length) / 10),
    );
    const lo = value(slice[0]);
    const hi = value(slice[slice.length - 1]);
    const pnls = slice.map((r) => r.pnl);
    console.log(
      `  d${d + 1}  [${lo.toFixed(1).padStart(6)} … ${hi.toFixed(1).padStart(6)}]` +
      `  n=${slice.length}  avg=$${avg(pnls).toFixed(1).padStart(6)}  win=${Math.round(winRate(pnls) * 100)}%`,
    );
  }
  console.log("");
}

decileTable("entry extension (ATR)", (r) => r.atEntry.extensionAtr!);
decileTable("minutes since high", (r) => r.atEntry.minutesSinceHigh!);

/**
 * Sweep a threshold: pick the cut that maximizes expectancy separation
 * (below-avg minus above-avg), requiring each side to keep ≥ minShare of
 * the sample so we don't tune to tails.
 */
function sweep(
  label: string,
  values: (r: (typeof usable)[number]) => number,
  candidates: number[],
  minShare = 0.15,
) {
  let best: { t: number; below: number; above: number; nAbove: number; sep: number } | null = null;
  console.log(`── Threshold sweep: ${label} ──`);
  for (const t of candidates) {
    const above = usable.filter((r) => values(r) >= t).map((r) => r.pnl);
    const below = usable.filter((r) => values(r) < t).map((r) => r.pnl);
    if (above.length < usable.length * minShare || below.length < usable.length * minShare) continue;
    const sep = avg(below) - avg(above);
    console.log(
      `  t=${String(t).padStart(5)}  below avg=$${avg(below).toFixed(1).padStart(6)} (n=${below.length})` +
      `  above avg=$${avg(above).toFixed(1).padStart(6)} (n=${above.length})  sep=$${sep.toFixed(1)}`,
    );
    if (best == null || sep > best.sep) best = { t, below: avg(below), above: avg(above), nAbove: above.length, sep };
  }
  console.log(best ? `  → best cut: ${best.t} (separation $${best.sep.toFixed(1)}/trade)\n` : "  → no valid cut\n");
  return best;
}

const extBest = sweep(
  "extensionAtr",
  (r) => r.atEntry.extensionAtr!,
  [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5],
);
const staleBest = sweep(
  "staleMinutes",
  (r) => r.atEntry.minutesSinceHigh!,
  [10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 120],
);

// Joint dead-zone (move-mature) sweep: extended AND stale.
console.log("── Joint sweep: move-mature = extension ≥ Te AND staleness ≥ Tm ──");
let joint: { te: number; tm: number; n: number; avgIn: number; avgOut: number; drag: number } | null = null;
for (const te of [1, 1.5, 2, 2.5, 3]) {
  for (const tm of [15, 20, 30, 45, 60]) {
    const inZone = usable.filter(
      (r) => r.atEntry.extensionAtr! >= te && r.atEntry.minutesSinceHigh! >= tm,
    ).map((r) => r.pnl);
    if (inZone.length < 200) continue;
    const outZone = usable.filter(
      (r) => !(r.atEntry.extensionAtr! >= te && r.atEntry.minutesSinceHigh! >= tm),
    ).map((r) => r.pnl);
    const drag = (avg(outZone) - avg(inZone)) * inZone.length;
    if (joint == null || drag > joint.drag) {
      joint = { te, tm, n: inZone.length, avgIn: avg(inZone), avgOut: avg(outZone), drag };
    }
  }
}
if (joint) {
  console.log(
    `  → deepest dead zone: ext ≥ ${joint.te} ATR & stale ≥ ${joint.tm} min` +
    `  (n=${joint.n}, avg=$${joint.avgIn.toFixed(1)} vs $${joint.avgOut.toFixed(1)} elsewhere,` +
    ` total drag ≈ $${Math.round(joint.drag)})\n`,
  );
}

// Capture ratio: where do big-MFE trades that kept little actually sit?
const bigMove = rows.filter(
  (r) => r.pnl != null && r.postTrade?.captureRatio != null && (r.postTrade.mfeAtr ?? 0) >= 1,
);
const captures = bigMove.map((r) => r.postTrade!.captureRatio!).sort((a, b) => a - b);
const q = (p: number) => captures[Math.min(captures.length - 1, Math.floor(p * captures.length))];
console.log(
  `── Capture ratio (trades with MFE ≥ 1 ATR, n=${captures.length}) ──\n` +
  `  quartiles: p25=${q(0.25).toFixed(2)}  p50=${q(0.5).toFixed(2)}  p75=${q(0.75).toFixed(2)}\n`,
);

const calibration = {
  version: "v1",
  calibratedAt: new Date().toISOString().slice(0, 10),
  corpus: {
    source: "backfill 2026-01-05 → 2026-07-20 (paper account)",
    trades: rows.length,
    usable: usable.length,
    riskBasis: "dollars (planned risk not recorded historically)",
  },
  conditioningGaps: [
    "not conditioned on market context / opportunity-set grade (forward-capture only)",
    "paper-trading sizing; recalibrate against live data when available",
  ],
  chosen: {
    extensionAtr: extBest?.t ?? 2.0,
    staleMinutes: staleBest?.t ?? 30,
    moveMature: joint ? { extensionAtr: joint.te, staleMinutes: joint.tm } : null,
    capturePoorRatio: Math.round(q(0.25) * 100) / 100,
  },
  evidence: { extBest, staleBest, joint },
};
writeFileSync(outPath, JSON.stringify(calibration, null, 2));
console.log(`Calibration written: ${outPath}`);
