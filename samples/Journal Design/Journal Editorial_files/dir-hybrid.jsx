// Direction D — "Hybrid" (the synthesis, v2)
// Editorial layout — quiet spine + green/red day DOT, prose-first notes, the
// day stat line — in Hanken Grotesk (no serif). Ledger elements pulled in:
// weekly P&L bars + metric strip in the masthead, and a NEW compact trade
// module (best→worst, win/loss bar, "+N more") replacing the horizontal
// ticker run. Exports HybridWeek, HybridDay.

function HxTag({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--sans)', fontSize: 11.5, fontWeight: 500, color: 'var(--muted)',
      border: '1px solid var(--border)', borderRadius: 100, padding: '2.5px 9px', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// The day stat line: "5 trades · 63% win · PF 1.64 · +$42.33"
function HxStatLine({ d, size = 12.5 }) {
  const cell = { fontFamily: 'var(--mono)', fontSize: size, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
  const dot = <span style={{ color: 'var(--faint)', margin: '0 9px' }}>·</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={cell}>{d.trades.length} trades</span>{dot}
      <span style={cell}>{window.pct(d.accuracy)} win</span>{dot}
      <span style={cell}>PF {d.profitFactor.toFixed(2)}</span>{dot}
      <span style={{ ...cell, color: window.pnlVar(d.pnl), fontWeight: 500 }}>{window.moneySigned(d.pnl)}</span>
    </div>
  );
}

// Compact best→worst trade module. Shows top winners + worst losers with the
// middle collapsed, plus a thin win/loss ratio bar. Constrained width so it
// reads as a tidy block, not a full-width table.
function HxTradeModule({ trades, full }) {
  const sorted = [...trades].slice().sort((a, b) => b.p - a.p);
  const wins = trades.filter((t) => t.p > 0).length;
  const losses = trades.filter((t) => t.p < 0).length;
  const topN = full ? 3 : 2;
  const worstN = losses > 0 ? (full ? 2 : 1) : 0;

  let head = sorted, tail = [], mid = [];
  if (sorted.length > topN + worstN + 1) {
    head = sorted.slice(0, topN);
    tail = worstN > 0 ? sorted.slice(sorted.length - worstN) : [];
    mid = sorted.slice(head.length, sorted.length - tail.length);
  }
  const midNet = mid.reduce((s, t) => s + t.p, 0);
  const winPct = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  const Row = ({ t }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'baseline', padding: '4.5px 0' }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--body)' }}>{t.s}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: window.pnlVar(t.p), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{window.moneySigned(t.p)}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 350, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="tj-eyebrow" style={{ fontSize: 9.5 }}>Trades &nbsp;·&nbsp; {trades.length}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--g)' }}>{wins}W</span> &nbsp;<span style={{ color: 'var(--r)' }}>{losses}L</span>
        </span>
      </div>
      {/* win/loss ratio bar */}
      <div style={{ display: 'flex', height: 3, borderRadius: 3, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
        <div style={{ width: `${winPct}%`, background: 'var(--g)', opacity: 0.85, borderRadius: 3 }} />
        <div style={{ width: `${100 - winPct}%`, background: 'var(--r)', opacity: 0.85, borderRadius: 3 }} />
      </div>
      {head.map((t) => <Row key={t.s} t={t} />)}
      {mid.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'baseline', padding: '6px 0', borderTop: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', margin: '3px 0' }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--faint)' }}>+ {mid.length} more</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--faint)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>net {window.moneySigned(midNet)}</span>
        </div>
      )}
      {tail.map((t) => <Row key={t.s} t={t} />)}
    </div>
  );
}

// Ledger element: weekly P&L bars.
function HxWeekBars({ days }) {
  const max = Math.max(...days.map((d) => Math.abs(d.pnl)));
  const H = 28;
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {days.map((d) => {
        const h = Math.max(2, (Math.abs(d.pnl) / max) * H);
        const up = d.pnl >= 0;
        return (
          <div key={d.iso} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
            <div style={{ height: H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {up && <div style={{ width: 15, height: h, background: 'var(--g)', opacity: 0.85, borderRadius: '2px 2px 0 0' }} />}
            </div>
            <div style={{ height: 1, width: 21, background: 'var(--border)' }} />
            <div style={{ height: H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              {!up && <div style={{ width: 15, height: h, background: 'var(--r)', opacity: 0.85, borderRadius: '0 0 2px 2px' }} />}
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--faint)', marginTop: 4 }}>{d.weekday[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

// Ledger element: metric strip.
function HxMetricStrip({ items }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ padding: '9px 18px', borderLeft: i ? '1px solid var(--hair)' : 'none', whiteSpace: 'nowrap' }}>
          <div className="tj-eyebrow" style={{ fontSize: 9.5 }}>{it.label}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontVariantNumeric: 'tabular-nums', color: it.color || 'var(--ink)', marginTop: 4, whiteSpace: 'nowrap', lineHeight: 1.1 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

// Flagged trade note — "View trade" pulled inline beside the symbol/flag.
function HxTradeNote({ n }) {
  const tone = window.FLAG_TONE[n.flag] || 'n';
  const flagColor = tone === 'g' ? 'var(--g)' : tone === 'r' ? 'var(--r)' : 'var(--muted)';
  return (
    <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 18, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>{n.s}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: flagColor }}>{n.flag}</span>
        <a style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>View trade &rarr;</a>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 14.5, lineHeight: 1.6, color: 'var(--prose)' }}>{n.text}</p>
    </div>
  );
}

function HybridWeek({ theme = 'tj-dark' }) {
  const w = window.WEEK;
  return (
    <div className={`tj ${theme}`} style={{ background: 'var(--bg)', padding: '50px 54px 54px', color: 'var(--body)' }}>
      {/* Masthead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="tj-eyebrow" style={{ marginBottom: 12 }}>The Journal &nbsp;·&nbsp; Week {String(w.num).padStart(2, '0')}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1 }}>{w.label}</h1>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{w.range}</span>
          </div>
        </div>
        <HxWeekBars days={w.days} />
      </div>
      <p style={{ margin: '18px 0 0', maxWidth: '64ch', fontFamily: 'var(--sans)', fontSize: 15.5, lineHeight: 1.62, color: 'var(--prose)' }}>{w.recap}</p>
      <div style={{ marginTop: 20 }}>
        <HxMetricStrip items={[
          { label: 'Net P&L', value: window.moneySigned(w.pnl), color: window.pnlVar(w.pnl) },
          { label: 'Trades', value: w.trades },
          { label: 'Accuracy', value: window.pct(w.accuracy) },
          { label: 'Profit factor', value: w.profitFactor.toFixed(2) },
        ]} />
      </div>

      {/* Day spine with quiet hairline + green/red dot */}
      <div style={{ position: 'relative', marginTop: 34 }}>
        <div style={{ position: 'absolute', left: 7, top: 9, bottom: 12, width: 1, background: 'var(--hair)' }} />
        {w.days.map((d) => (
          <div key={d.iso} style={{ position: 'relative', paddingLeft: 38, marginBottom: 36 }}>
            <div style={{ position: 'absolute', left: 3, top: 9, width: 9, height: 9, borderRadius: 9, background: window.pnlVar(d.pnl), boxShadow: '0 0 0 4px var(--bg)' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 11, marginBottom: 7 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 21, fontWeight: 600, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.01em' }}>{d.weekday}</h2>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{d.date}</span>
            </div>
            <HxStatLine d={d} />
            <p style={{ margin: '12px 0 0', maxWidth: '62ch', fontFamily: 'var(--sans)', fontSize: 15.5, lineHeight: 1.62, color: 'var(--prose)' }}>{d.note}</p>
            <div style={{ display: 'flex', gap: 7, marginTop: 13, flexWrap: 'wrap' }}>
              {d.tags.map((t) => <HxTag key={t}>{t}</HxTag>)}
            </div>
            <HxTradeModule trades={d.trades} />
            {d.notes.map((n) => <HxTradeNote key={n.s} n={n} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function HybridDay({ theme = 'tj-dark' }) {
  const d = window.WEEK.days[3];
  return (
    <div className={`tj ${theme}`} style={{ background: 'var(--bg)', padding: '50px 56px 54px', color: 'var(--body)' }}>
      <div className="tj-eyebrow" style={{ marginBottom: 16 }}>&larr; &nbsp;Week 2 &nbsp;·&nbsp; June 8 – 12</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 11, height: 11, borderRadius: 11, background: window.pnlVar(d.pnl) }} />
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 40, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--ink)', lineHeight: 1.04 }}>{d.weekday}</h1>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 17, color: 'var(--muted)', marginTop: 8 }}>{d.date}, 2026</div>
      <div style={{ marginTop: 16 }}><HxStatLine d={d} size={13.5} /></div>

      <p style={{ margin: '22px 0 0', maxWidth: '60ch', fontFamily: 'var(--sans)', fontSize: 17.5, lineHeight: 1.66, color: 'var(--prose)' }}>{d.note}</p>
      <div style={{ display: 'flex', gap: 7, marginTop: 16, flexWrap: 'wrap' }}>
        {d.tags.map((t) => <HxTag key={t}>{t}</HxTag>)}
      </div>

      <div style={{ height: 1, background: 'var(--hair)', margin: '30px 0 0' }} />
      <HxTradeModule trades={d.trades} full />

      <div className="tj-eyebrow" style={{ margin: '30px 0 2px' }}>Flagged for review</div>
      {d.notes.map((n) => <HxTradeNote key={n.s} n={n} />)}
    </div>
  );
}

Object.assign(window, { HybridWeek, HybridDay });
