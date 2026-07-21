export type SecurityIdentifierResolution = {
  identifier: string;
  symbol: string | null;
  issuer: string | null;
};

const SECURITY_ALIASES: Record<string, { symbol: string; issuer: string }> = {
  "40423R204": { symbol: "HCWB", issuer: "HCW Biologics Inc." },
};

function cusipCharacterValue(character: string): number | null {
  if (/^\d$/.test(character)) return Number(character);
  if (/^[A-Z]$/.test(character)) return character.charCodeAt(0) - 55;
  if (character === "*") return 36;
  if (character === "@") return 37;
  if (character === "#") return 38;
  return null;
}

/** Validate a nine-character CUSIP, including its check digit. */
export function isCusip(value: string): boolean {
  const identifier = value.trim().toUpperCase();
  if (!/^[A-Z0-9*@#]{8}\d$/.test(identifier)) return false;

  let sum = 0;
  for (let index = 0; index < 8; index += 1) {
    const valueAtIndex = cusipCharacterValue(identifier[index]);
    if (valueAtIndex == null) return false;
    const weighted = valueAtIndex * (index % 2 === 1 ? 2 : 1);
    sum += Math.floor(weighted / 10) + (weighted % 10);
  }

  return (10 - (sum % 10)) % 10 === Number(identifier[8]);
}

export function resolveSecurityIdentifier(rawValue: string): SecurityIdentifierResolution | null {
  const identifier = rawValue.trim().toUpperCase();
  if (!isCusip(identifier)) return null;
  const alias = SECURITY_ALIASES[identifier];
  return {
    identifier,
    symbol: alias?.symbol ?? null,
    issuer: alias?.issuer ?? null,
  };
}

export function normalizeBrokerSymbol(rawValue: string): {
  symbol: string;
  resolution: SecurityIdentifierResolution | null;
} {
  const rawSymbol = rawValue.trim().toUpperCase();
  const resolution = resolveSecurityIdentifier(rawSymbol);
  return {
    symbol: resolution?.symbol ?? rawSymbol,
    resolution,
  };
}
