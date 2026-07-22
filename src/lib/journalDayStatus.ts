export type JournalDayStatus = "no_trade" | null;
export type JournalDayState = "trades" | "no_trade" | "unconfirmed_empty";

/** Imported trades always win over a previously saved empty-day confirmation. */
export function journalDayState(tradeCount: number, status: JournalDayStatus): JournalDayState {
  if (tradeCount > 0) return "trades";
  return status === "no_trade" ? "no_trade" : "unconfirmed_empty";
}
