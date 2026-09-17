import { describe, expect, it } from "vitest";
import { archiveDateHref, archiveDayTabDate, archivePeriodRange, archiveRangeHref, latestPublishedArchiveDate, shiftArchiveRange, validArchiveDate, validArchiveRange, validArchiveReturnTo } from "./momentumArchiveDates";
import { etDateString } from "./time";

describe("latest published Archive day", () => {
  it("uses the newer published candidate date ahead of the historical snapshot", () => {
    expect(latestPublishedArchiveDate("2026-09-16", ["2026-08-21", "2026-09-15"])).toBe("2026-09-15");
  });
  it("follows publication across weekends, holidays and delayed collection", () => {
    expect(latestPublishedArchiveDate("2026-09-08", ["2026-09-04", null])).toBe("2026-09-04");
    expect(latestPublishedArchiveDate("2026-09-16", ["2026-09-11", "2026-09-14"])).toBe("2026-09-14");
  });
  it("allows today once published and ignores invalid or future metadata", () => {
    expect(latestPublishedArchiveDate("2026-09-16", ["2026-09-15", "2026-09-16"])).toBe("2026-09-16");
    expect(latestPublishedArchiveDate("2026-09-16", ["2026-09-15", "2026-09-17", "2026-02-30"])).toBe("2026-09-15");
    expect(latestPublishedArchiveDate("2026-09-16", [null, undefined, "invalid"])).toBeUndefined();
  });
  it("keeps historical anchors but makes the Day tab avoid unpublished dates", () => {
    expect(archiveDayTabDate("2026-09-16", "2026-09-15")).toBe("2026-09-15");
    expect(archiveDayTabDate("2026-08-12", "2026-09-15")).toBe("2026-08-12");
    expect(archiveDayTabDate(undefined, "2026-09-15")).toBe("2026-09-15");
  });
});

describe("Archive return navigation", () => {
  it("restores the exact period, range, filters, pagination and expansion", () => {
    const previous = "/analytics/momentum-archive?view=range&date=2026-08-12&from=2026-08-12&to=2026-09-14&session=regular&sort=volume&direction=asc&q=SIM&size=50&page=2&all=1&more=1";
    expect(validArchiveReturnTo(previous)).toBe(previous);
    expect(validArchiveReturnTo("/analytics/momentum-archive")).toBe("/analytics/momentum-archive");
  });
  it("rejects external destinations, unrelated pages and archive return loops", () => {
    for (const value of [undefined, "https://example.com", "//example.com", "javascript:alert(1)", "/analytics/momentum-archive/other", "/journal", "/analytics/momentum-archive?view=archive"]) {
      expect(validArchiveReturnTo(value)).toBeUndefined();
    }
  });
  it("removes nested return destinations", () => {
    expect(validArchiveReturnTo("/analytics/momentum-archive?view=month&returnTo=%2Fjournal")).toBe("/analytics/momentum-archive?view=month");
  });
});

describe("Archive period boundaries", () => {
  it("uses the market's date around midnight and daylight saving", () => {
    expect(etDateString(Date.parse("2026-09-17T02:00:00Z") / 1000)).toBe("2026-09-16");
    expect(etDateString(Date.parse("2026-03-09T03:30:00Z") / 1000)).toBe("2026-03-08");
  });
  it("includes the full calendar month, including leap years", () => {
    expect(archivePeriodRange("month", "2026-08-12")).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    expect(archivePeriodRange("month", "2028-02-15")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
  it("matches Journal's Monday–Friday week across months, years, and weekends", () => {
    expect(archivePeriodRange("week", "2026-09-16")).toEqual({ from: "2026-09-14", to: "2026-09-18" });
    expect(archivePeriodRange("week", "2027-01-02")).toEqual({ from: "2026-12-28", to: "2027-01-01" });
    expect(archivePeriodRange("day", "2026-09-16")).toEqual({ from: "2026-09-16", to: "2026-09-16" });
  });
  it("rejects malformed and impossible dates before formatting or querying", () => {
    for (const invalid of [undefined, "", "2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "garbage"]) {
      expect(validArchiveDate(invalid)).toBeUndefined();
    }
    expect(validArchiveDate("2028-02-29")).toBe("2028-02-29");
  });
});

describe("Archive custom ranges", () => {
  it("requires two real dates in order, allowing a single-day range", () => {
    expect(validArchiveRange("2026-09-16", "2026-09-15")).toBeNull();
    expect(validArchiveRange("2026-02-30", "2026-03-01")).toBeNull();
    expect(validArchiveRange(undefined, "2026-09-16")).toBeNull();
    expect(validArchiveRange("2026-09-16", "2026-09-16")).toEqual({ from: "2026-09-16", to: "2026-09-16" });
  });
  it("preserves filters and serializes both endpoints while resetting the page", () => {
    const href = archiveRangeHref("/analytics/momentum-archive?view=week&session=regular&sort=volume&page=3&all=1", "2026-08-12", "2026-09-14");
    expect(Object.fromEntries(new URL(href, "http://localhost").searchParams)).toEqual({
      view: "range", session: "regular", sort: "volume", date: "2026-08-12", from: "2026-08-12", to: "2026-09-14",
    });
    const today = new URL(archiveDateHref(href, "2026-09-16", "day"), "http://localhost");
    expect(today.searchParams.has("from")).toBe(false);
    expect(today.searchParams.has("to")).toBe(false);
    expect(today.searchParams.has("view")).toBe(false);
  });
  it("steps by the inclusive range length across months, leap days, and DST", () => {
    expect(shiftArchiveRange({ from: "2026-09-14", to: "2026-09-16" }, -1)).toEqual({ from: "2026-09-11", to: "2026-09-13" });
    expect(shiftArchiveRange({ from: "2028-02-28", to: "2028-02-29" }, 1)).toEqual({ from: "2028-03-01", to: "2028-03-02" });
    expect(shiftArchiveRange({ from: "2026-03-07", to: "2026-03-09" }, 1)).toEqual({ from: "2026-03-10", to: "2026-03-12" });
  });
});

describe("Archive date navigation", () => {
  const current = "/analytics/momentum-archive?view=month&date=2026-09-16&session=afterHours&sort=volume&direction=asc&q=SIM&minGain=80&size=50&page=3&from=2026-09-01&to=2026-09-30&all=1&more=1";
  it("keeps the period and filters but clears stale bounds, pagination and expansion", () => {
    const href = archiveDateHref(current, "2026-08-12");
    const params = new URL(href, "http://localhost").searchParams;
    expect(Object.fromEntries(params)).toEqual({ view: "month", date: "2026-08-12", session: "afterHours", sort: "volume", direction: "asc", q: "SIM", minGain: "80", size: "50" });
    expect(archivePeriodRange("month", params.get("date")!)).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });
  it("returns Today to Day view without losing the session filter", () => {
    const params = new URL(archiveDateHref(current, "2026-09-16", "day"), "http://localhost").searchParams;
    expect(params.has("view")).toBe(false);
    expect(params.get("date")).toBe("2026-09-16");
    expect(params.get("session")).toBe("afterHours");
  });
});
