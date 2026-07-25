export type SchwabCredentials = {
  appKey: string;
  appSecret: string;
  refreshToken: string;
  callbackUrl: string;
};

const CREDENTIAL_KEYS = {
  appKey: "SCHWAB_APP_KEY",
  appSecret: "SCHWAB_SECRET",
  refreshToken: "SCHWAB_REFRESH_TOKEN",
  callbackUrl: "SCHWAB_CALLBACK_URL",
} as const;

export class SchwabConfigurationError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Missing Schwab settings: ${missing.join(", ")}`);
    this.name = "SchwabConfigurationError";
    this.missing = missing;
  }
}

export function readSchwabCredentials(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SchwabCredentials {
  const values = {
    appKey: environment[CREDENTIAL_KEYS.appKey]?.trim() ?? "",
    appSecret: environment[CREDENTIAL_KEYS.appSecret]?.trim() ?? "",
    refreshToken: environment[CREDENTIAL_KEYS.refreshToken]?.trim() ?? "",
    callbackUrl: environment[CREDENTIAL_KEYS.callbackUrl]?.trim() ?? "",
  };
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => CREDENTIAL_KEYS[key as keyof typeof CREDENTIAL_KEYS]);

  if (missing.length > 0) throw new SchwabConfigurationError(missing);
  return values;
}
