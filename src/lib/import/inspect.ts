const TOS_SECTIONS = [
  "Cash Balance",
  "Futures Statements",
  "Forex Statements",
  "Account Order History",
  "Account Trade History",
  "Equities",
  "Profits and Losses",
] as const;

type BrokerCsvFormat =
  | "app_export"
  | "das_trade_summary"
  | "tos_account_statement"
  | "unknown";

export type BrokerCsvInspection = {
  format: BrokerCsvFormat;
  importable: boolean;
  importSource: "tos_csv" | "das_csv" | null;
  appExport: {
    detected: boolean;
    tradeRows: number;
  };
  dasTradeSummary: {
    detected: boolean;
    tradeRows: number;
  };
  tos: {
    cashBalance: {
      present: boolean;
      rows: number;
      tradeRows: number;
      botRows: number;
      soldRows: number;
      feesRows: number;
      tradeHistoryExactMatches: number | null;
      tradeHistoryUnmatched: number | null;
      cashUnmatched: number | null;
    };
    orderHistory: {
      present: boolean;
      rows: number;
      filledRows: number;
      usableFilledRows: number;
      canceledRows: number;
      missingPrice: number;
      symbolCount: number;
    };
    tradeHistory: {
      present: boolean;
      rows: number;
      usableFills: number;
      missingPrice: number;
    };
    equities: {
      present: boolean;
      rows: number;
      positions: number;
    };
    pnl: {
      present: boolean;
      rows: number;
      symbols: number;
      netYtdPnl: number | null;
    };
  };
  recommendation: string;
};

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cleanCell(field));
      field = "";
    } else if (char === "\n") {
      row.push(cleanCell(field.replace(/\r$/, "")));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) row.push(cleanCell(field.replace(/\r$/, "")));
  if (row.length > 0) rows.push(row);
  return rows;
}

function cleanCell(value: unknown): string {
  return String(value ?? "").trim().replace(/^\uFEFF/, "").replace(/^="(.*)"$/, "$1");
}

function nonEmptyCells(row: string[]): string[] {
  return row.map(cleanCell).filter(Boolean);
}

function rowLabel(row: string[]): string {
  const cells = nonEmptyCells(row);
  return cells.length === 1 ? cells[0] : "";
}

function isBlank(row: string[]): boolean {
  return nonEmptyCells(row).length === 0;
}

function headerIndexAfter(rows: string[][], sectionIndex: number): number {
  for (let i = sectionIndex + 1; i < rows.length; i += 1) {
    if (!isBlank(rows[i])) return i;
  }
  return -1;
}

function sliceSection(rows: string[][], name: string): { present: boolean; headers: string[]; rows: string[][] } {
  const sectionIndex = rows.findIndex((row) => rowLabel(row) === name);
  if (sectionIndex < 0) return { present: false, headers: [], rows: [] };
  const headerIndex = headerIndexAfter(rows, sectionIndex);
  if (headerIndex < 0) return { present: true, headers: [], rows: [] };

  const headers = rows[headerIndex].map(cleanCell);
  const sectionRows: string[][] = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const current = rows[i];
    const label = rowLabel(current);
    if (TOS_SECTIONS.includes(label as (typeof TOS_SECTIONS)[number])) break;
    if (isBlank(current)) break;
    sectionRows.push(current.map(cleanCell));
  }
  return { present: true, headers, rows: sectionRows };
}

function indexByHeader(headers: string[]): Map<string, number> {
  const out = new Map<string, number>();
  headers.forEach((header, index) => {
    if (header && !out.has(header)) out.set(header, index);
  });
  return out;
}

function numberOrNull(value: unknown): number | null {
  const raw = String(value ?? "");
  const normalized = raw.replace(/[,+$()%]/g, "").trim();
  if (!normalized || normalized === "~") return null;
  const number = Number(normalized);
  if (!Number.isFinite(number)) return null;
  return raw.includes("(") && raw.includes(")") ? -number : number;
}

function valueAt(row: string[], headerIndex: Map<string, number>, name: string): string {
  const index = headerIndex.get(name);
  return index == null ? "" : cleanCell(row[index]);
}

function parseCashTradeDescription(value: string): null | {
  side: "BUY" | "SELL";
  quantity: number;
  symbol: string;
  price: number;
} {
  const match = value.match(/^(BOT|SOLD)\s+([+-][\d,]+)\s+(\S+)\s+@([\d.]+)/);
  if (!match) return null;
  const [, rawSide, rawQuantity, rawSymbol, rawPrice] = match;
  const quantity = Math.abs(numberOrNull(rawQuantity) ?? 0);
  const price = numberOrNull(rawPrice);
  if (quantity === 0 || price == null) return null;
  return {
    side: rawSide === "BOT" ? "BUY" : "SELL",
    quantity,
    symbol: rawSymbol.toUpperCase(),
    price,
  };
}

function inspectAppExport(rows: string[][]): BrokerCsvInspection["appExport"] {
  const firstNonBlank = rows.find((row) => !isBlank(row)) ?? [];
  const headers = firstNonBlank.map(cleanCell);
  const required = [
    "trade_id",
    "symbol",
    "side",
    "quantity",
    "entry_at",
    "exit_at",
    "avg_entry_price",
    "avg_exit_price",
    "net_pnl",
  ];
  if (!required.every((header) => headers.includes(header))) {
    return { detected: false, tradeRows: 0 };
  }
  return {
    detected: true,
    tradeRows: rows.slice(rows.indexOf(firstNonBlank) + 1).filter((row) => !isBlank(row)).length,
  };
}

function inspectDasTradeSummary(rows: string[][]): BrokerCsvInspection["dasTradeSummary"] {
  const firstNonBlank = rows.find((row) => !isBlank(row)) ?? [];
  const headers = firstNonBlank.map(cleanCell);
  const required = [
    "Open Datetime",
    "Close Datetime",
    "Symbol",
    "Side",
    "Volume",
    "Entry Price",
    "Exit Price",
    "Gross P&L",
  ];
  if (!required.every((header) => headers.includes(header))) {
    return { detected: false, tradeRows: 0 };
  }
  return {
    detected: true,
    tradeRows: rows.slice(rows.indexOf(firstNonBlank) + 1).filter((row) => !isBlank(row)).length,
  };
}

function summarizeTosTradeHistory(section: { present: boolean; headers: string[]; rows: string[][] }) {
  if (!section.present) return { present: false, rows: 0, usableFills: 0, missingPrice: 0 };
  const headerIndex = indexByHeader(section.headers);
  let usableFills = 0;
  let missingPrice = 0;
  for (const row of section.rows) {
    const qty = Math.abs(numberOrNull(valueAt(row, headerIndex, "Qty")) ?? 0);
    const price = numberOrNull(valueAt(row, headerIndex, "Net Price")) ?? numberOrNull(valueAt(row, headerIndex, "Price"));
    const symbol = valueAt(row, headerIndex, "Symbol");
    const execTime = valueAt(row, headerIndex, "Exec Time");
    if (symbol && execTime && qty > 0 && price != null) usableFills += 1;
    if (symbol && execTime && qty > 0 && price == null) missingPrice += 1;
  }
  return { present: true, rows: section.rows.length, usableFills, missingPrice };
}

function tradeHistoryFillKey(row: string[], headerIndex: Map<string, number>): string | null {
  const execTime = valueAt(row, headerIndex, "Exec Time");
  const side = valueAt(row, headerIndex, "Side").toUpperCase();
  const symbol = valueAt(row, headerIndex, "Symbol").toUpperCase();
  const qty = Math.abs(numberOrNull(valueAt(row, headerIndex, "Qty")) ?? 0);
  const price = numberOrNull(valueAt(row, headerIndex, "Net Price")) ?? numberOrNull(valueAt(row, headerIndex, "Price"));
  if (!execTime || !["BUY", "SELL"].includes(side) || !symbol || qty === 0 || price == null) return null;
  return `${execTime}|${side}|${qty}|${symbol}|${price}`;
}

function summarizeCashBalance(
  section: { present: boolean; headers: string[]; rows: string[][] },
  tradeHistorySection: { present: boolean; headers: string[]; rows: string[][] },
) {
  if (!section.present) {
    return {
      present: false,
      rows: 0,
      tradeRows: 0,
      botRows: 0,
      soldRows: 0,
      feesRows: 0,
      tradeHistoryExactMatches: null,
      tradeHistoryUnmatched: null,
      cashUnmatched: null,
    };
  }

  const headerIndex = indexByHeader(section.headers);
  const cashKeys = new Map<string, number>();
  let botRows = 0;
  let soldRows = 0;
  let feesRows = 0;

  for (const row of section.rows) {
    const parsed = parseCashTradeDescription(valueAt(row, headerIndex, "DESCRIPTION"));
    const fees = numberOrNull(valueAt(row, headerIndex, "Misc Fees")) ?? 0;
    if (fees !== 0) feesRows += 1;
    if (!parsed) continue;
    if (parsed.side === "BUY") botRows += 1;
    else soldRows += 1;
    const date = valueAt(row, headerIndex, "DATE");
    const time = valueAt(row, headerIndex, "TIME");
    const key = `${date} ${time}|${parsed.side}|${parsed.quantity}|${parsed.symbol}|${parsed.price}`;
    cashKeys.set(key, (cashKeys.get(key) ?? 0) + 1);
  }

  let tradeHistoryExactMatches: number | null = null;
  let tradeHistoryUnmatched: number | null = null;
  let cashUnmatched: number | null = null;

  if (tradeHistorySection.present) {
    const tradeHeaderIndex = indexByHeader(tradeHistorySection.headers);
    tradeHistoryExactMatches = 0;
    tradeHistoryUnmatched = 0;

    for (const row of tradeHistorySection.rows) {
      const key = tradeHistoryFillKey(row, tradeHeaderIndex);
      if (!key) continue;
      const count = cashKeys.get(key) ?? 0;
      if (count > 0) {
        cashKeys.set(key, count - 1);
        tradeHistoryExactMatches += 1;
      } else {
        tradeHistoryUnmatched += 1;
      }
    }

    cashUnmatched = [...cashKeys.values()].reduce((total, count) => total + count, 0);
  }

  return {
    present: true,
    rows: section.rows.length,
    tradeRows: botRows + soldRows,
    botRows,
    soldRows,
    feesRows,
    tradeHistoryExactMatches,
    tradeHistoryUnmatched,
    cashUnmatched,
  };
}

function summarizeTosOrderHistory(section: { present: boolean; headers: string[]; rows: string[][] }) {
  if (!section.present) {
    return {
      present: false,
      rows: 0,
      filledRows: 0,
      usableFilledRows: 0,
      canceledRows: 0,
      missingPrice: 0,
      symbolCount: 0,
    };
  }

  const headerIndex = indexByHeader(section.headers);
  let filledRows = 0;
  let canceledRows = 0;
  let usableFilledRows = 0;
  let missingPrice = 0;
  const symbols = new Set<string>();

  for (const row of section.rows) {
    const status = valueAt(row, headerIndex, "Status").toUpperCase();
    const symbol = valueAt(row, headerIndex, "Symbol").toUpperCase();
    const side = valueAt(row, headerIndex, "Side").toUpperCase();
    const timePlaced = valueAt(row, headerIndex, "Time Placed");
    const qty = Math.abs(numberOrNull(valueAt(row, headerIndex, "Qty")) ?? 0);
    const price = numberOrNull(valueAt(row, headerIndex, "PRICE"));
    if (symbol) symbols.add(symbol);
    if (status === "FILLED") filledRows += 1;
    if (status.startsWith("CANCEL")) canceledRows += 1;
    if (status === "FILLED" && symbol && timePlaced && ["BUY", "SELL"].includes(side) && qty > 0 && price != null) {
      usableFilledRows += 1;
    }
    if (status === "FILLED" && symbol && timePlaced && qty > 0 && price == null) missingPrice += 1;
  }

  return {
    present: true,
    rows: section.rows.length,
    filledRows,
    usableFilledRows,
    canceledRows,
    missingPrice,
    symbolCount: symbols.size,
  };
}

function summarizePnl(section: { present: boolean; headers: string[]; rows: string[][] }) {
  if (!section.present) return { present: false, rows: 0, symbols: 0, netYtdPnl: null };
  const headerIndex = indexByHeader(section.headers);
  let netYtdPnl = 0;
  let symbols = 0;
  for (const row of section.rows) {
    const symbol = valueAt(row, headerIndex, "Symbol");
    if (!symbol || symbol === "OVERALL TOTALS") continue;
    symbols += 1;
    netYtdPnl += numberOrNull(valueAt(row, headerIndex, "P/L YTD")) ?? 0;
  }
  return {
    present: true,
    rows: section.rows.length,
    symbols,
    netYtdPnl: Math.round(netYtdPnl * 100) / 100,
  };
}

function summarizeEquities(section: { present: boolean; headers: string[]; rows: string[][] }) {
  if (!section.present) return { present: false, rows: 0, positions: 0 };
  const headerIndex = indexByHeader(section.headers);
  let positions = 0;
  for (const row of section.rows) {
    const symbol = valueAt(row, headerIndex, "Symbol");
    if (symbol && symbol !== "OVERALL TOTALS") positions += 1;
  }
  return { present: true, rows: section.rows.length, positions };
}

function recommendationFor(
  format: BrokerCsvFormat,
  appExport: BrokerCsvInspection["appExport"],
  dasTradeSummary: BrokerCsvInspection["dasTradeSummary"],
  orderHistory: BrokerCsvInspection["tos"]["orderHistory"],
  tradeHistory: BrokerCsvInspection["tos"]["tradeHistory"],
  pnl: BrokerCsvInspection["tos"]["pnl"],
): string {
  if (dasTradeSummary.detected && dasTradeSummary.tradeRows > 0) {
    return "This DAS trade-summary CSV can be imported as reconstructed closed trades.";
  }
  if (appExport.detected && appExport.tradeRows > 0) {
    return "This app export is useful for private coach evals, but it is not a broker import format.";
  }
  if (tradeHistory.usableFills > 0) {
    return "This ThinkorSwim statement can be imported from fill-level trade history.";
  }
  if (orderHistory.usableFilledRows > 0) {
    return "This statement has filled order-history rows, but the app does not import that lower-confidence section yet.";
  }
  if (pnl.symbols > 0) {
    return "This statement only supports symbol-level P&L review unless order/trade history rows are included in the export.";
  }
  if (format === "tos_account_statement") {
    return "ThinkorSwim statement detected, but no usable trade/order rows were found.";
  }
  return "No supported broker trade sections were found.";
}

export function inspectBrokerCsv(csv: string): BrokerCsvInspection {
  const rows = parseCsvRows(csv);
  const appExport = inspectAppExport(rows);
  const dasTradeSummary = inspectDasTradeSummary(rows);
  const cashBalanceSection = sliceSection(rows, "Cash Balance");
  const orderHistorySection = sliceSection(rows, "Account Order History");
  const tradeHistorySection = sliceSection(rows, "Account Trade History");
  const cashBalance = summarizeCashBalance(cashBalanceSection, tradeHistorySection);
  const orderHistory = summarizeTosOrderHistory(orderHistorySection);
  const tradeHistory = summarizeTosTradeHistory(tradeHistorySection);
  const equities = summarizeEquities(sliceSection(rows, "Equities"));
  const pnl = summarizePnl(sliceSection(rows, "Profits and Losses"));

  const format: BrokerCsvFormat = dasTradeSummary.detected
    ? "das_trade_summary"
    : appExport.detected
      ? "app_export"
      : orderHistory.present || tradeHistory.present || pnl.present
        ? "tos_account_statement"
        : "unknown";

  const importSource =
    dasTradeSummary.detected && dasTradeSummary.tradeRows > 0
      ? "das_csv"
      : tradeHistory.usableFills > 0
        ? "tos_csv"
        : null;

  return {
    format,
    importable: importSource != null,
    importSource,
    appExport,
    dasTradeSummary,
    tos: {
      cashBalance,
      orderHistory,
      tradeHistory,
      equities,
      pnl,
    },
    recommendation: recommendationFor(format, appExport, dasTradeSummary, orderHistory, tradeHistory, pnl),
  };
}
