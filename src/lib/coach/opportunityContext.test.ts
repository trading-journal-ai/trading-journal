import { describe, expect, it } from "vitest";
import { MARKET_TZ, zonedDateTimeToUtcMs } from "@/lib/time";
import type { Candle } from "@/lib/candles/massive";
import {
  anatomyAt,
  opportunityContextForTrade,
  sessionAnatomy,
  type OpportunityTradeInput,
} from "./opportunityContext";

const DATE = "2026-03-04";

function et(time: string): number {
  return Math.round(zonedDateTimeToUtcMs(DATE, time, MARKET_TZ) / 1000);
}

/**
 * Scripted synthetic ticker-day (1-min bars, contiguous from 09:00 ET):
 *
 *   09:00–09:29  premarket ramp 9.50 → 10.00 (PM high 10.00), vol 20k
 *   09:30–09:44  ignition 10.00 → 12.50, vol 100k (expanding)
 *   09:45–09:54  pullback 12.50 → 11.85, vol 40k
 *   09:55–09:59  base ~11.78–11.88 (swing low 11.78), vol 30k
 *   10:00–10:09  continuation 11.90 → 12.60 (new HOD), vol 90k
 *   10:10–10:20  two failed HOD-break attempts (wicks over, closes under)
 *   10:21–11:10  fade zigzag 12.40 → 11.20, vol declining to ~15k
 *   11:11–11:14  weak bounce 11.20 → 11.50
 *   11:15–11:29  drift ~11.45
 */
function scriptedDay(): Candle[] {
  const bars: Candle[] = [];
  const push = (time: string, o: number, h: number, l: number, c: number, vol: number) => {
    bars.push({ t: et(time), o, h, l, c, vol });
  };
  const hhmm = (minutesFrom9: number) => {
    const h = Math.floor((540 + minutesFrom9) / 60);
    const m = (540 + minutesFrom9) % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  };

  let minute = 0;
  const seg = (
    count: number,
    priceAt: (i: number) => { o: number; h: number; l: number; c: number },
    volAt: (i: number) => number,
  ) => {
    for (let i = 0; i < count; i += 1) {
      const p = priceAt(i);
      push(hhmm(minute), p.o, p.h, p.l, p.c, volAt(i));
      minute += 1;
    }
  };

  // Premarket ramp 09:00–09:29
  seg(30, (i) => {
    const o = 9.5 + i * 0.0167;
    const c = o + 0.0167;
    return { o, h: c + 0.01, l: o - 0.01, c };
  }, () => 20_000);

  // Ignition 09:30–09:44
  seg(15, (i) => {
    const o = 10.0 + i * 0.167;
    const c = o + 0.167;
    return { o, h: c + 0.03, l: o - 0.02, c };
  }, (i) => 90_000 + i * 4_000);

  // Pullback 09:45–09:54
  seg(10, (i) => {
    const o = 12.5 - i * 0.065;
    const c = o - 0.065;
    return { o, h: o + 0.02, l: c - 0.03, c };
  }, () => 40_000);

  // Base 09:55–09:59 (distinct swing low at 09:56)
  push(hhmm(minute), 11.85, 11.87, 11.82, 11.84, 30_000); minute += 1; // 09:55
  push(hhmm(minute), 11.84, 11.85, 11.78, 11.8, 30_000); minute += 1;  // 09:56 pivot low
  push(hhmm(minute), 11.8, 11.84, 11.8, 11.82, 30_000); minute += 1;   // 09:57
  push(hhmm(minute), 11.82, 11.87, 11.83, 11.85, 30_000); minute += 1; // 09:58
  push(hhmm(minute), 11.85, 11.9, 11.86, 11.88, 32_000); minute += 1;  // 09:59

  // Continuation 10:00–10:09 → HOD 12.60
  seg(10, (i) => {
    const o = 11.9 + i * 0.07;
    const c = o + 0.07;
    return { o, h: c + 0.02, l: o - 0.02, c };
  }, () => 90_000);

  // Failed attempts + rollover 10:10–10:20
  push(hhmm(minute), 12.6, 12.62, 12.5, 12.55, 60_000); minute += 1;  // 10:10
  push(hhmm(minute), 12.55, 12.58, 12.48, 12.52, 50_000); minute += 1; // 10:11
  push(hhmm(minute), 12.52, 12.56, 12.46, 12.5, 45_000); minute += 1;  // 10:12
  push(hhmm(minute), 12.5, 12.54, 12.44, 12.48, 45_000); minute += 1;  // 10:13
  push(hhmm(minute), 12.48, 12.52, 12.42, 12.46, 42_000); minute += 1; // 10:14
  push(hhmm(minute), 12.46, 12.65, 12.44, 12.5, 55_000); minute += 1;  // 10:15 attempt (wick over 12.62)
  push(hhmm(minute), 12.5, 12.55, 12.4, 12.45, 40_000); minute += 1;   // 10:16 → failed #1
  push(hhmm(minute), 12.45, 12.5, 12.38, 12.42, 38_000); minute += 1;  // 10:17
  push(hhmm(minute), 12.42, 12.48, 12.36, 12.4, 36_000); minute += 1;  // 10:18
  push(hhmm(minute), 12.4, 12.7, 12.38, 12.4, 52_000); minute += 1;    // 10:19 attempt (wick over 12.65)
  push(hhmm(minute), 12.4, 12.45, 12.3, 12.35, 40_000); minute += 1;   // 10:20 → failed #2

  // Fade staircase 10:21–11:08 (down .08 ×4, up .10 ×2 → −0.12 per 6-bar
  // cycle, 12.35 → 11.39). Recoveries are deep enough that each cycle's top
  // and bottom confirm as strict k=3 pivots → lower highs / lower lows.
  let price = 12.35;
  seg(48, (i) => {
    const o = price;
    const down = i % 6 < 4;
    const c = down ? o - 0.08 : o + 0.1;
    price = c;
    return down
      ? { o, h: o + 0.002, l: c - 0.015, c }
      : { o, h: c + 0.015, l: o + 0.005, c };
  }, (i) => Math.max(8_000, 35_000 - i * 700));

  // Bounce 11:09–11:12 (11.39 → ~11.69)
  seg(4, (i) => {
    const o = 11.39 + i * 0.075;
    const c = o + 0.075;
    return { o, h: c + 0.015, l: o - 0.01, c };
  }, () => 16_000);

  // Drift 11:13–11:29
  seg(17, (i) => {
    const o = 11.69 - i * 0.012;
    const c = o - 0.012;
    return { o, h: o + 0.01, l: c - 0.01, c };
  }, () => 9_000);

  return bars;
}

function makeTrade(overrides: Partial<OpportunityTradeInput> & { id: number }): OpportunityTradeInput {
  return {
    symbol: "TEST",
    side: "long",
    entryAt: et("10:01:30"),
    exitAt: et("10:05:30"),
    entryPrice: 11.9,
    quantity: 100,
    pnl: 50,
    setup: null,
    ...overrides,
  };
}

const day = scriptedDay();
const anatomy = sessionAnatomy("TEST", DATE, day);

describe("sessionAnatomy", () => {
  it("tracks premarket high, running high, vwap, and atr causally", () => {
    const snap = anatomyAt(anatomy, et("10:30:00"));
    expect(snap).not.toBeNull();
    expect(snap!.premarketHigh).toBeCloseTo(10.0, 0);
    expect(snap!.runningHigh).toBeCloseTo(12.7, 2);
    expect(snap!.vwap).toBeGreaterThan(10.5);
    expect(snap!.atr).toBeGreaterThan(0);
  });

  it("counts failed HOD-break attempts", () => {
    const before = anatomyAt(anatomy, et("10:15:00"));
    const after = anatomyAt(anatomy, et("10:25:00"));
    expect(before!.failedAttempts).toBe(0);
    expect(after!.failedAttempts).toBe(2);
  });

  it("labels the fade as lower highs / lower lows", () => {
    const snap = anatomyAt(anatomy, et("11:05:00"));
    expect(snap!.structure).toBe("lh_ll");
  });

  it("reads declining volume during the fade", () => {
    const snap = anatomyAt(anatomy, et("11:00:00"));
    expect(snap!.volumeState).toBe("declining");
  });

  it("tracks the shared EMA stack and bearish cross causally", () => {
    const frontside = anatomyAt(anatomy, et("10:05:00"));
    const backside = anatomyAt(anatomy, et("11:05:00"));

    expect(frontside!.emaStack).toBe("bullish");
    expect(backside!.emaStack).toBe("bearish");
    expect(backside!.lastEmaCross).toBe("bearish");
    expect(backside!.barsSinceEmaCross).toBeGreaterThan(0);
    expect(backside!.priceVsEmaRail).toBe("below");
  });

  it("only uses bars fully closed before the requested moment", () => {
    const snap = anatomyAt(anatomy, et("09:00:30"));
    expect(snap).toBeNull();
  });
});

describe("opportunityContextForTrade classifications", () => {
  it("calls a continuation entry off the base still-valid", () => {
    const ctx = opportunityContextForTrade(anatomy, makeTrade({ id: 1 }));
    expect(ctx.classification).toBe("still-valid");
    expect(ctx.atEntry!.referenceLevel!.kind).toBe("swing-low");
    expect(ctx.atEntry!.extensionAtr).toBeLessThan(2);
  });

  it("calls a mid-ignition chase a late entry", () => {
    const ctx = opportunityContextForTrade(
      anatomy,
      makeTrade({ id: 2, entryAt: et("09:36:30"), entryPrice: 11.05, exitAt: et("09:40:00") }),
    );
    expect(ctx.classification).toBe("valid-stock-late-entry");
    expect(ctx.atEntry!.extensionAtr).toBeGreaterThanOrEqual(2);
    expect(ctx.atEntry!.premarketHighRelationship).toBe("above");
  });

  it("uses valid-setup-poor-execution when intent was recorded", () => {
    const ctx = opportunityContextForTrade(
      anatomy,
      makeTrade({ id: 3, entryAt: et("09:36:30"), entryPrice: 11.05, exitAt: et("09:40:00"), setup: "ignition dip" }),
    );
    expect(ctx.classification).toBe("valid-setup-poor-execution");
    expect(ctx.intent.source).toBe("user");
  });

  it("calls a fresh-high entry with expanding volume developing", () => {
    const ctx = opportunityContextForTrade(
      anatomy,
      makeTrade({ id: 4, entryAt: et("10:10:30"), entryPrice: 12.55, exitAt: et("10:12:00"), pnl: 20 }),
    );
    expect(ctx.classification).toBe("developing");
    expect(ctx.atEntry!.minutesSinceHigh).toBeLessThanOrEqual(5);
  });

  it("calls a stale declining-volume entry weakening", () => {
    const ctx = opportunityContextForTrade(
      anatomy,
      makeTrade({ id: 5, entryAt: et("11:00:30"), entryPrice: 11.42, exitAt: et("11:05:00") }),
    );
    expect(ctx.classification).toBe("weakening");
    expect(ctx.atEntry!.fylMarketRead.mode).toBe("downtrend");
    expect(ctx.atEntry!.fylMarketRead.headline).toBe("Sellers controlled the trend at entry.");
  });

  it("calls a late extended bounce entry move-mature", () => {
    const ctx = opportunityContextForTrade(
      anatomy,
      makeTrade({ id: 6, entryAt: et("11:15:30"), entryPrice: 11.5, exitAt: et("11:25:00") }),
    );
    expect(ctx.classification).toBe("move-mature");
    expect(ctx.atEntry!.minutesSinceHigh).toBeGreaterThanOrEqual(30);
    expect(ctx.plainLanguageConclusion).toContain("min past the high");
  });

  it("flags a good entry that round-tripped a big move", () => {
    const ctx = opportunityContextForTrade(
      anatomy,
      makeTrade({ id: 7, exitAt: et("11:25:00"), pnl: 0 }),
    );
    expect(ctx.classification).toBe("good-entry-poor-management");
    expect(ctx.postTrade!.captureRatio).toBeLessThan(0.01);
    expect(ctx.postTrade!.note).toContain("Hindsight");
  });
});

describe("opportunityContextForTrade degradation", () => {
  it("returns cannot-determine for short trades (long-only v1)", () => {
    const ctx = opportunityContextForTrade(anatomy, makeTrade({ id: 8, side: "short" }));
    expect(ctx.classification).toBe("cannot-determine");
    expect(ctx.missingContext.join(" ")).toContain("long-only");
  });

  it("returns cannot-determine without candles", () => {
    const ctx = opportunityContextForTrade(null, makeTrade({ id: 9 }));
    expect(ctx.classification).toBe("cannot-determine");
    expect(ctx.evidence).toBeNull();
  });

  it("returns cannot-determine for entries before any closed bar", () => {
    const ctx = opportunityContextForTrade(
      anatomy,
      makeTrade({ id: 10, entryAt: et("09:00:30"), entryPrice: 9.5 }),
    );
    expect(ctx.classification).toBe("cannot-determine");
  });
});

describe("adverse adds and confidence", () => {
  it("emits an at-entry snapshot per averaging-down add", () => {
    const ctx = opportunityContextForTrade(anatomy, makeTrade({ id: 11 }), {
      adverseAddTimes: [et("11:15:30")],
    });
    expect(ctx.adverseAddContexts).toHaveLength(1);
    expect(ctx.adverseAddContexts[0].minutesSinceHigh).toBeGreaterThanOrEqual(30);
  });

  it("scores confidence as the minimum of its components", () => {
    const ctx = opportunityContextForTrade(anatomy, makeTrade({ id: 12 }));
    const parts = ctx.confidence.components;
    expect(ctx.confidence.score).toBeCloseTo(
      Math.min(parts.coverage, parts.warmup, parts.thresholdMargin, parts.intent),
      6,
    );
    expect(["low", "medium", "high"]).toContain(ctx.confidence.label);
  });

  it("notes missing intent in missingContext", () => {
    const ctx = opportunityContextForTrade(anatomy, makeTrade({ id: 13 }));
    expect(ctx.missingContext.join(" ")).toContain("intent");
    expect(ctx.intent.source).toBe("missing");
  });

  it("attaches a candle-window evidence ref", () => {
    const ctx = opportunityContextForTrade(anatomy, makeTrade({ id: 14 }));
    expect(ctx.evidence!.candleWindow.symbol).toBe("TEST");
    expect(ctx.evidence!.candleWindow.from).toBe(et("09:00:00"));
  });
});
