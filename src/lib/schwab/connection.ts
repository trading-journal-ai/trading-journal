import "server-only";

import { parseSchwabAccountOptions } from "./accounts";
import { schwabRequiresReauthorization } from "./authErrors";
import { getSchwabTradingClient } from "./client";
import { SchwabConfigurationError } from "./credentials";
import {
  getSchwabGatewayClient,
  type SchwabGatewayClient,
} from "./gatewayClient";
import {
  readSchwabImportProvider,
  SchwabProviderConfigurationError,
} from "./provider";
import type { SchwabConnectionState } from "./types";

type ConnectionDependencies = {
  environment?: Readonly<Record<string, string | undefined>>;
  gatewayClient?: SchwabGatewayClient;
};

export async function getSchwabConnectionState(
  dependencies: ConnectionDependencies = {},
): Promise<SchwabConnectionState> {
  const environment = dependencies.environment ?? process.env;
  try {
    if (readSchwabImportProvider(environment) === "gateway") {
      const client = dependencies.gatewayClient ?? getSchwabGatewayClient(environment);
      return { status: "connected", accounts: await client.accounts() };
    }
    const { client, credentials } = await getSchwabTradingClient();
    const rawAccounts: unknown = await client.accountsNumbers();
    const accounts = parseSchwabAccountOptions(rawAccounts, credentials.appSecret);
    return { status: "connected", accounts };
  } catch (error) {
    if (error instanceof SchwabProviderConfigurationError) {
      return {
        status: "missing_credentials",
        missing: [error.setting],
        recovery: "Set SCHWAB_IMPORT_PROVIDER to gateway or standalone.",
      };
    }
    if (error instanceof SchwabConfigurationError) {
      const needsDeveloperSetup = error.missing.some(
        (key) => key !== "SCHWAB_REFRESH_TOKEN",
      );
      return {
        status: "missing_credentials",
        missing: error.missing,
        recovery: needsDeveloperSetup
          ? "Add this Journal’s Schwab developer credentials once, then authorize Schwab."
          : "Authorize Schwab to finish connecting this Journal.",
      };
    }
    if (schwabRequiresReauthorization(error)) {
      return {
        status: "reauth_required",
        recovery: "Authorize Schwab again to continue.",
      };
    }
    return {
      status: "unavailable",
      error: "The Journal could not reach Schwab or read the authorized account list. Retry shortly or use file import.",
    };
  }
}
