type MockStat = {
  label: string;
  value: string;
};

const keyStats: MockStat[] = [
  { label: "Total Gain/Loss", value: "-$480.79" },
  { label: "Win Rate", value: "57.3%" },
  { label: "Profit Factor", value: "0.71" },
  { label: "Payoff Ratio", value: "0.53" },
  { label: "Average Trade Gain/Loss", value: "-$0.74" },
  { label: "Average Per-share Gain/Loss", value: "-$0.01" },
];

const detailStats: MockStat[] = [
  { label: "Average Daily Gain/Loss", value: "-$53.42" },
  { label: "Largest Gain", value: "$93.96" },
  { label: "Largest Loss", value: "-$246.69" },
  { label: "Number of Winning Trades", value: "369 (56.5%)" },
  { label: "Number of Losing Trades", value: "275 (42.1%)" },
  { label: "Average Winning Trade", value: "$3.24" },
  { label: "Average Losing Trade", value: "-$6.10" },
  { label: "Max Consecutive Wins", value: "10" },
  { label: "Max Consecutive Losses", value: "7" },
  { label: "Average Share Size", value: "57" },
  { label: "Median Share Size", value: "10" },
  { label: "Average Daily Volume", value: "4,135" },
  { label: "High Winning Per-share", value: "$3.88" },
  { label: "Average Winning Per-share", value: "$0.11" },
  { label: "Average Losing Per-share", value: "-$0.14" },
  { label: "Worst Losing Per-share", value: "-$1.26" },
  { label: "Number of Scratch Trades", value: "9 (1.4%)" },
  { label: "Average Hold Time (winning trades)", value: "2 min" },
  { label: "Average Hold Time (losing trades)", value: "1 min" },
];

const pairedStatGroups = [
  [
    ["Total Gain/Loss", "Average Daily Gain/Loss"],
    ["Average Trade Gain/Loss", "Average Per-share Gain/Loss"],
    ["Profit Factor", "Payoff Ratio"],
  ],
  [
    ["Number of Winning Trades", "Number of Losing Trades"],
    ["Average Winning Trade", "Average Losing Trade"],
    ["Largest Gain", "Largest Loss"],
    ["Max Consecutive Wins", "Max Consecutive Losses"],
    ["High Winning Per-share", "Worst Losing Per-share"],
    ["Average Winning Per-share", "Average Losing Per-share"],
    ["Average Hold Time (winning trades)", "Average Hold Time (losing trades)"],
  ],
  [
    ["Average Share Size", "Median Share Size"],
    ["Average Daily Volume", "Number of Scratch Trades"],
  ],
].map((group) => group.map((row) => row.map(statByLabel)));

function chunk<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );
}

function statByLabel(label: string): MockStat {
  const stat = [...keyStats, ...detailStats].find((item) => item.label === label);
  if (!stat) throw new Error(`Missing mock stat: ${label}`);
  return stat;
}

const tradeReviewRows: MockStat[][] = [
  ["Total Gain/Loss", "Largest Gain", "Largest Loss"],
  ["Average Daily Gain/Loss", "Average Daily Volume", "Average Per-share Gain/Loss"],
  ["Average Trade Gain/Loss", "Average Winning Trade", "Average Losing Trade"],
  ["Number of Winning Trades", "Number of Losing Trades", "Profit Factor"],
  ["Number of Scratch Trades", "Average Hold Time (winning trades)", "Average Hold Time (losing trades)"],
  ["Max Consecutive Wins", "Max Consecutive Losses"],
].map((row) => row.map(statByLabel));

const sizingRows: MockStat[][] = [
  ["Average Share Size", "Median Share Size", "High Winning Per-share"],
  ["Average Winning Per-share", "Average Losing Per-share", "Worst Losing Per-share"],
].map((row) => row.map(statByLabel));

function StatCell({
  stat,
  quiet = false,
  table = false,
  compact = false,
}: {
  stat: MockStat;
  quiet?: boolean;
  table?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center ${compact ? "gap-3" : "gap-5"}`}>
      <div className={`${table || compact ? "text-sm font-medium" : quiet ? "text-[13px]" : "text-sm"} leading-snug text-[var(--body)]`}>{stat.label}</div>
      <div className={`${quiet ? "text-sm" : "text-base"} whitespace-nowrap text-right font-mono font-semibold tabular-nums text-[var(--foreground)]`}>
        {stat.value}
      </div>
    </div>
  );
}

function TreatmentShell({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">{kicker}</div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function LedgerTreatment() {
  const stats = [...keyStats, ...detailStats];
  return (
    <TreatmentShell kicker="Treatment A" title="Ledger card">
      <div className="overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
        {chunk(stats, 3).map((row, rowIndex) => (
          <div key={rowIndex} className="grid border-b border-[var(--border)] last:border-b-0 md:grid-cols-3">
            {row.map((stat, statIndex) => (
              <div
                key={stat.label}
                className={`min-h-16 px-4 py-4 ${statIndex < row.length - 1 ? "border-r border-[var(--border)]" : ""}`}
              >
                <StatCell stat={stat} quiet />
              </div>
            ))}
          </div>
        ))}
      </div>
    </TreatmentShell>
  );
}

function FlatMatrixTreatment() {
  return (
    <TreatmentShell kicker="Treatment B" title="Trade Review baseline">
      <div className="space-y-6">
        <StatsTable rows={tradeReviewRows} />
        <StatsTable rows={sizingRows} />
      </div>
    </TreatmentShell>
  );
}

function StatsTable({ rows }: { rows: MockStat[][] }) {
  return (
    <div className="overflow-hidden rounded-[6px] bg-[#1a2432] ring-1 ring-[var(--border)]">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid border-b border-[var(--border)] last:border-b-0 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, statIndex) => row[statIndex]).map((stat, statIndex) => (
            <div
              key={stat?.label ?? `empty-${rowIndex}-${statIndex}`}
              className={`flex min-h-16 items-center px-4 py-4 ${
                statIndex < 2 ? "md:border-r md:border-[var(--border)]" : ""
              }`}
            >
              {stat && <StatCell stat={stat} quiet table />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function HybridTreatment() {
  return (
    <TreatmentShell kicker="Treatment C" title="Paired diagnostic scan">
      <div className="grid gap-[2px] overflow-hidden rounded bg-black p-[2px]">
        {pairedStatGroups.map((group, groupIndex) => (
          <PairedStatGroup
            key={groupIndex}
            rows={group}
          />
        ))}
      </div>
    </TreatmentShell>
  );
}

function PairedStatGroup({ rows }: { rows: MockStat[][] }) {
  return (
    <div className="grid gap-[2px]">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-[2px] md:grid-cols-2"
        >
          {row.map((stat) => (
            <div
              key={stat.label}
              className="flex min-h-14 items-center bg-[#1a2432] px-12 py-3"
            >
              <StatCell stat={stat} compact />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ReportsStatsMockPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-16">
      <div className="border-b border-[var(--hairline)] pb-6">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">Reports</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Stats treatments</h1>
      </div>

      <LedgerTreatment />
      <FlatMatrixTreatment />
      <HybridTreatment />
    </div>
  );
}
