import "server-only";

import { parseSchwabAccountOptions } from "./accounts";
import { schwabRequiresReauthorization } from "./authErrors";
import { getSchwabTradingClient } from "./client";
import { SchwabConfigurationError } from "./credentials";
import type { SchwabConnectionState } from "./types";

export async function getSchwabConnectionState(): Promise<SchwabConnectionState> {
  try {
    const { client, credentials } = await getSchwabTradingClient();
    const rawAccounts: unknown = await client.accountsNumbers();
    const accounts = parseSchwabAccountOptions(rawAccounts, credentials.appSecret);
    return { status: "connected", accounts };
  } catch (error) {
    if (error instanceof SchwabConfigurationError) {
      return {
        status: "missing_credentials",
        missing: error.missing,
        recovery: "Follow docs/setup/SCHWAB_SETUP.md, then run npm run schwab:authorize.",
      };
    }
    if (schwabRequiresReauthorization(error)) {
      return {
        status: "reauth_required",
        recovery: "Run npm run schwab:authorize, restart the Journal, and retry.",
      };
    }
    return {
      status: "unavailable",
      error: "The Journal could not reach Schwab or read the authorized account list. Retry shortly or use file import.",
    };
  }
}
