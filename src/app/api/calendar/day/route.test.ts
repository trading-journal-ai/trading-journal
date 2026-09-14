import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ account: vi.fn(), load: vi.fn() }));
vi.mock("@/lib/accountScope", () => ({ getActiveAccount: mocks.account }));
vi.mock("@/lib/calendarDayTrades", () => ({ loadCalendarDayTrades: mocks.load }));
import { GET } from "./route";
const request = (query: string) => GET(new Request(`http://localhost/api/calendar/day?${query}`));
beforeEach(() => { vi.resetAllMocks(); mocks.account.mockResolvedValue({ id: 1 }); mocks.load.mockResolvedValue([]); });
describe("calendar day API", () => {
  it("rejects impossible dates before consulting account or data", async () => {
    expect((await request("date=2026-02-30&account=1")).status).toBe(400);
    expect(mocks.account).not.toHaveBeenCalled();
  });
  it("does not let a query parameter select another account", async () => {
    const response = await request("date=2026-07-01&account=2");
    expect(response.status).toBe(409);
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("loads only the cookie-selected account and disables response caching", async () => {
    const response = await request("date=2026-07-01&account=1");
    expect(response.status).toBe(200);
    expect(mocks.load).toHaveBeenCalledWith(1, "2026-07-01");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ accountId: 1, date: "2026-07-01", rows: [] });
  });
  it("does not expose database error details", async () => {
    mocks.load.mockRejectedValue(new Error("private database path"));
    const response = await request("date=2026-07-01&account=1");
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database path");
  });
});
