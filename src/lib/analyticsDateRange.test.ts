import { expect, it } from "vitest";
import { analyticsDateRangeHref } from "./analyticsDateRange";
it("keeps analytics filters and sizing choices while replacing date scope and stale drilldown", () => {
  const href = analyticsDateRangeHref("/analytics?date=2026-09-01&preset=today&view=sizing&basis=gross&price=under5&a=100&b=500&symbol=TEST&tag=setup&side=long&drill=all&page=2", "2026-09-10", "2026-09-16");
  const params = new URL(href, "http://localhost").searchParams;
  expect(Object.fromEntries(params)).toEqual({preset:"custom",view:"sizing",basis:"gross",price:"under5",a:"100",b:"500",symbol:"TEST",tag:"setup",side:"long",from:"2026-09-10",to:"2026-09-16"});
});
