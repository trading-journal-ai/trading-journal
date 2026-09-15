const CHANGE_EVENT = "journal:temporary-chart-data";

export function temporaryChartKey(accountId: number, symbol: string, date: string): string {
  return `journal:chart-csv:v1:${accountId}:${encodeURIComponent(symbol)}:${date}`;
}

export function readTemporaryChart(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

export function writeTemporaryChart(key: string, csv: string | null): void {
  if (csv === null) sessionStorage.removeItem(key);
  else sessionStorage.setItem(key, csv);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeTemporaryChart(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
