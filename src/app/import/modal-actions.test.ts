import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ destination: vi.fn(), connection: vi.fn(), allowed: vi.fn() }));
vi.mock("@/lib/demoMode", () => ({ canImportData: mocks.allowed }));
vi.mock("@/lib/import/destination", () => ({ getActiveImportDestination: mocks.destination, requireImportDestination: vi.fn() }));
vi.mock("@/lib/accountScope", () => ({ setActiveAccount: vi.fn() }));
vi.mock("@/lib/schwab/provider", () => ({ readSchwabImportProvider: () => "gateway" }));
vi.mock("./schwab-actions", () => ({ getSchwabConnectionAction: mocks.connection }));
import { getImportModalContextAction } from "./modal-actions";

beforeEach(() => { vi.resetAllMocks(); mocks.allowed.mockReturnValue(true); });

describe("header-selected importer", () => {
  it("does not query Schwab for an unsupported header account", async () => {
    const destination = { account: { id: 2, name: "Paper fixture" }, supported: false };
    mocks.destination.mockResolvedValue(destination);
    expect(await getImportModalContextAction()).toEqual({ destination, connection: null, gateway: true });
    expect(mocks.connection).not.toHaveBeenCalled();
  });
  it("loads Schwab for the supported header destination without substituting another account", async () => {
    const destination = { account: { id: 3, name: "Second live fixture" }, supported: true };
    mocks.destination.mockResolvedValue(destination);
    mocks.connection.mockResolvedValue({ status: "connected", accounts: [] });
    expect((await getImportModalContextAction()).destination).toEqual(destination);
    expect(mocks.connection).toHaveBeenCalledOnce();
  });
});
