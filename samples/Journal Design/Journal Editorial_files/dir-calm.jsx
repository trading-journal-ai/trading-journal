// Direction C — "Calm Fintech" (lead direction)
// Balanced and premium: open month/week sections containing elevated day
// cards, a P&L pill for instant red/green scan, metric chips, hero notes,
// and tinted flag sub-cards. Exports CalmWeek, CalmDay, CalmMonth.

function PnlPill({ value, big }) {
  const up = value > 0, flat = value === 0;
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: big ? 16 : 13, fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
      color: flat ? 'var(--muted)' : up ? 'var(--g)' : 'var(--r)',
      background: flat ? 'var(--surface-2)' : up ? 'var(--g-bg)' : 'var(--r-bg)',
      borderRadius: 100, padding: big ? '6px 14px' : '3.5px 11px', whiteSpace: 'nowrap',
    }}>{window.moneySigned(value)}</span>
  );
}

function MetricChips({ d, big }) {
  const fs = big ? 13 : 12;
  const cell = (label, val) => (
    <span style={{ fontFamily: 'var(--sans)', fontSize: fs, color: 'var(--muted)' }}>
      <span style={{ fontFamily: 'var(--mono)', color: 'var(--body)', fontVariantNumeric: 'tabular-nums' }}>{val}</span> {label}
    </span>
  );
  const dot = <span style={{ color: 'var(--faint)' }}>·</span>;
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'center', flexWrap: 'wrap' }}>
      {cell('trades', d.trades.length)}{dot}
      {cell('win', window.pct(d.accuracy))}{dot}
      {cell('PF', d.profitFactor.toFixed(2))}
    </div>
  );
}

function CalmTag({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--sans)', fontSize: 11.5, fontWeight: 500, color: 'var(--body)',
      background: 'var(--surface-2)', borderRadius: 6, padding: '3px 9px', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function FlagBadge({ flag }) {
  const tone = window.FLAG_TONE[flag] || 'n';
  const color = tone === 'g' ? 'var(--g)' : tone === 'r' ? 'var(--r)' : 'var(--muted)';
  const bg = tone === 'g' ? 'var(--g-bg)' : tone === 'r' ? 'var(--r-bg)' : 'var(--surface-2)';
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase',
      fontWeight: 500, color, background: bg, borderRadius: 5, padding: '3px 7px', whiteSpace: 'nowrap',
    }}>{flag}</span>
  );
}

function TickerGrid({ trades }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 26, rowGap: 6 }}>
      {trades.map((t) => (
        <div key={t.s} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)' }}>{t.s}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: window.pnlVar(t.p), fontVariantNumeric: 'tabular-nums' }}>{window.moneySigned(t.p)}</span>
        </div>
      ))}
    </div>
  );
}

function CalmTradeNote({ n, big }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: big ? '14px 16px' : '12px 14px', marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: big ? 15 : 13.5, fontWeight: 600, color: 'var(--ink)' }}>{n.s}</span>
        <FlagBadge flag={n.flag} />
        <span style={{ flex: 1 }} />
        <a style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>View trade &rarr;</a>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: big ? 14.5 : 13.5, lineHeight: 1.62, color: 'var(--body)' }}>{n.text}</p>
    </div>
  );
}

function CalmDayCard({ d }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 19, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{d.weekday}</h3>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--muted)' }}>{d.date}</span>
          </div>
          <div style={{ marginTop: 7 }}><MetricChips d={d} /></div>
        </div>
        <PnlPill value={d.pnl} />
      </div>
      <p style={{ margin: '15px 0 0', fontFamily: 'var(--sans)', fontSize: 15.5, lineHeight: 1.68, color: 'var(--body)' }}>{d.note}</p>
      <div style={{ display: 'flex', gap: 7, marginTop: 13, flexWrap: 'wrap' }}>
        {d.tags.map((t) => <CalmTag key={t}>{t}</CalmTag>)}
      </div>
      {d.notes.map((n) => <CalmTradeNote key={n.s} n={n} />)}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
        <TickerGrid trades={d.trades} />
      </div>
    </div>
  );
}

function WeekBadge({ num }) {
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)',
      background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
      width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>{String(num).padStart(2, '0')}</span>
  );
}

function CalmWeek({ theme = 'tj-dark' }) {
  const w = window.WEEK;
  return (
    <div className={`tj ${theme}`} style={{ background: 'var(--bg)', padding: '46px 50px 52px', color: 'var(--body)' }}>
      <div className="tj-eyebrow" style={{ marginBottom: 14 }}>Journal &nbsp;·&nbsp; Weekly Review</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <WeekBadge num={w.num} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{w.label}</h1>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--muted)' }}>{w.range}</span>
        </div>
        <span style={{ flex: 1 }} />
        <PnlPill value={w.pnl} big />
      </div>
      <p style={{ margin: '16px 0 0', maxWidth: '70ch', fontFamily: 'var(--sans)', fontSize: 15.5, lineHeight: 1.68, color: 'var(--body)' }}>{w.recap}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 26 }}>
        {w.days.map((d) => <CalmDayCard key={d.iso} d={d} />)}
      </div>
    </div>
  );
}

function CalmDay({ theme = 'tj-dark' }) {
  const d = window.WEEK.days[3];
  return (
    <div className={`tj ${theme}`} style={{ background: 'var(--bg)', padding: '46px 52px 52px', color: 'var(--body)' }}>
      <div className="tj-eyebrow" style={{ marginBottom: 16 }}>&larr; &nbsp;Week 2 &nbsp;·&nbsp; Daily Review</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.05 }}>{d.weekday}</h1>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 17, color: 'var(--muted)', marginTop: 4 }}>{d.date}, 2026</div>
        </div>
        <PnlPill value={d.pnl} big />
      </div>
      <div style={{ marginTop: 16 }}><MetricChips d={d} big /></div>

      <p style={{ margin: '22px 0 0', maxWidth: '58ch', fontFamily: 'var(--sans)', fontSize: 18, lineHeight: 1.74, color: 'var(--body)' }}>{d.note}</p>
      <div style={{ display: 'flex', gap: 7, marginTop: 16, flexWrap: 'wrap' }}>
        {d.tags.map((t) => <CalmTag key={t}>{t}</CalmTag>)}
      </div>

      <div style={{ marginTop: 30, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
        <div className="tj-eyebrow" style={{ marginBottom: 12 }}>Trades &nbsp;·&nbsp; {d.trades.length}</div>
        <TickerGrid trades={d.trades} />
      </div>

      <div className="tj-eyebrow" style={{ margin: '28px 0 2px' }}>Flagged for review</div>
      {d.notes.map((n) => <CalmTradeNote key={n.s} n={n} big />)}
    </div>
  );
}

function CalmMonthDayRow({ d }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '128px 1fr auto', gap: 20, alignItems: 'baseline', padding: '13px 0', borderTop: '1px solid var(--hair)' }}>
      <div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{d.weekday}</div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>{d.date}</div>
      </div>
      <div>
        <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 13.5, lineHeight: 1.55, color: 'var(--body)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.preview}</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
          {d.tags.slice(0, 2).map((t) => <CalmTag key={t}>{t}</CalmTag>)}
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--faint)', alignSelf: 'center' }}>{d.count} trades</span>
        </div>
      </div>
      <PnlPill value={d.pnl} />
    </div>
  );
}

function CalmMonth({ theme = 'tj-dark' }) {
  const m = window.MONTH;
  return (
    <div className={`tj ${theme}`} style={{ background: 'var(--bg)', padding: '48px 52px 54px', color: 'var(--body)' }}>
      <div className="tj-eyebrow" style={{ marginBottom: 14 }}>Journal &nbsp;·&nbsp; Month Review</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 38, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--ink)', lineHeight: 1 }}>{m.label}</h1>
        <PnlPill value={m.pnl} big />
      </div>
      <p style={{ margin: '18px 0 0', maxWidth: '72ch', fontFamily: 'var(--sans)', fontSize: 16, lineHeight: 1.7, color: 'var(--body)' }}>{m.recap}</p>
      <div style={{ display: 'flex', gap: 26, marginTop: 18 }}>
        {[['Trades', m.trades], ['Accuracy', window.pct(m.accuracy)], ['Profit factor', m.profitFactor.toFixed(2)]].map((r) => (
          <div key={r[0]}>
            <div className="tj-eyebrow" style={{ fontSize: 9.5 }}>{r[0]}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 17, color: 'var(--ink)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{r[1]}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '30px 0 4px' }} />

      {m.weeks.map((w) => (
        <section key={w.num} style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <WeekBadge num={w.num} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 20, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{w.label}</h2>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--muted)' }}>{w.range}</span>
            </div>
            <span style={{ flex: 1 }} />
            <PnlPill value={w.pnl} />
          </div>
          <p style={{ margin: '11px 0 6px', maxWidth: '70ch', fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.6, color: 'var(--muted)' }}>{w.recap}</p>
          <div style={{ marginTop: 8 }}>
            {w.days.map((d) => <CalmMonthDayRow key={d.iso} d={d} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

Object.assign(window, { CalmWeek, CalmDay, CalmMonth });
