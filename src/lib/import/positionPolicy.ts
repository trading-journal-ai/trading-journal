/** Installation-wide import policy; broker fills are never fabricated to balance a position. */
export class ImportPositionPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportPositionPolicyError";
  }
}

export function assertImportPositionPolicy(
  trades: ReadonlyArray<{ symbol: string; side: "long" | "short" }>,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  const mode = environment.JOURNAL_IMPORT_POSITION_MODE?.trim() || "long-and-short";
  if (mode !== "long-only" && mode !== "long-and-short") {
    throw new ImportPositionPolicyError(
      "JOURNAL_IMPORT_POSITION_MODE must be long-only or long-and-short. No changes were saved.",
    );
  }
  if (mode === "long-and-short") return;

  const symbols = [...new Set(trades.filter((trade) => trade.side === "short").map((trade) => trade.symbol))].sort();
  if (symbols.length > 0) {
    throw new ImportPositionPolicyError(
      `Long-only import stopped: ${symbols.join(", ")} would create a short position. A sell may be missing its earlier buys or exceed the recorded position. Sync or import a date range that includes the opening purchase, then retry. No changes were saved.`,
    );
  }
}
