import { describe, expect, it, vi } from "vitest";
import { validateSchwabDateRange } from "./dates";
import {
  fetchSchwabHistory,
  SchwabHistoryResponseError,
} from "./history";

describe("fetchSchwabHistory", () => {
  it("fetches bounded chunks and deduplicates overlapping broker records", async () => {
    const ordersByAccount = vi
      .fn()
      .mockResolvedValueOnce([{ orderId: 1 }, { orderId: 2 }])
      .mockResolvedValueOnce([{ orderId: 2 }, { orderId: 3 }]);
    const transactByAcct = vi
      .fn()
      .mockResolvedValue([{ activityId: 10, orderId: 1, time: "now" }]);
    const range = validateSchwabDateRange(
      "2026-07-19",
      "2026-07-25",
      new Date("2026-07-25T18:00:00Z"),
    );

    const result = await fetchSchwabHistory(
      { ordersByAccount, transactByAcct },
      "account-hash",
      range,
    );

    expect(ordersByAccount).toHaveBeenCalledTimes(2);
    expect(transactByAcct).toHaveBeenCalledTimes(1);
    expect(result.orders).toEqual([
      { orderId: 1 },
      { orderId: 2 },
      { orderId: 3 },
    ]);
  });

  it("fails closed when an order chunk may be truncated", async () => {
    const ordersByAccount = vi.fn().mockResolvedValue(
      Array.from({ length: 3000 }, (_, orderId) => ({ orderId })),
    );
    const range = validateSchwabDateRange(
      "2026-07-25",
      "2026-07-25",
      new Date("2026-07-25T18:00:00Z"),
    );

    await expect(fetchSchwabHistory(
      {
        ordersByAccount,
        transactByAcct: vi.fn().mockResolvedValue([]),
      },
      "account-hash",
      range,
    )).rejects.toBeInstanceOf(SchwabHistoryResponseError);
  });
});
