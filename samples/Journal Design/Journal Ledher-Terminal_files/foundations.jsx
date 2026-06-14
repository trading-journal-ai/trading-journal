// Foundations board — makes the refined type scale, token palette, and the
// hierarchy logic explicit. Exports FoundationsBoard.

function TypeRow({ sample, style, spec }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, padding: '11px 0', borderTop: '1px solid var(--hair)' }}>
      <div style={{ whiteSpace: 'nowrap', ...style }}>{sample}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', textAlign: 'right' }}>{spec}</div>
    </div>
  );
}

function Swatch({ name, varName, hex }) {
  return (
    <div style={{ width: 96 }}>
      <div style={{ height: 52, borderRadius: 8, background: `var(${varName})`, border: '1px solid var(--hair)' }} />
      <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink)', marginTop: 7, fontWeight: 500 }}>{name}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--muted)', marginTop: 1 }}>{hex}</div>
    </div>
  );
}

function FoundationsBoard({ theme = 'tj-dark' }) {
  return (
    <div className={`tj ${theme}`} style={{ background: 'var(--bg)', padding: '48px 52px 54px', color: 'var(--body)' }}>
      <div className="tj-eyebrow" style={{ marginBottom: 12 }}>Design System</div>
      <h1 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Hierarchy &amp; type scale</h1>
      <p style={{ margin: '12px 0 0', maxWidth: '64ch', fontFamily: 'var(--sans)', fontSize: 15, lineHeight: 1.65, color: 'var(--body)' }}>
        Four distinct levels so the Month&nbsp;&rarr;&nbsp;Week&nbsp;&rarr;&nbsp;Day&nbsp;&rarr;&nbsp;Trade nesting reads at a glance. Notes are promoted to reading-weight prose; figures sit in tabular mono; labels in a small uppercase mono eyebrow.
      </p>

      <div className="tj-eyebrow" style={{ margin: '34px 0 2px' }}>Type scale</div>
      <TypeRow sample="Eyebrow / label" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)' }} spec="Geist Mono · 10.5 · +0.16em" />
      <TypeRow sample="June 2026" style={{ fontFamily: 'var(--sans)', fontSize: 38, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--ink)' }} spec="L1 Month · Hanken 38 / 600" />
      <TypeRow sample="Week 2" style={{ fontFamily: 'var(--sans)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }} spec="L2 Week · Hanken 26 / 600" />
      <TypeRow sample="Thursday" style={{ fontFamily: 'var(--sans)', fontSize: 19, fontWeight: 600, color: 'var(--ink)' }} spec="L3 Day · Hanken 19 / 600" />
      <TypeRow sample="GLXG" style={{ fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }} spec="L4 Trade · Hanken 15 / 600" />
      <TypeRow sample="The daily note reads like written prose, not a placeholder." style={{ fontFamily: 'var(--sans)', fontSize: 15.5, lineHeight: 1.6, color: 'var(--body)', maxWidth: '46ch', whiteSpace: 'normal' }} spec="Body · Hanken 15.5 / 1.7" />
      <TypeRow sample={"\u2212$287.26"} style={{ fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--r)', fontVariantNumeric: 'tabular-nums' }} spec="Figures · Geist Mono · tabular" />

      <div className="tj-eyebrow" style={{ margin: '36px 0 14px' }}>Palette &nbsp;·&nbsp; muted P&amp;L</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Swatch name="Background" varName="--bg" hex="base canvas" />
        <Swatch name="Surface" varName="--surface" hex="day card" />
        <Swatch name="Border" varName="--border" hex="hairline" />
        <Swatch name="Ink" varName="--ink" hex="headings" />
        <Swatch name="Body" varName="--body" hex="prose" />
        <Swatch name="Muted" varName="--muted" hex="meta" />
        <Swatch name="Profit" varName="--g" hex="oklch muted" />
        <Swatch name="Loss" varName="--r" hex="oklch muted" />
      </div>

      <div className="tj-eyebrow" style={{ margin: '36px 0 14px' }}>Typefaces</div>
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 26, color: 'var(--ink)', fontWeight: 600 }}>Hanken Grotesk</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Humanist sans · UI &amp; prose</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink)', fontWeight: 500 }}>Newsreader</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Humanist serif · editorial dates</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 24, color: 'var(--ink)' }}>Geist Mono</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Tabular figures · from your stack</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FoundationsBoard });
