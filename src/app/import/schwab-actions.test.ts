import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeSchwabLocally: vi.fn(),
  getSchwabConnectionState: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ host: "127.0.0.1:3000" })),
}));
vi.mock("@/lib/demoMode", () => ({
  canFetchRemoteCandles: () => true,
  canImportData: () => true,
  isDemoReadOnly: () => false,
}));
vi.mock("@/lib/schwab/connection", () => ({
  getSchwabConnectionState: mocks.getSchwabConnectionState,
}));
vi.mock("@/lib/schwab/import", () => ({ importSchwabExecutions: vi.fn() }));
vi.mock("@/lib/schwab/localAuthorization", () => ({
  authorizeSchwabLocally: mocks.authorizeSchwabLocally,
  SchwabLocalAuthorizationError: class SchwabLocalAuthorizationError extends Error {},
}));
vi.mock("@/lib/schwab/persist", () => ({
  SchwabAppendSafetyError: class SchwabAppendSafetyError extends Error {},
}));
vi.mock("@/lib/schwab/preview", () => ({
  buildSchwabImportPreview: vi.fn(),
  SchwabAccountSelectionError: class SchwabAccountSelectionError extends Error {},
}));

import { authorizeSchwabAction } from "./schwab-actions";

const originalProvider = process.env.SCHWAB_IMPORT_PROVIDER;

afterEach(() => {
  mocks.authorizeSchwabLocally.mockReset();
  mocks.getSchwabConnectionState.mockReset();
  if (originalProvider == null) delete process.env.SCHWAB_IMPORT_PROVIDER;
  else process.env.SCHWAB_IMPORT_PROVIDER = originalProvider;
});

describe("authorizeSchwabAction", () => {
  it("never starts standalone OAuth when the gateway owns authorization", async () => {
    process.env.SCHWAB_IMPORT_PROVIDER = "gateway";

    await expect(authorizeSchwabAction()).resolves.toEqual({
      status: "unavailable",
      error: "Schwab authorization is owned by the Schwab Broker Gateway. Authorize Schwab from Trading Monitor, then return here and check the connection again.",
    });
    expect(mocks.authorizeSchwabLocally).not.toHaveBeenCalled();
    expect(mocks.getSchwabConnectionState).not.toHaveBeenCalled();
  });
});
