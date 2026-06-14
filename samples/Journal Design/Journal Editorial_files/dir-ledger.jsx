// Direction B — "Ledger / Terminal"
// Dense and data-forward: monospaced figures, a green/red status edge on
// each day, an aligned per-ticker ledger rail, and a weekly P&L bar strip.
// Exports LedgerWeek, LedgerDay.

function LedTag({ children, tone = 'n' }) {
  const c = tone === 'g' ? 'var(--g)' : tone === 'r' ? 'var(--r)' : 'var(--muted)';
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase',
      color: c, border: '1px solid var(--border)', borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function WeekBars({ days }) {
  const max = Math.max(...days.map((d) => Math.abs(d.pnl)));
  const H = 30;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {days.map((d) => {
        const h = Math.max(2, (Math.abs(d.pnl) / max) * H);
        const up = d.pnl >= 0;
        return (
          <div key={d.iso} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 26 }}>
            <div style={{ height: H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {up && <div style={{ width: 16, height: h, background: 'var(--g)', opacity: 0.85, borderRadius: '2px 2px 0 0' }} />}
            </div>
            <div style={{ height: 1, width: 22, background: 'var(--border)' }} />
            <div style={{ height: H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              {!up && <div style={{ width: 16, height: h, background: 'var(--r)', opacity: 0.85, borderRadius: '0 0 2px 2px' }} />}
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--faint)', marginTop: 3 }}>{d.weekday[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

function MetricStrip({ items }) {
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ padding: '0 16px', borderLeft: i ? '1px solid var(--hair)' : 'none' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.12em', color: 'var(--muted)', textTransform: 'uppercase' }}>{it.label}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontVariantNumeric: 'tabular-nums', color: it.color || 'var(--ink)', marginTop: 3, whiteSpace: 'nowrap', lineHeight: 1.1 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function LedgerRail({ d }) {
  return (
    <aside>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 5, marginBottom: 6 }}>
        <span className="tj-eyebrow" style={{ fontSize: 9.5 }}>Sym</span>
        <span className="tj-eyebrow" style={{ fontSize: 9.5 }}>P&L</span>
      </div>
      <div>
        {d.trades.map((t) => (
          <div key={t.s} style={{ display: 'flex', justifyContent: 'space-between', padding: '3.5px 0', borderBottom: '1px solid var(--hair)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--body)' }}>{t.s}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: window.pnlVar(t.p), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{window.moneySigned(t.p)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        {[['Acc', window.pct(d.accuracy), 'var(--body)'], ['PF', d.profitFactor.toFixed(2), 'var(--body)'], ['P&L', window.moneySigned(d.pnl), window.pnlVar(d.pnl)]].map((r) => (
          <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{r[0]}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: r[2], fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r[1]}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function LedTradeNote({ n }) {
  const tone = window.FLAG_TONE[n.flag] || 'n';
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 12px', marginTop: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{n.s}</span>
        <LedTag tone={tone}>{n.flag}</LedTag>
        <span style={{ flex: 1 }} />
        <a style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--accent)', textDecoration: 'none' }}>view &rarr;</a>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 12.5, lineHeight: 1.55, color: 'var(--body)' }}>{n.text}</p>
    </div>
  );
}

function LedgerDayRow({ d }) {
  const up = d.pnl >= 0;
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 144px', gap: 28, paddingLeft: 18, paddingTop: 16, paddingBottom: 18, borderTop: '1px solid var(--hair)' }}>
      <div style={{ position: 'absolute', left: 0, top: 16, bottom: 18, width: 3, borderRadius: 3, background: up ? 'var(--g-edge)' : 'var(--r-edge)' }} />
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{d.weekday}</h3>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)' }}>{d.iso}</span>
        </div>
        <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 13.5, lineHeight: 1.58, color: 'var(--body)' }}>{d.note}</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {d.tags.map((t) => <LedTag key={t} tone={window.FLAG_TONE[t] || 'n'}>{t}</LedTag>)}
        </div>
        {d.notes.map((n) => <LedTradeNote key={n.s} n={n} />)}
      </div>
      <LedgerRail d={d} />
    </div>
  );
}

function LedgerWeek({ theme = 'tj-dark' }) {
  const w = window.WEEK;
  return (
    <div className={`tj ${theme}`} style={{ background: 'var(--bg)', padding: '46px 50px 50px', color: 'var(--body)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
        <div>
          <div className="tj-eyebrow" style={{ marginBottom: 10 }}>Journal / WK {String(w.num).padStart(2, '0')} / Jun 08–12</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{w.label}</h1>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--muted)' }}>{w.range}</span>
          </div>
        </div>
        <WeekBars days={w.days} />
      </div>

      <div style={{ marginTop: 18, padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <MetricStrip items={[
          { label: 'Net P&L', value: window.moneySigned(w.pnl), color: window.pnlVar(w.pnl) },
          { label: 'Trades', value: w.trades },
          { label: 'Accuracy', value: window.pct(w.accuracy) },
          { label: 'Profit factor', value: w.profitFactor.toFixed(2) },
        ]} />
      </div>

      <p style={{ margin: '16px 0 6px', maxWidth: '74ch', fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.6, color: 'var(--body)' }}>{w.recap}</p>

      <div style={{ marginTop: 12 }}>
        {w.days.map((d) => <LedgerDayRow key={d.iso} d={d} />)}
      </div>
    </div>
  );
}

function LedgerDay({ theme = 'tj-dark' }) {
  const d = window.WEEK.days[3];
  const up = d.pnl >= 0;
  return (
    <div className={`tj ${theme}`} style={{ background: 'var(--bg)', padding: '46px 50px 50px', color: 'var(--body)' }}>
      <div className="tj-eyebrow" style={{ marginBottom: 14 }}>Journal / WK 02 / Day</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 4, height: 30, borderRadius: 4, background: up ? 'var(--g-edge)' : 'var(--r-edge)' }} />
        <h1 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{d.weekday}</h1>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--muted)' }}>{d.iso}</span>
      </div>

      <div style={{ padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <MetricStrip items={[
          { label: 'Net P&L', value: window.moneySigned(d.pnl), color: window.pnlVar(d.pnl) },
          { label: 'Trades', value: d.trades.length },
          { label: 'Accuracy', value: window.pct(d.accuracy) },
          { label: 'Profit factor', value: d.profitFactor.toFixed(2) },
        ]} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 152px', gap: 32, marginTop: 22 }}>
        <div>
          <div className="tj-eyebrow" style={{ marginBottom: 10 }}>Daily review</div>
          <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 15, lineHeight: 1.66, color: 'var(--body)' }}>{d.note}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {d.tags.map((t) => <LedTag key={t} tone={window.FLAG_TONE[t] || 'n'}>{t}</LedTag>)}
          </div>
          <div className="tj-eyebrow" style={{ margin: '26px 0 4px' }}>Flagged</div>
          {d.notes.map((n) => <LedTradeNote key={n.s} n={n} />)}
        </div>
        <div>
          <div className="tj-eyebrow" style={{ marginBottom: 8 }}>Ledger</div>
          <LedgerRail d={d} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LedgerWeek, LedgerDay });
