// Canvas assembly for the Trading Journal visual exploration.
const { DesignCanvas, DCSection, DCArtboard } = window;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="foundations" title="Foundations" subtitle="Refined type scale, muted P&L palette & typefaces — shared across all directions">
        <DCArtboard id="found" label="System" width={900} height={1040}>
          <window.FoundationsBoard />
        </DCArtboard>
      </DCSection>

      <DCSection id="hybrid" title="D · Hybrid — where we're heading" subtitle="Editorial layout (spine, prose, the day stat line you liked) rebuilt in sans, with Ledger's green/red edge, aligned figures, weekly bars & metric strip">
        <DCArtboard id="hy-week" label="Week view" width={880} height={2690}>
          <window.HybridWeek />
        </DCArtboard>
        <DCArtboard id="hy-day" label="Day view" width={760} height={895}>
          <window.HybridDay />
        </DCArtboard>
      </DCSection>

      <DCSection id="editorial" title="A · Editorial Journal" subtitle="Literary — Newsreader serif dates, a margin spine, prose-weight notes, stats demoted to one quiet line">
        <DCArtboard id="ed-week" label="Week view" width={880} height={2030}>
          <window.EditorialWeek />
        </DCArtboard>
        <DCArtboard id="ed-day" label="Day view" width={760} height={895}>
          <window.EditorialDay />
        </DCArtboard>
      </DCSection>

      <DCSection id="ledger" title="B · Ledger / Terminal" subtitle="Dense & data-forward — monospaced figures, green/red day-edge, aligned ticker ledger, weekly P&L bars">
        <DCArtboard id="led-week" label="Week view" width={900} height={1815}>
          <window.LedgerWeek />
        </DCArtboard>
        <DCArtboard id="led-day" label="Day view" width={820} height={655}>
          <window.LedgerDay />
        </DCArtboard>
      </DCSection>

      <DCSection id="calm" title="C · Calm Fintech — recommended" subtitle="Balanced & premium — open month/week sections holding elevated day cards, a P&L pill for instant red/green scan">
        <DCArtboard id="calm-week" label="Week view" width={860} height={2350}>
          <window.CalmWeek />
        </DCArtboard>
        <DCArtboard id="calm-day" label="Day view" width={760} height={855}>
          <window.CalmDay />
        </DCArtboard>
        <DCArtboard id="calm-month" label="Month view — full nesting" width={880} height={1560}>
          <window.CalmMonth />
        </DCArtboard>
      </DCSection>

      <DCSection id="light" title="C · Light mode" subtitle="The same system in the light theme — verifying contrast and the muted palette both ways">
        <DCArtboard id="calm-week-l" label="Week view · light" width={860} height={2350}>
          <window.CalmWeek theme="tj-light" />
        </DCArtboard>
        <DCArtboard id="calm-month-l" label="Month view · light" width={880} height={1560}>
          <window.CalmMonth theme="tj-light" />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
