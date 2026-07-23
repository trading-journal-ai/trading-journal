"use client";

import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Dot from "@/components/ui/Dot";
import Eyebrow from "@/components/ui/Eyebrow";
import MetricStrip from "@/components/ui/MetricStrip";
import Money from "@/components/ui/Money";
import SegmentedControl from "@/components/ui/SegmentedControl";
import StatBlock from "@/components/ui/StatBlock";
import ThemeSettings from "@/components/ThemeSettings";
import { ALL_TOKEN_NAMES, TOKEN_GROUPS, TYPE_ROLES } from "@/lib/designSystem";

/** Read the live computed value of every token, re-reading whenever the theme changes. */
function useLiveTokenValues() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const name of ALL_TOKEN_NAMES) next[name] = cs.getPropertyValue(name).trim();
      setValues(next);
      setHydrated(true);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return { values, hydrated };
}

function Section({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--border)] py-12">
      <header className="mb-8 max-w-2xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-3 text-[25px] font-semibold leading-8 tracking-[-0.02em] text-[var(--foreground)]">{title}</h2>
        <p className="mt-3 text-[14px] leading-6 text-[var(--body)]">{description}</p>
      </header>
      {children}
    </section>
  );
}

function TokenSwatch({ name, use, value, hydrated }: { name: string; use: string; value: string | undefined; hydrated: boolean }) {
  const isTint = name.includes("tint") || name === "--hairline" || name === "--review-helper-bg";
  return (
    <div className="flex items-center gap-3 rounded-[7px] border border-[var(--hairline)] p-2.5">
      <span
        className="h-10 w-10 shrink-0 rounded-[5px] border border-[var(--hairline)]"
        style={{
          background: isTint
            ? `repeating-conic-gradient(var(--surface-2) 0% 25%, var(--surface) 0% 50%) 50% / 10px 10px`
            : undefined,
        }}
      >
        <span className="block h-full w-full rounded-[4px]" style={{ background: `var(${name})` }} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-mono text-[11.5px] font-semibold text-[var(--foreground)]">{name}</p>
        <p className="truncate font-mono text-[10px] tabular-nums text-[var(--muted)]">{hydrated ? value || "—" : "…"}</p>
        <p className="truncate text-[11px] leading-4 text-[var(--faint)]">{use}</p>
      </div>
    </div>
  );
}

function Swatches() {
  const { values, hydrated } = useLiveTokenValues();
  return (
    <div className="grid gap-8">
      {TOKEN_GROUPS.map((group) => (
        <div key={group.label}>
          <Eyebrow>{group.label}</Eyebrow>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {group.tokens.map((t) => (
              <TokenSwatch key={t.name} name={t.name} use={t.use} value={values[t.name]} hydrated={hydrated} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TypeScale() {
  return (
    <div className="grid gap-6">
      {TYPE_ROLES.map((r) => (
        <div key={r.role} className="grid gap-2 border-b border-[var(--hairline)] pb-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
          <div className="pt-1">
            <p className="text-[13px] font-semibold text-[var(--foreground)]">{r.role}</p>
            <p className="mt-1 font-mono text-[10.5px] text-[var(--muted)]">
              {r.px}px · {r.weight} · {r.family}
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-[var(--faint)]">{r.use}</p>
          </div>
          <p
            className="min-w-0 text-[var(--foreground)]"
            style={{
              fontSize: `${r.px}px`,
              lineHeight: r.leading,
              fontWeight: r.weight,
              fontFamily: r.family === "mono" ? "var(--font-mono)" : "var(--font-sans)",
              letterSpacing: r.tracking,
              textTransform: r.upper ? "uppercase" : undefined,
              color: r.family === "mono" ? "var(--body)" : undefined,
            }}
          >
            {r.sample}
          </p>
        </div>
      ))}
    </div>
  );
}

function Components() {
  const [period, setPeriod] = useState("today");
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Buttons */}
      <div className="rounded-[8px] border border-[var(--hairline)] p-5">
        <Eyebrow>Buttons</Eyebrow>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="action">Save</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary">Primary</Button>
        </div>
        <p className="mt-4 text-[11px] leading-5 text-[var(--faint)]">Controls use fills, not borders. Reserve --border for cards.</p>
      </div>

      {/* Segmented control */}
      <div className="rounded-[8px] border border-[var(--hairline)] p-5">
        <Eyebrow>Segmented control</Eyebrow>
        <div className="mt-4">
          <SegmentedControl
            aria-label="Period"
            value={period}
            onChange={setPeriod}
            options={[
              { label: "Today", value: "today" },
              { label: "Week", value: "week" },
              { label: "Month", value: "month" },
            ]}
          />
        </div>
        <p className="mt-4 text-[11px] leading-5 text-[var(--faint)]">One control for every peer-view choice — click to try it.</p>
      </div>

      {/* Money + dots */}
      <div className="rounded-[8px] border border-[var(--hairline)] p-5">
        <Eyebrow>Money & valence</Eyebrow>
        <div className="mt-4 flex flex-wrap items-center gap-5 text-[15px]">
          <Money value={1284} />
          <Money value={-412} />
          <Money value={0} />
          <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--body)]"><Dot tone="positive" /> Win</span>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--body)]"><Dot tone="negative" /> Loss</span>
        </div>
      </div>

      {/* Stat blocks */}
      <div className="rounded-[8px] border border-[var(--hairline)] p-5">
        <Eyebrow>Stat blocks</Eyebrow>
        <div className="mt-4 grid grid-cols-3 gap-5">
          <StatBlock label="Win rate">64%</StatBlock>
          <StatBlock label="Profit factor">2.1</StatBlock>
          <StatBlock label="Net P&L"><Money value={1284} /></StatBlock>
        </div>
      </div>

      {/* Metric strip */}
      <div className="rounded-[8px] border border-[var(--hairline)] p-5">
        <Eyebrow>Metric strip</Eyebrow>
        <div className="mt-4">
          <MetricStrip items={["14 trades", "64% win", "PF 2.1", <Money key="pnl" value={1284} />]} />
        </div>
        <p className="mt-4 text-[11px] leading-5 text-[var(--faint)]">Theme-controlled via --font-metric: mono on dark/light, sans on daylight/evening. Switch themes above to compare.</p>
      </div>

      {/* Tags */}
      <div className="rounded-[8px] border border-[var(--hairline)] p-5">
        <Eyebrow>Tags / pills</Eyebrow>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[["Disciplined", "--green"], ["Chased", "--red"], ["Planned", "--muted"]].map(([label, color]) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 font-mono text-[11px]" style={{ background: "var(--surface-2)", color: "var(--body)" }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: `var(${color})` }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Coach voice */}
      <div className="rounded-[8px] border border-[var(--hairline)] p-5">
        <Eyebrow>Coach voice</Eyebrow>
        <div className="mt-4 border-l-2 pl-3" style={{ borderColor: "var(--coach)" }}>
          <Eyebrow tone="coach">Session verdict</Eyebrow>
          <p className="mt-1.5 text-[13px] leading-6 text-[var(--body)]">Clean session — you leaned into the highest-quality mover.</p>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-[var(--faint)]">Coach = green eyebrow + left rule. Trader annotations use --accent.</p>
      </div>

      {/* Ledger row */}
      <div className="rounded-[8px] border border-[var(--hairline)] p-5">
        <Eyebrow>Ledger row</Eyebrow>
        <div className="mt-4">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t py-2 font-mono text-[13px]" style={{ borderColor: "var(--hairline)" }}>
            <span className="text-[var(--body)]">AGPU</span>
            <span className="tabular-nums text-[var(--muted)]">3 trades</span>
            <Money value={412} />
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t py-2 font-mono text-[13px]" style={{ borderColor: "var(--hairline)" }}>
            <span className="text-[var(--body)]">OCC</span>
            <span className="tabular-nums text-[var(--muted)]">1 trade</span>
            <Money value={-96} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesignSystemBrowser() {
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 mb-2 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--hairline)] bg-[color-mix(in_srgb,var(--background)_90%,transparent)] px-1 py-3 backdrop-blur">
        <p className="font-mono text-[11px] text-[var(--muted)]">
          Live from <span className="text-[var(--body)]">globals.css</span> — values reflect the active theme.
        </p>
        <ThemeSettings />
      </div>

      <Section eyebrow="Foundations" title="Color tokens" description="Semantic tokens read live from the running app. Code owns the values; this page just reflects them. Switch themes above to see each remap.">
        <Swatches />
      </Section>

      <Section eyebrow="Foundations" title="Type scale" description="Named type roles rendered as live specimens in Geist Sans / Mono. Use roles, not one-off sizes.">
        <TypeScale />
      </Section>

      <Section eyebrow="Components" title="Primitives & components" description="The reusable building blocks, rendered with the real tokens so they track the active theme.">
        <Components />
      </Section>
    </div>
  );
}
