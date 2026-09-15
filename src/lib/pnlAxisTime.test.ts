import { describe, expect, it } from "vitest";
import { formatPnlAxisTime, pnlTimeline } from "./pnlAxisTime";
const timestamp = (value: string) => Date.parse(value) / 1000;

describe("daily P&L clock axis", () => {
  it("labels only aligned hours and half hours in Eastern Time", () => {
    expect(formatPnlAxisTime(timestamp("2026-09-15T11:00:00Z"))).toBe("7:00");
    expect(formatPnlAxisTime(timestamp("2026-09-15T11:30:00Z"))).toBe("7:30");
    expect(formatPnlAxisTime(timestamp("2026-09-15T11:13:00Z"))).toBe("");
    expect(formatPnlAxisTime(timestamp("2026-01-15T15:00:00Z"))).toBe("10:00");
  });
  it("preserves exact P&L events while filling uniform elapsed-time slots", () => {
    const points = [{ time: 60, value: 0 }, { time: 1831, value: 7 }, { time: 3500, value: -2 }];
    const timeline = pnlTimeline(points);
    expect(timeline.filter((point) => point.value !== undefined)).toEqual(points);
    expect(timeline[0].time).toBe(0);
    expect(timeline.at(-1)?.time).toBe(3600);
    expect(timeline.every((point, index) => point.time === index)).toBe(true);
  });
  it("uses a coarser exact interval when possible and handles empty/single events", () => {
    expect(pnlTimeline([])).toEqual([]);
    expect(pnlTimeline([{ time: 1800, value: 0 }])).toEqual([{ time: 1800, value: 0 }, { time: 3600 }]);
    expect(pnlTimeline([{ time: 600, value: 0 }, { time: 1200, value: 1 }])).toEqual([{ time: 0 }, { time: 600, value: 0 }, { time: 1200, value: 1 }, { time: 1800 }]);
  });
});
