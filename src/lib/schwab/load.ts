import "server-only";

import { parseSchwabAccountOptions, resolveSchwabAccountHash } from "./accounts";
import { getSchwabTradingClient } from "./client";
import { validateSchwabDateRange } from "./dates";
import { fetchSchwabHistory } from "./history";
import { normalizeSchwabHistory } from "./normalize";

export class SchwabAccountSelectionError extends Error {
  constructor() {
    super("The selected Schwab account is no longer authorized. Refresh the connection and try again.");
    this.name = "SchwabAccountSelectionError";
  }
}

export async function loadSchwabNormalizedHistory(input: {
  accountSelection: string;
  from: string;
  to: string;
}) {
  const range = validateSchwabDateRange(input.from, input.to);
  const { client, credentials } = await getSchwabTradingClient();
  const rawAccounts: unknown = await client.accountsNumbers();
  const accountHash = resolveSchwabAccountHash(
    rawAccounts,
    credentials.appSecret,
    input.accountSelection,
  );
  if (!accountHash) throw new SchwabAccountSelectionError();

  const accountOption = parseSchwabAccountOptions(
    rawAccounts,
    credentials.appSecret,
  ).find((option) => option.value === input.accountSelection);
  if (!accountOption) throw new SchwabAccountSelectionError();

  const history = await fetchSchwabHistory(client, accountHash, range);
  const normalized = normalizeSchwabHistory(
    history.orders,
    history.transactions,
    {
      accountHash,
      identitySecret: credentials.appSecret,
      startEpoch: range.startEpoch,
      endEpochExclusive: range.endEpochExclusive,
    },
  );

  return { range, accountOption, history, normalized };
}
