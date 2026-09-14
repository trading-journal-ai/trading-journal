const REAUTH_PATTERN =
  /(?:401|invalid_grant|refresh[_ -]?token|unauthori[sz]ed|token[^.]{0,30}expired|failed to update access token)/i;

export function schwabErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function schwabRequiresReauthorization(error: unknown) {
  if (
    typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "SCHWAB_AUTHORIZATION_REQUIRED"
  ) {
    return true;
  }
  return REAUTH_PATTERN.test(schwabErrorMessage(error));
}
