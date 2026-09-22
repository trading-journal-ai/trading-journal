import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  events: [] as string[],
  saveError: null as Error | null,
  generationResult: { ok: true } as { ok: true } | { ok: false; coachError: string },
  generate: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  and: (...values: unknown[]) => values,
  eq: (...values: unknown[]) => values,
  gte: (...values: unknown[]) => values,
  lte: (...values: unknown[]) => values,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/accountScope", () => ({ getActiveAccount: async () => ({ id: 41 }) }));
vi.mock("@/lib/demoMode", () => ({ isDemoReadOnly: () => false }));
vi.mock("@/lib/coach/reviewRefresh", () => ({ isCoachRefreshIntent: (value: unknown) => value === "refreshCoach" }));
vi.mock("@/lib/coach/reviewService", () => ({
  validCoachScopeKey: (_scope: string, key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key),
  generateAndStoreCoachReview: mocks.generate,
}));
vi.mock("@/lib/db", () => {
  const columns = new Proxy({}, { get: (_target, property) => property });
  return {
    schema: new Proxy({}, { get: () => columns }),
    db: {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => ({
        values: async () => {
          mocks.events.push("save");
          if (mocks.saveError) throw mocks.saveError;
        },
      }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
      delete: () => ({ where: async () => undefined }),
    },
  };
});

import { upsertScopedNoteAction } from "./actions";

function noteForm(intent?: string) {
  const form = new FormData();
  form.set("scope", "day");
  form.set("scopeKey", "2026-06-10");
  form.set("body", "Synthetic reflection");
  if (intent) form.set("intent", intent);
  return form;
}

describe("upsertScopedNoteAction", () => {
  beforeEach(() => {
    mocks.events.length = 0;
    mocks.saveError = null;
    mocks.generationResult = { ok: true };
    mocks.generate.mockReset().mockImplementation(async () => {
      mocks.events.push("generate");
      return mocks.generationResult;
    });
  });

  it("plain save persists without generating", async () => {
    await expect(upsertScopedNoteAction(null, noteForm())).resolves.toEqual({ ok: true });
    expect(mocks.events).toEqual(["save"]);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("persists before an explicit coach refresh", async () => {
    await expect(upsertScopedNoteAction(null, noteForm("refreshCoach"))).resolves.toEqual({ ok: true, coachRefreshed: true });
    expect(mocks.events).toEqual(["save", "generate"]);
    expect(mocks.generate).toHaveBeenCalledWith(41, "day", "2026-06-10");
  });

  it("reports coach failure while retaining successful note-save state", async () => {
    mocks.generationResult = { ok: false, coachError: "Provider unavailable" };
    await expect(upsertScopedNoteAction(null, noteForm("refreshCoach"))).resolves.toEqual({ ok: true, coachError: "Provider unavailable" });
    expect(mocks.events).toEqual(["save", "generate"]);
  });

  it("does not generate when note persistence fails", async () => {
    mocks.saveError = new Error("disk unavailable");
    await expect(upsertScopedNoteAction(null, noteForm("refreshCoach"))).resolves.toEqual({ ok: false, error: "Could not save this reflection." });
    expect(mocks.events).toEqual(["save"]);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
