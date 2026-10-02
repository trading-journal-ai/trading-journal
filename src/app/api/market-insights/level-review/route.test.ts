import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  get: vi.fn(async () => ({ revision: 0 })), submit: vi.fn(async () => ({ revision: 1 })), demo: vi.fn(() => false),
  Error: class extends Error { constructor(message: string, public readonly status: number) { super(message); } },
}));
vi.mock("@/lib/demoMode", () => ({ isDemoReadOnly: mocks.demo }));
vi.mock("@/lib/marketLevelReviewStore", () => ({ getLevelReview: mocks.get, submitLevelReview: mocks.submit, LevelReviewError: mocks.Error }));
import { GET, POST } from "./route";
afterEach(() => { vi.clearAllMocks(); mocks.demo.mockReturnValue(false); });
const url = "http://localhost:3031/api/market-insights/level-review";
const request = (origin?: string, body = "{}", host?: string) => new Request(url, { method: "POST", headers: { ...(origin ? { origin } : {}), ...(host ? { host } : {}), "Content-Type": "application/json" }, body });

describe("level review API boundaries", () => {
  it("rejects cross-origin/missing-origin writes before storage access", async () => {
    expect((await POST(request())).status).toBe(403);
    expect((await POST(request("https://elsewhere.example"))).status).toBe(403);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("uses browser host for local previews and blocks demo writes", async () => {
    expect((await POST(request("http://127.0.0.1:3031", "{}", "127.0.0.1:3031"))).status).toBe(200);
    mocks.submit.mockClear(); mocks.demo.mockReturnValue(true);
    expect((await POST(request("http://localhost:3031"))).status).toBe(403);
    expect(mocks.submit).not.toHaveBeenCalled();
    expect((await GET(new Request(`${url}?dayId=TEST`))).status).toBe(200);
  });
  it("maps invalid JSON and conflicts, and never caches responses", async () => {
    expect((await POST(request("http://localhost:3031", "invalid"))).status).toBe(400);
    mocks.submit.mockRejectedValueOnce(new mocks.Error("Newer review exists.", 409));
    const conflict = await POST(request("http://localhost:3031"));
    expect(conflict.status).toBe(409); expect(conflict.headers.get("cache-control")).toBe("no-store");
    const read = await GET(new Request(`${url}?dayId=TEST`));
    expect(mocks.get).toHaveBeenCalledWith("TEST"); expect(read.headers.get("cache-control")).toBe("no-store");
  });
  it("does not leak unexpected filesystem errors", async () => {
    mocks.get.mockRejectedValueOnce(new Error("private filesystem path"));
    const response = await GET(new Request(`${url}?dayId=TEST`));
    expect(response.status).toBe(500); expect(JSON.stringify(await response.json())).not.toContain("private filesystem");
  });
});
