import type { CandleDataStatus } from "@/lib/candles";

export default function CandleDataNotice({
  detail,
  hasFallback,
  status,
}: {
  detail?: string;
  hasFallback: boolean;
  status: Exclude<CandleDataStatus, "market">;
}) {
  const title = status === "missing"
    ? "Market data missing · ticker review needed"
    : "Market data unavailable · provider check needed";

  return (
    <div role="status" className="mb-4 border-l-2 border-[var(--red)] pl-3">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--red)]">
        {title}
      </p>
      <p className="mt-1 max-w-[760px] text-[13px] leading-5 text-[var(--body)]">
        {hasFallback
          ? "We’re showing an estimate based on your executions. EMA, VWAP, volume, and market-structure coaching are paused until real candles are available."
          : "EMA, VWAP, volume, and market-structure coaching are paused until real candles are available."}
      </p>
      {detail ? (
        <details className="mt-1.5 text-[12px] text-[var(--muted)]">
          <summary className="cursor-pointer select-none font-medium text-[var(--body)]">
            What we checked
          </summary>
          <p className="mt-1 max-w-[900px] leading-5">{detail}</p>
        </details>
      ) : null}
    </div>
  );
}
