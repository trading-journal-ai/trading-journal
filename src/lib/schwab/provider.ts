export type SchwabImportProvider = "gateway" | "standalone";

export class SchwabProviderConfigurationError extends Error {
  readonly setting = "SCHWAB_IMPORT_PROVIDER";

  constructor(value: string) {
    super(
      value
        ? "SCHWAB_IMPORT_PROVIDER must be either gateway or standalone."
        : "SCHWAB_IMPORT_PROVIDER is not configured.",
    );
    this.name = "SchwabProviderConfigurationError";
  }
}

export function readSchwabImportProvider(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SchwabImportProvider {
  const configured = environment.SCHWAB_IMPORT_PROVIDER?.trim().toLowerCase() ?? "";
  if (!configured) return "standalone";
  if (configured === "gateway" || configured === "standalone") return configured;
  throw new SchwabProviderConfigurationError(configured);
}
