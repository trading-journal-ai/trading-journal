import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  active: vi.fn(), destination: vi.fn(), persist: vi.fn(), inspect: vi.fn(), allowed: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/accountScope", () => ({ getActiveAccount: mocks.active }));
vi.mock("@/lib/import/destination", () => ({ requireImportDestination: mocks.destination }));
vi.mock("@/lib/import/persist", () => ({ importBrokerCsv: mocks.persist }));
vi.mock("@/lib/import/inspect", () => ({ inspectBrokerCsv: mocks.inspect }));
vi.mock("@/lib/demoMode", () => ({ canImportData: mocks.allowed }));
import { importCsvAction } from "./actions";

function csvForm(destination?: string) {
  const data = new FormData();
  data.set("file", new File(["synthetic,csv"], "synthetic.csv", { type: "text/csv" }));
  if (destination !== undefined) data.set("journalAccountId", destination);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.allowed.mockReturnValue(true);
  mocks.inspect.mockReturnValue({ importable: true });
  mocks.active.mockResolvedValue({ id: 2, name: "Paper fixture" });
  mocks.destination.mockResolvedValue({ id: 1, name: "Schwab fixture" });
  mocks.persist.mockResolvedValue({ inserted: 2 });
});

describe("CSV import account scope", () => {
  it("writes into the modal destination instead of the active account", async () => {
    expect((await importCsvAction(null, csvForm("1")))?.ok).toBe(true);
    expect(mocks.destination).toHaveBeenCalledWith(1);
    expect(mocks.persist).toHaveBeenCalledWith("synthetic,csv", "synthetic.csv", 1);
    expect(mocks.active).not.toHaveBeenCalled();
  });
  it("does not save when an explicit destination is rejected", async () => {
    mocks.destination.mockRejectedValue(new Error("Destination changed"));
    expect(await importCsvAction(null, csvForm("2"))).toMatchObject({ ok: false, error: "Destination changed" });
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it("preserves active-account behavior for existing callers", async () => {
    await importCsvAction(null, csvForm());
    expect(mocks.persist).toHaveBeenCalledWith("synthetic,csv", "synthetic.csv", 2);
  });
  it("does not resolve accounts or save in a read-only demo", async () => {
    mocks.allowed.mockReturnValue(false);
    expect((await importCsvAction(null, csvForm("1")))?.ok).toBe(false);
    expect(mocks.destination).not.toHaveBeenCalled();
    expect(mocks.persist).not.toHaveBeenCalled();
  });
});
