import { reviewStats, type PnlBasis, type ReviewTrade } from "@/lib/analyticsReview";
import { analyticsHistogram } from "@/lib/analyticsHistogram";
import { fmtMoney } from "@/lib/format";
import styles from "./AnalyticsWorkspace.module.css";

const money = (value: number | null) => value == null ? "—" : fmtMoney(value);
const number = (value: number | null) => value == null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const perShare = (value: number | null) => value == null ? "—" : `${(value * 100).toFixed(2)}¢`;
const duration = (value: number | null) => value == null ? "—" : value >= 60 ? `${number(value / 60)} hr` : `${number(value)} min`;

function DetailStats({ items }: { items: [string, string][] }) {
  return <dl className={styles.detailStats}>{items.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
  )}</dl>;
}

export function OverviewDetails({ rows, basis, drawdown }: { rows: ReviewTrade[]; basis: PnlBasis; drawdown: number }) {
  const stats = reviewStats(rows, basis);
  const count = (n: number) => `${n} / ${stats.count ? (n / stats.count * 100).toFixed(1) : "0.0"}%`;
  const comparisons = [
    ["Trades / share of all trades", count(stats.wins), count(stats.losses)],
    ["Average trade", money(stats.avgWin), money(stats.avgLoss)],
    ["Largest trade", money(stats.best), money(stats.worst)],
    ["Longest consecutive streak", String(stats.maxWins), String(stats.maxLosses)],
    ["Average hold time", duration(stats.winHold), duration(stats.lossHold)],
    ["Average result / share", perShare(stats.winPerShare), perShare(stats.lossPerShare)],
    ["Best / worst result per share", perShare(stats.bestPerShare), perShare(stats.worstPerShare)],
  ];
  return <>
    <section className={styles.section} aria-labelledby="result-stats">
      <h3 id="result-stats">Results and consistency</h3>
      <DetailStats items={[
        ["Average / session", money(stats.sessions ? stats.pnl / stats.sessions : null)],
        ["Result / opening share", perShare(stats.perShare)],
        ["Payoff ratio · avg winner / avg loser", stats.avgWin != null && stats.avgLoss != null ? `${(stats.avgWin / Math.abs(stats.avgLoss)).toFixed(2)}×` : "—"],
        ["Max closing drawdown", money(-drawdown)],
        ["Completed trades / sessions", `${stats.count} / ${stats.sessions}`],
        ["Breakeven trades / share of all trades", count(stats.scratches)],
        ["Median losing trade", money(stats.medianLoss)],
      ]} />
    </section>
    <section className={styles.section} aria-labelledby="winner-loser-stats">
      <h3 id="winner-loser-stats">Winners versus losers</h3>
      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.outcomes}`}>
          <thead><tr><th scope="col">Measure</th><th scope="col">Winners</th><th scope="col">Losers</th></tr></thead>
          <tbody>{comparisons.map(([label, win, loss]) => <tr key={label}>
            <th scope="row">{label}</th><td>{win}</td><td>{loss}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className={styles.note}>Trade percentages include breakevens; win rate excludes them. Streaks follow final exit time. Per-share averages give each trade equal weight; the overall result per share is share-weighted.</p>
    </section>
    <section className={styles.section} aria-labelledby="position-stats">
      <h3 id="position-stats">Position size and activity</h3>
      <DetailStats items={[
        ["Average peak shares", number(stats.avgPeak)],
        ["Median peak shares", number(stats.medianPeak)],
        ["Total opening shares", number(stats.totalOpeningShares)],
        ["Average opening shares / session", number(stats.sessions ? stats.totalOpeningShares / stats.sessions : null)],
        ["Trades with adds", String(stats.adds)],
        ["Average peak capital", money(stats.avgCapital)],
      ]} />
      <p className={styles.note}>Size means peak shares held at once. Opening shares count buys, including adds, rather than both buys and sells. Share-split trades are excluded from share measures.</p>
    </section>
  </>;
}

export function PnlHistogram({ rows, basis, onOpen }: {
  rows: ReviewTrade[]; basis: PnlBasis; onOpen: (key: string) => void;
}) {
  const { bins, width } = analyticsHistogram(rows, basis);
  if (!bins.length) return null;
  const max = Math.max(1, ...bins.map(bin => bin.rows.length));
  const rangeLabel = (index: number) => {
    const bin = bins[index];
    return `${money(bin.from)} to ${index === bins.length - 1 ? "" : "under "}${money(bin.to)}`;
  };
  const zeroIndex = bins.findIndex(bin => bin.from === 0);
  return <section className={styles.section} aria-labelledby="pnl-distribution">
    <h3 id="pnl-distribution">P&amp;L distribution</h3>
    <p className={styles.note}>Completed trades by {basis} P&amp;L · {money(width)} per range. Select a bar to inspect its trades.</p>
    <div className={styles.chartScroll}>
      <div className={styles.histogram}>
        <div className={styles.histogramAxis} aria-hidden="true"><span>{max}</span><span>Trades</span><span>0</span></div>
        <div className={styles.histogramPlot} style={{ gridTemplateColumns: `repeat(${bins.length}, minmax(0, 1fr))` }}>
          {bins.map((bin, index) => <button key={bin.key}
            className={`${styles.histogramBin} ${bin.from === 0 ? styles.zeroBin : ""}`}
            disabled={!bin.rows.length} onClick={() => onOpen(bin.key)}
            aria-label={`${rangeLabel(index)}: ${bin.rows.length} ${bin.rows.length === 1 ? "trade" : "trades"}`}
            title={`${rangeLabel(index)} · ${bin.rows.length} ${bin.rows.length === 1 ? "trade" : "trades"}`}>
            <span className={styles.histogramMark} style={{ height: `${bin.rows.length / max * 100}%`, background: bin.to <= 0 ? "var(--red)" : "var(--green)" }}>
              {bin.rows.length ? <span className={styles.histogramCount}>{bin.rows.length}</span> : null}
            </span>
          </button>)}
        </div>
        <div className={styles.histogramTicks} aria-hidden="true">
          <span>{money(bins[0].from)}</span>
          {zeroIndex > 1 && zeroIndex < bins.length - 1 ? <span style={{ left: `${zeroIndex / bins.length * 100}%` }}>{money(0)}</span> : null}
          <span>{money(bins.at(-1)!.to)}</span>
        </div>
      </div>
    </div>
    <p className={styles.note}>Equal-width dollar ranges, with no outliers removed. Zero belongs to the first nonnegative range. Ranges adapt to this selection{basis === "net" && rows.some(row => row.unknownFees) ? "; net results are provisional where fees are unknown" : ""}.</p>
    <details><summary className={styles.link}>Exact ranges and trade counts</summary>
      <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th scope="col">{basis === "net" ? "Net" : "Gross"} P&amp;L / trade</th><th scope="col">Trades</th><th scope="col">Share of trades</th></tr></thead>
        <tbody>{bins.map((bin, index) => <tr key={bin.key}>
          <th scope="row">{bin.rows.length ? <button className={styles.link} onClick={() => onOpen(bin.key)}>{rangeLabel(index)}</button> : rangeLabel(index)}</th>
          <td>{bin.rows.length}</td><td>{(bin.rows.length / rows.length * 100).toFixed(1)}%</td>
        </tr>)}</tbody>
      </table></div>
    </details>
  </section>;
}
