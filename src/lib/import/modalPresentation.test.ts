import { describe, expect, it } from "vitest";
import { importModalPresentation } from "./modalPresentation";
import type { SchwabImportSummary } from "@/lib/schwab/types";

const summary: SchwabImportSummary = {
  batchId: null, accountLabel: "Synthetic", journalAccountLabel: "Fixture",
  from: "2026-09-15", to: "2026-09-15", parsed: 2, inserted: 2, duplicates: 0,
  feesUpdated: 0, reviewExecutions: 0, reviewSymbols: [], reviewDates: [],
  tradesCreated: 1, tradesUpdated: 0, insertedFrom: "2026-09-15", insertedTo: "2026-09-15",
  insertedDates: [], duplicateDates: [], warnings: [],
};

describe("import result states", () => {
  it("distinguishes no trades, duplicate-only and fee-only results", () => {
    expect(importModalPresentation(summary).title).toBe("Import complete");
    expect(importModalPresentation({ ...summary, inserted: 0, parsed: 0 }).title).toBe("No trades found");
    expect(importModalPresentation({ ...summary, inserted: 0, duplicates: 2 }).title).toBe("Already up to date");
    expect(importModalPresentation({ ...summary, inserted: 0, feesUpdated: 1 }).title).toBe("Fees updated");
  });
  it("never hides partial success or unknown warnings behind a success title", () => {
    const warning = "One unmatched fill was skipped.";
    const result = importModalPresentation({ ...summary, reviewExecutions: 1, warnings: [warning, "Unexpected coverage limitation.", "Fill-preserving sync: no records were deleted."] });
    expect(result.title).toBe("Import needs attention");
    expect(result.notices).toEqual([warning, "Unexpected coverage limitation."]);
  });
  it("keeps CSV reconciliation warnings visible", () => {
    expect(importModalPresentation({ batchId: null, source: "tos_csv", sourceConfidence: "high", parsed: 3, inserted: 2, duplicates: 0, feesUpdated: 0, trades: 1, normalizedTrades: 1, openTrades: 0, parsedFrom: null, parsedTo: null, insertedFrom: null, insertedTo: null, warnings: ["1 fill was held for review."] }).title).toBe("Import needs attention");
  });
});
