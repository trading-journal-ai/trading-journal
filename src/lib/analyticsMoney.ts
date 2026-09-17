/** Decimal arithmetic for fill cash flows; round once per completed trade. */
function decimal(value: number): { coefficient: bigint; scale: number } {
  if (!Number.isFinite(value)) throw new Error("Cash flows must be finite");
  const [mantissa, exponent = "0"] = value.toString().toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const scale = fraction.length - Number(exponent);
  const coefficient = BigInt(whole + fraction);
  return scale < 0
    ? { coefficient: coefficient * BigInt(10) ** BigInt(-scale), scale: 0 }
    : { coefficient, scale };
}

/** Signed amounts, optionally multiplied by quantity; half cents round away from zero. */
export function cashFlowTotal(terms: { value: number; quantity?: number }[]): number {
  const products = terms.map(({value, quantity = 1}) => {
    const a = decimal(value), b = decimal(quantity);
    return { coefficient: a.coefficient * b.coefficient, scale: a.scale + b.scale };
  });
  const scale = Math.max(2, ...products.map(p => p.scale));
  const sum = products.reduce((total, p) => total + p.coefficient * BigInt(10) ** BigInt(scale - p.scale), BigInt(0));
  const divisor = BigInt(10) ** BigInt(scale - 2);
  const magnitude = sum < BigInt(0) ? -sum : sum;
  const cents = magnitude / divisor + (magnitude % divisor * BigInt(2) >= divisor ? BigInt(1) : BigInt(0));
  return Number(sum < BigInt(0) ? -cents : cents) / 100;
}
