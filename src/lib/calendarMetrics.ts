export function formatCalendarAccuracy(wins: number, losses: number): string {
  const counted = wins + losses;
  if (counted === 0) return "—";
  return `${Math.round((wins / counted) * 100)}%`;
}

export function formatCalendarProfitFactor(grossProfit: number, grossLoss: number): string {
  if (grossProfit <= 0 && grossLoss <= 0) return "—";
  if (grossLoss <= 0) return "9.99+";
  const profitFactor = grossProfit / grossLoss;
  return profitFactor >= 10 ? "9.99+" : profitFactor.toFixed(2);
}
