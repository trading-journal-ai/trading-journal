import { describe, expect, it } from "vitest";
import { parseChartCsv, MAX_CHART_CSV_BYTES } from "./chartCsv";
import { temporaryChartKey } from "./temporaryChartStorage";

const header = "time,open,high,low,close,Volume,EMA";
const row = (time: string | number, rest = "10,12,9,11,100,NaN") => `${time},${rest}`;
const csv = (...rows: string[]) => [header, ...rows].join("\n");
const parse = (contents: string, date = "2026-09-14") => parseChartCsv(contents, "TEST", date);
const first = Date.parse("2026-09-14T13:30:00Z") / 1000;

describe("temporary TradingView chart CSV", () => {
  it("accepts BOM, quoted headers, extra indicators and reversed bars", () => {
    const contents = '\uFEFF"time","open","high","low","close","Volume","EMA"\r\n'
      + [row(first + 60), row(first)].join("\r\n");
    expect(parse(contents)).toEqual([
      { t: first, o: 10, h: 12, l: 9, c: 11, vol: 100 },
      { t: first + 60, o: 10, h: 12, l: 9, c: 11, vol: 100 },
    ]);
  });
  it("accepts milliseconds and timezone-inclusive ISO timestamps", () => {
    expect(parse(csv(row(first * 1000), row("2026-09-14T09:31:00-04:00")))).toHaveLength(2);
  });
  it("filters by Eastern date across UTC midnight and DST", () => {
    const contents = csv(row("2026-01-06T00:58:00Z"), row("2026-01-06T00:59:00Z"), row("2026-01-06T14:30:00Z"));
    expect(parse(contents, "2026-01-05")).toHaveLength(2);
  });
  it("rejects ambiguous local timestamps and sub-minute bars", () => {
    expect(() => parse(csv(row("2026-09-14T09:30:00")))).toThrow("timezone offset");
    expect(() => parse(csv(row(first + 5)))).toThrow("one-minute");
  });
  it("rejects the wrong date and five-minute exports", () => {
    expect(() => parse(csv(row(first), row(first + 60)), "2026-09-15")).toThrow("No bars match");
    expect(() => parse(csv(row(first), row(first + 300)))).toThrow("1-minute interval");
  });
  it.each(["", "NaN", "Infinity", "-1"])("rejects invalid volume %s", (volume) => {
    expect(() => parse(csv(row(first, `10,12,9,11,${volume},NaN`), row(first + 60)))).toThrow("Invalid price or volume");
  });
  it("rejects invalid OHLC and missing or duplicate required columns", () => {
    expect(() => parse(csv(row(first, "10,8,9,11,100,0")))).toThrow("Invalid price");
    expect(() => parse("Exec Time,Price,Qty\n09:30,10,100")).toThrow("TradingView chart CSV");
    expect(() => parse(`${header},Volume\n${row(first)},100`)).toThrow("TradingView chart CSV");
  });
  it("dedupes identical bars but rejects conflicting duplicate minutes", () => {
    expect(parse(csv(row(first), row(first), row(first + 60)))).toHaveLength(2);
    expect(() => parse(csv(row(first), row(first, "10,12,9,11,200,0"), row(first + 60)))).toThrow("conflicting");
  });
  it("checks an explicit ticker column when available", () => {
    expect(() => parse(`${header},symbol\n${row(first)},NASDAQ:OTHER`)).toThrow("different ticker");
    expect(parse(`${header},symbol\n${row(first)},NASDAQ:TEST\n${row(first + 60)},NASDAQ:TEST`)).toHaveLength(2);
  });
  it("bounds file size", () => {
    expect(() => parse("x".repeat(MAX_CHART_CSV_BYTES + 1))).toThrow("smaller than 5 MB");
  });
  it("keeps temporary data separate by account, ticker and date", () => {
    const keys = [temporaryChartKey(1, "TEST", "2026-09-14"), temporaryChartKey(2, "TEST", "2026-09-14"),
      temporaryChartKey(1, "OTHER", "2026-09-14"), temporaryChartKey(1, "TEST", "2026-09-15")];
    expect(new Set(keys).size).toBe(4);
  });
});
