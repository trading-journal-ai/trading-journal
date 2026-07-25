export type SchwabAccountOption = {
  value: string;
  label: string;
};

export type SchwabConnectionState =
  | {
      status: "connected";
      accounts: SchwabAccountOption[];
    }
  | {
      status: "missing_credentials";
      missing: string[];
      recovery: string;
    }
  | {
      status: "reauth_required";
      recovery: string;
    }
  | {
      status: "unavailable";
      error: string;
    };

export type SchwabImportPreview = {
  accountLabel: string;
  journalAccountLabel: string;
  from: string;
  to: string;
  ordersRead: number;
  transactionsRead: number;
  executionsFound: number;
  newExecutions: number;
  duplicateExecutions: number;
  reviewExecutions: number;
  reviewSymbols: string[];
  reviewDates: string[];
  newDates: string[];
  duplicateDates: string[];
  estimatedNewTrades: number;
  existingTradesAffected: number;
  symbols: number;
  excludedAssets: number;
  warnings: string[];
};

export type SchwabPreviewActionResult =
  | {
      ok: true;
      preview: SchwabImportPreview;
    }
  | {
      ok: false;
      kind: "validation" | "reauth_required" | "unavailable";
      error: string;
    };

export type SchwabImportSummary = {
  batchId: number | null;
  accountLabel: string;
  journalAccountLabel: string;
  from: string;
  to: string;
  parsed: number;
  inserted: number;
  duplicates: number;
  reviewExecutions: number;
  reviewSymbols: string[];
  reviewDates: string[];
  tradesCreated: number;
  tradesUpdated: number;
  insertedFrom: string | null;
  insertedTo: string | null;
  insertedDates: string[];
  duplicateDates: string[];
  warnings: string[];
};

export type SchwabImportActionResult =
  | {
      ok: true;
      summary: SchwabImportSummary;
    }
  | {
      ok: false;
      kind: "validation" | "reauth_required" | "unavailable";
      error: string;
    };
