import { describe, expect, it } from "vitest";
import { buildSessionFactPack, type ReviewTradeInput } from "./reviewEngine";

const baseTime = Math.floor(Date.UTC(2026, 5, 8, 14, 0, 0) / 1000);

function trade(overrides: Partial<ReviewTradeInput> & { id: number | string; symbol?: string; pnl: number }): ReviewTradeInput {
  const avgEntryPrice = overrides.avgEntryPrice ?? 10;
  const quantity = overrides.quantity ?? 100;
  const grossPerShare = overrides.side === "short" ? -overrides.pnl / quantity : overrides.pnl / quantity;

  return {
    id: overrides.id,
    symbol: overrides.symbol ?? "TEST",
    side: overrides.side ?? "long",
    quantity,
    avgEntryPrice,
    avgExitPrice: avgEntryPrice + grossPerShare,
    fees: overrides.fees ?? 0,
    entryAt: overrides.entryAt ?? baseTime,
    exitAt: overrides.exitAt ?? baseTime + 300,
    stopLoss: overrides.stopLoss,
    setup: overrides.setup,
  };
}

describe("buildSessionFactPack", () => {
  it("detects a low-accuracy green day carried by payoff", () => {
    const factPack = buildSessionFactPack([
      trade({ id: 1, pnl: 500 }),
      trade({ id: 2, pnl: -100 }),
      trade({ id: 3, pnl: -100 }),
    ]);

    expect(factPack.session.netPnl).toBeCloseTo(300, 2);
    expect(factPack.session.winRate).toBeCloseTo(1 / 3, 4);
    expect(factPack.session.breakevenWinRate).toBeCloseTo(1 / 6, 4);
    expect(factPack.surprises[0]?.key).toBe("low-win-rate-green");
  });

  it("classifies a green session that flips when the best and worst trades are trimmed", () => {
    const factPack = buildSessionFactPack([
      trade({ id: 1, pnl: 1000 }),
      trade({ id: 2, pnl: -100 }),
      trade({ id: 3, pnl: -100 }),
      trade({ id: 4, pnl: -100 }),
      trade({ id: 5, pnl: -100 }),
    ]);

    expect(factPack.session.netPnl).toBeCloseTo(600, 2);
    expect(factPack.robustness.distributionLabel).toBe("outlier-carried green");
    expect(factPack.mechanism.key).toBe("tail-concentration");
  });

  it("matches ticker concentration when removing one ticker changes the session sign", () => {
    const factPack = buildSessionFactPack([
      trade({ id: 1, symbol: "AAA", pnl: 700 }),
      trade({ id: 2, symbol: "BBB", pnl: -200 }),
      trade({ id: 3, symbol: "CCC", pnl: -200 }),
      trade({ id: 4, symbol: "DDD", pnl: -100 }),
    ]);

    expect(factPack.session.netPnl).toBeCloseTo(200, 2);
    expect(factPack.mechanism.key).toBe("ticker-concentration");
    expect(factPack.surprises[0]?.key).toBe("ticker-flips-sign");
    expect(factPack.surprises[0]?.evidence[0]).toContain("AAA");
  });

  it("reports R-multiple confidence when planned stops cover the sample", () => {
    const factPack = buildSessionFactPack([
      trade({ id: 1, pnl: 100, stopLoss: 9.5 }),
      trade({ id: 2, pnl: -50, stopLoss: 9.5 }),
      trade({ id: 3, pnl: 150, stopLoss: 9.5 }),
      trade({ id: 4, pnl: -50, stopLoss: 9.5 }),
      trade({ id: 5, pnl: 100, stopLoss: 9.5 }),
      trade({ id: 6, pnl: 100, stopLoss: 9.5 }),
      trade({ id: 7, pnl: -50, stopLoss: 9.5 }),
      trade({ id: 8, pnl: 100, stopLoss: 9.5 }),
      trade({ id: 9, pnl: 100, stopLoss: 9.5 }),
      trade({ id: 10, pnl: -50, stopLoss: 9.5 }),
    ]);

    expect(factPack.session.rCoverage).toBe(1);
    expect(factPack.session.totalR).toBeCloseTo(9, 4);
    expect(factPack.confidence.riskModel).toBe("r-multiple");
    expect(factPack.confidence.label).toBe("medium");
  });
});
