// Direction A — "Editorial Journal"
// Reads like a written journal: Newsreader serif dates, a margin spine with
// day markers, prose-weight notes, and stats demoted to a single quiet line.
// Exports EditorialWeek, EditorialDay.

function EdTag({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--sans)', fontSize: 11.5, fontWeight: 500, color: 'var(--muted)',
      border: '1px solid var(--border)', borderRadius: 100, padding: '2.5px 9px',
      letterSpacing: '.01em', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function EdStatLine({ d, size = 12 }) {
  const cell = { fontFamily: 'var(--mono)', fontSize: size, color: 'var(--muted)', letterSpacing: '.01em', whiteSpace: 'nowrap' };
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

function TickerRun({ trades }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px', marginTop: 12 }}>
      {trades.map((t) => (
        <span key={t.s} style={{ fontFamily: 'var(--mono)', fontSize: 11.5, whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--muted)' }}>{t.s}</span>{' '}
          <span style={{ color: window.pnlVar(t.p), fontVariantNumeric: 'tabular-nums' }}>{window.moneySigned(t.p)}</span>
        </span>
      ))}
    </div>
  );
}

function EdTradeNote({ n }) {
  const tone = window.FLAG_TONE[n.flag] || 'n';
  const flagColor = tone === 'g' ? 'var(--g)' : tone === 'r' ? 'var(--r)' : 'var(--muted)';
  return (
    <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 18, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 5 }}>
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15.5, color: 'var(--ink)', fontWeight: 500 }}>{n.s}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: flagColor }}>{n.flag}</span>
        <span style={{ flex: 1 }} />
        <a style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>View trade &rarr;</a>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.72, color: 'var(--body)' }}>{n.text}</p>
    </div>
  );
}

function EditorialWeek({ theme = 'tj-dark' }) {
  const w = window.WEEK;
  return (
    <div className={`tj ${theme}`} style={{ background: 'var(--bg)', padding: '52px 54px 56px', color: 'var(--body)' }}>
      {/* Masthead */}
      <div className="tj-eyebrow" style={{ marginBottom: 14 }}>The Journal &nbsp;·&nbsp; Week {String(w.num).padStart(2, '0')}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', lineHeight: 1 }}>{w.label}</h1>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--muted)' }}>{w.range}</span>
      </div>
      <p style={{ margin: '18px 0 0', maxWidth: '64ch', fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.72, color: 'var(--body)' }}>{w.recap}</p>
      <div style={{ display: 'flex', gap: 22, marginTop: 18, alignItems: 'center' }}>
        <EdStatLine d={{ trades: { length: w.trades }, accuracy: w.accuracy, profitFactor: w.profitFactor, pnl: w.pnl }} />
      </div>

      <div style={{ height: 1, background: 'var(--hair)', margin: '30px 0 8px' }} />

      {/* Day spine */}
      <div style={{ position: 'relative', marginTop: 24 }}>
        <div style={{ position: 'absolute', left: 7, top: 8, bottom: 14, width: 1, background: 'var(--hair)' }} />
        {w.days.map((d) => (
          <div key={d.iso} style={{ position: 'relative', paddingLeft: 38, marginBottom: 34 }}>
            <div style={{ position: 'absolute', left: 3, top: 9, width: 9, height: 9, borderRadius: 9, background: window.pnlVar(d.pnl), boxShadow: '0 0 0 4px var(--bg)' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 11, marginBottom: 7 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1 }}>{d.weekday}</h2>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--muted)' }}>{d.date}</span>
            </div>
            <EdStatLine d={d} />
            <p style={{ margin: '12px 0 0', maxWidth: '62ch', fontFamily: 'var(--serif)', fontSize: 16, lineHeight: 1.74, color: 'var(--body)' }}>{d.note}</p>
            <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
              {d.tags.map((t) => <EdTag key={t}>{t}</EdTag>)}
            </div>
            <TickerRun trades={d.trades} />
            {d.notes.map((n) => <EdTradeNote key={n.s} n={n} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorialDay({ theme = 'tj-dark' }) {
  const d = window.WEEK.days[3]; // Thursday — the hard day, richest reflection
  return (
    <div className={`tj ${theme}`} style={{ background: 'var(--bg)', padding: '52px 56px 56px', color: 'var(--body)' }}>
      <div className="tj-eyebrow" style={{ marginBottom: 16 }}>&larr; &nbsp;Week 2 &nbsp;·&nbsp; June 8 – 12</div>
      <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 46, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--ink)', lineHeight: 1.02 }}>
        {d.weekday}
      </h1>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--muted)', marginTop: 4 }}>{d.date}, 2026</div>

      <div style={{ marginTop: 22 }}><EdStatLine d={d} size={13} /></div>

      <p style={{ margin: '26px 0 0', maxWidth: '60ch', fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.8, color: 'var(--body)' }}>{d.note}</p>
      <div style={{ display: 'flex', gap: 7, marginTop: 18, flexWrap: 'wrap' }}>
        {d.tags.map((t) => <EdTag key={t}>{t}</EdTag>)}
      </div>

      <div style={{ height: 1, background: 'var(--hair)', margin: '34px 0 0' }} />

      <div className="tj-eyebrow" style={{ margin: '28px 0 14px' }}>Trades &nbsp;·&nbsp; {d.trades.length}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 40, rowGap: 9 }}>
        {d.trades.map((t) => (
          <div key={t.s} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--hair)', paddingBottom: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--body)' }}>{t.s}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: window.pnlVar(t.p), fontVariantNumeric: 'tabular-nums' }}>{window.moneySigned(t.p)}</span>
          </div>
        ))}
      </div>

      <div className="tj-eyebrow" style={{ margin: '32px 0 4px' }}>Flagged for review</div>
      {d.notes.map((n) => <EdTradeNote key={n.s} n={n} />)}
    </div>
  );
}

Object.assign(window, { EditorialWeek, EditorialDay });
