import { expect, it } from "vitest";
import { originCrumbFromHref } from "./Breadcrumbs";

it("returns a trade drill-down to the guided day before its parent week", () => {
  const href = "/journal?date=2026-06-10&view=coach&returnTo=%2Fjournal%3Fdate%3D2026-06-10%26scope%3Dweek#day-reflection";
  expect(originCrumbFromHref(href)).toEqual({ label: "Journal", href });
});

it("preserves the existing origin behavior for ordinary nested review links", () => {
  expect(originCrumbFromHref("/trades/review?returnTo=%2Fcalendar%3Fm%3D2026-06")).toEqual({ label: "Calendar", href: "/calendar?m=2026-06" });
  expect(originCrumbFromHref("https://example.com")).toEqual({ label: "Trades", href: "/trades" });
});
