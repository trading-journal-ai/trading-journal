import { describe, expect, it } from "vitest";
import type { SchwabImportSummary } from "./types";
import { schwabTodayImportPresentation } from "./todayImportPresentation";

function summary(overrides: Partial<SchwabImportSummary> = {}): SchwabImportSummary {
  return {
    batchId: null,
    accountLabel: "Individual ••••1234",
    journalAccountLabel: "Schwab",
    from: "2026-08-13",
    to: "2026-08-13",
    parsed: 0,
    inserted: 0,
    duplicates: 0,
    reviewExecutions: 0,
    reviewSymbols: [],
    reviewDates: [],
    tradesCreated: 0,
    tradesUpdated: 0,
    insertedFrom: null,
    insertedTo: null,
    insertedDates: [],
    duplicateDates: [],
    warnings: [],
    ...overrides,
  };
}

describe("schwabTodayImportPresentation", () => {
  it("presents a completed import and refreshes the Journal", () => {
    const presentation = schwabTodayImportPresentation({
      ok: true,
      summary: summary({ inserted: 3, parsed: 3, tradesCreated: 2 }),
    });

    expect(presentation.kind).toBe("imported");
    expect(presentation.title).toBe("3 executions imported");
    expect(presentation.refreshJournal).toBe(true);
  });

  it("distinguishes an empty Schwab day from an import failure", () => {
    const presentation = schwabTodayImportPresentation({ ok: true, summary: summary() });

    expect(presentation.kind).toBe("no_trades");
    expect(presentation.title).toBe("No Schwab trades found today");
    expect(presentation.refreshJournal).toBe(false);
  });

  it("explains when fills already exist under a Journal account", () => {
    const presentation = schwabTodayImportPresentation({
      ok: true,
      summary: summary({ parsed: 2, duplicates: 2 }),
    });

    expect(presentation.kind).toBe("already_imported");
    expect(presentation.detail).toContain("Schwab");
    expect(presentation.detail).toContain("active Journal account");
  });

  it("keeps ambiguous history out of the automatic import", () => {
    const presentation = schwabTodayImportPresentation({
      ok: true,
      summary: summary({ parsed: 1, reviewExecutions: 1 }),
    });

    expect(presentation.kind).toBe("needs_review");
    expect(presentation.detail).toContain("left it unchanged");
  });

  it("preserves the reauthorization recovery state", () => {
    const presentation = schwabTodayImportPresentation({
      ok: false,
      kind: "reauth_required",
      error: "Schwab authorization expired. Authorize Schwab again, then retry the import.",
    });

    expect(presentation.kind).toBe("reauth_required");
    expect(presentation.detail).toContain("Authorize Schwab again");
    expect(presentation.detail).not.toContain("npm run");
  });
});
