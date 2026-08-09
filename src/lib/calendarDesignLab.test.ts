import { describe, expect, it } from "vitest";

import {
  calendarCandidateErrors,
  parsePaletteInput,
  safeCalendarSelection,
  validCalendarCandidates,
} from "@/lib/calendarDesignLab";

describe("Calendar Design Lab palette", () => {
  it("parses, normalizes, deduplicates, and caps pasted hex colors", () => {
    expect(parsePaletteInput("0F172A, #1e293b 2563EB #1e293b nope ffffff 111 222 333 444 555")).toEqual([
      "#0f172a",
      "#1e293b",
      "#2563eb",
      "#ffffff",
      "#111",
      "#222",
      "#333",
      "#444",
    ]);
  });

  it("validates candidate role values independently", () => {
    const drafts = { cardBg: "#ffffff", hoverBg: "not-a-color" } as const;
    expect(calendarCandidateErrors(drafts)).toEqual({ hoverBg: "Enter a valid CSS color." });
    expect(validCalendarCandidates(drafts)).toEqual({ cardBg: "#ffffff" });
  });

  it("allows selection only from the server-provided calendar dates", () => {
    expect(safeCalendarSelection("2026-08-05", ["2026-08-04", "2026-08-05"], "2026-08-04")).toBe("2026-08-05");
    expect(safeCalendarSelection("2027-01-01", ["2026-08-04", "2026-08-05"], "2026-08-04")).toBe("2026-08-04");
  });
});
