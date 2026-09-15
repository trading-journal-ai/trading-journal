import { describe, expect, it } from "vitest";
import { formatPnlPriceTick, pnlPriceStep, pnlPriceTicks } from "./pnlPriceScale";

describe("daily P&L price scale", () => {
  it("chooses simple steps across different dollar ranges", () => {
    expect(pnlPriceStep([0, 19], 360)).toBe(5);
    expect(pnlPriceStep([0, 190], 360)).toBe(50);
    expect(pnlPriceStep([0, 1900], 360)).toBe(500);
  });
  it("includes losses and intraday peaks, not only the final P&L", () => {
    expect(pnlPriceStep([-200, 800, 20], 360)).toBe(500);
    expect(pnlPriceStep([-20, -10], 360)).toBe(5);
    expect(pnlPriceStep([0, 19], 180)).toBe(10);
  });
  it("generates only the intended grid levels", () => {
    expect(pnlPriceTicks([0, 19], 360)).toEqual([0, 5, 10, 15, 20]);
    expect(pnlPriceTicks([0, 19], 320)).toEqual([0, 5, 10, 15, 20]);
    expect(pnlPriceTicks([0, 190], 360)).toEqual([0, 50, 100, 150, 200]);
    expect(pnlPriceTicks([-19, 0], 360)).toEqual([-20, -15, -10, -5, 0]);
    expect(pnlPriceTicks([-4, 14], 360)).toEqual([-5, 0, 5, 10, 15]);
    expect(pnlPriceTicks([0, 0.19], 360)).toEqual([0, 0.05, 0.1, 0.15, 0.2]);
    expect(pnlPriceTicks([NaN, Infinity], 360)).toEqual([0, 1]);
  });
  it("handles flat and very small days without unnecessary decimals", () => {
    expect(pnlPriceStep([0, 0], 360)).toBe(1);
    expect(pnlPriceStep([0, 0.19], 360)).toBe(0.05);
    expect(formatPnlPriceTick(5, 5)).toBe("$5");
    expect(formatPnlPriceTick(-500, 500)).toBe("−$500");
    expect(formatPnlPriceTick(0.05, 0.05)).toBe("$0.05");
    expect(formatPnlPriceTick(-0.000001, 5)).toBe("$0");
  });
});
