import { describe, expect, it } from "vitest";
import { evaluatePriceActionRead, type PriceActionCandle } from "./priceActionRead";

function directionalBars(count: number, start = 10, step = 0.1, volume = 100): PriceActionCandle[] {
  return Array.from({ length: count }, (_, index) => {
    const open = start + index * step;
    const close = open + step * 0.8;
    return {
      t: index * 60,
      o: open,
      h: Math.max(open, close) + 0.01,
      l: Math.min(open, close) - 0.01,
      c: close,
      vol: volume,
    };
  });
}

describe("evaluatePriceActionRead", () => {
  it("withholds a read until the causal window has enough bars", () => {
    expect(evaluatePriceActionRead(directionalBars(7), { atr: 0.1, structure: "hh_hl" })).toBeNull();
  });

  it("identifies clean directional expansion with increasing volume", () => {
    const prior = directionalBars(12, 10, 0.02, 100);
    const expansion = directionalBars(12, 10.3, 0.15, 200).map((bar, index) => ({
      ...bar,
      t: (index + 12) * 60,
    }));
    const read = evaluatePriceActionRead([...prior, ...expansion], { atr: 0.2, structure: "hh_hl" });

    expect(read!.quality).toBe("clean_expansion");
    expect(read!.phase).toBe("ignition");
    expect(read!.participation).toBe("expanding");
  });

  it("keeps orderly lower-energy progress separate from expansion", () => {
    const bars = directionalBars(24, 10, 0.02, 100);
    const read = evaluatePriceActionRead(bars, { atr: 0.2, structure: "hh_hl" });

    expect(read!.quality).toBe("tight_grind");
    expect(read!.phase).toBe("continuation_reclaim");
  });

  it("identifies tightening range and volume as consolidation", () => {
    const prior = directionalBars(12, 10, 0.2, 200);
    const tight = Array.from({ length: 12 }, (_, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      const open = 12.4 + direction * 0.015;
      const close = 12.4 - direction * 0.015;
      return {
        t: (index + 12) * 60,
        o: open,
        h: Math.max(open, close) + 0.005,
        l: Math.min(open, close) - 0.005,
        c: close,
        vol: 50,
      };
    });
    const read = evaluatePriceActionRead([...prior, ...tight], { atr: 0.2, structure: "compression" });

    expect(read!.isConsolidating).toBe(true);
    expect(read!.phase).toBe("pullback_consolidation");
    expect(read!.participation).toBe("contracting");
    expect(read!.headline).toContain("tightening");
  });

  it("identifies heavy volume without progress as exhaustion", () => {
    const prior = directionalBars(12, 10, 0.05, 100);
    const churn = Array.from({ length: 12 }, (_, index) => {
      const high = index % 2 === 0 ? 10.72 : 10.68;
      return {
        t: (index + 12) * 60,
        o: 10.65,
        h: high,
        l: 10.58,
        c: index % 2 === 0 ? 10.66 : 10.64,
        vol: 200,
      };
    });
    const read = evaluatePriceActionRead([...prior, ...churn], { atr: 0.15, structure: "transitioning" });

    expect(read!.participation).toBe("climax_without_progress");
    expect(read!.phase).toBe("exhaustion_failure");
    expect(read!.headline).toContain("stopped making progress");
  });
});
