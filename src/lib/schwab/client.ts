import "server-only";

import { createHash } from "node:crypto";
import type { TradingApiClient } from "schwab-client-js";
import { readSchwabCredentials, type SchwabCredentials } from "./credentials";

type ClientCache = {
  credentialFingerprint: string;
  client: TradingApiClient;
};

let clientCache: ClientCache | null = null;

function credentialFingerprint(credentials: SchwabCredentials) {
  return createHash("sha256")
    .update(credentials.appKey)
    .update("\0")
    .update(credentials.appSecret)
    .update("\0")
    .update(credentials.refreshToken)
    .digest("hex");
}

export async function getSchwabTradingClient() {
  const credentials = readSchwabCredentials();
  const fingerprint = credentialFingerprint(credentials);
  if (clientCache?.credentialFingerprint === fingerprint) {
    return { client: clientCache.client, credentials };
  }

  process.env.DOTENV_CONFIG_QUIET ||= "true";
  const { TradingApiClient } = await import("schwab-client-js");
  const client = new TradingApiClient(
    credentials.appKey,
    credentials.appSecret,
    credentials.refreshToken,
  );
  clientCache = { credentialFingerprint: fingerprint, client };
  return { client, credentials };
}

export function clearSchwabClientCache() {
  clientCache = null;
}
