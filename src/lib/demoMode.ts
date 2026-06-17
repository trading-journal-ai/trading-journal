export function isDemoReadOnly(): boolean {
  return process.env.DEMO_READ_ONLY === "true";
}

export function canImportData(): boolean {
  return !isDemoReadOnly();
}

export function canFetchRemoteCandles(): boolean {
  return !isDemoReadOnly();
}
