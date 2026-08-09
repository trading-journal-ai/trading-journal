"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import useDesignLabTheme from "@/components/design-lab/useDesignLabTheme";
import {
  CALENDAR_CANDIDATE_ROLES,
  calendarCandidateErrors,
  parsePaletteInput,
  safeCalendarSelection,
  validCalendarCandidates,
  type CalendarCandidateDrafts,
  type CalendarCandidateRole,
} from "@/lib/calendarDesignLab";
import { colorInputValue } from "@/lib/designLab";
import { THEMES, type Theme } from "@/lib/theme";

const DEFAULT_PALETTE = ["#0f172a", "#1e293b", "#2563eb", "#8792a5", "#e2e8f0"];
const ACCENT_PRESETS = {
  blue: "#0969da",
  amber: "#b06e2a",
  green: "#217a4b",
} as const;

type AccentPreset = "system" | keyof typeof ACCENT_PRESETS | "custom";
type CalendarDensity = "comfortable" | "compact";
type SelectionTreatment = "accent-tint" | "outline";
type PreviewTradeState = "not-traded" | "traded";
type PreviewAuthorization = "authorized" | "disconnected";

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function QuickControl({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-[var(--muted)]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-[var(--muted)]">{label}</p>
      <div className="mt-2 grid grid-flow-col rounded-[7px] bg-[var(--surface-2)] p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`rounded-[5px] px-3 py-2 text-[12px] font-semibold transition-colors ${
              value === option.value
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CandidateField({
  role,
  value,
  edited,
  error,
  onChange,
}: {
  role: (typeof CALENDAR_CANDIDATE_ROLES)[number];
  value: string;
  edited: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = colorInputValue(value);
  return (
    <div className="border-t border-[var(--hairline)] py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-[var(--foreground)]">{role.label}</p>
          <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--faint)]">
            {edited ? "Candidate" : "System"}
          </p>
        </div>
        {edited ? (
          <button type="button" onClick={() => onChange("")} className="font-mono text-[9.5px] font-semibold uppercase text-[var(--accent)]">
            Revert
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="color"
          aria-label={`Pick ${role.label}`}
          value={pickerValue ?? "#000000"}
          disabled={!pickerValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-9 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-0.5 disabled:opacity-30"
        />
        <input
          aria-label={role.label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className="min-w-0 flex-1 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 font-mono text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </div>
      {error ? <p className="mt-1 text-[10.5px] text-[var(--red)]">{error}</p> : null}
    </div>
  );
}

function PaletteLab({
  palette,
  activeRole,
  candidateDrafts,
  onActiveRoleChange,
  onAssign,
  onPaletteChange,
  onClose,
}: {
  palette: string[];
  activeRole: CalendarCandidateRole;
  candidateDrafts: CalendarCandidateDrafts;
  onActiveRoleChange: (role: CalendarCandidateRole) => void;
  onAssign: (color: string) => void;
  onPaletteChange: (palette: string[]) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");

  function applyInput(value: string) {
    setInput(value);
    const parsed = parsePaletteInput(value);
    if (parsed.length > 0) onPaletteChange(parsed);
  }

  return (
    <section className="fixed bottom-4 left-4 right-4 z-[60] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl sm:left-auto sm:w-[340px] lg:right-[388px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">Palette Lab</h2>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--faint)]">Scratch → Candidate</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Palette Lab" className="text-[18px] text-[var(--muted)] hover:text-[var(--foreground)]">
          ×
        </button>
      </div>

      <input
        value={input}
        onChange={(event) => applyInput(event.target.value)}
        placeholder="Paste hex values"
        spellCheck={false}
        className="mt-4 w-full rounded-[7px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-mono text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
      />

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {CALENDAR_CANDIDATE_ROLES.map((role) => (
          <button
            key={role.key}
            type="button"
            onClick={() => onActiveRoleChange(role.key)}
            aria-pressed={activeRole === role.key}
            className={`rounded-[6px] border px-2 py-2 text-[10.5px] font-semibold ${
              activeRole === role.key
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border)] text-[var(--body)] hover:border-[var(--accent)]"
            }`}
          >
            {role.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2" aria-label="Scratch palette">
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Assign ${color} to ${activeRole}`}
            title={`${color} → ${activeRole}`}
            onClick={() => onAssign(color)}
            className="h-11 min-w-0 flex-1 rounded-[7px] border border-[var(--hairline)]"
            style={{ background: color }}
          />
        ))}
      </div>

      <div className="mt-4 border-t border-[var(--hairline)] pt-3">
        {CALENDAR_CANDIDATE_ROLES.map((role) => (
          <div key={role.key} className="flex items-center justify-between gap-3 py-1 text-[10.5px]">
            <span className="flex min-w-0 items-center gap-2 text-[var(--body)]">
              <span className="h-3.5 w-3.5 shrink-0 rounded-[4px] border border-[var(--border)]" style={{ background: candidateDrafts[role.key] ?? "transparent" }} />
              <span className="truncate">{role.label}</span>
            </span>
            <span className="font-mono text-[9.5px] text-[var(--muted)]">{candidateDrafts[role.key] ? "candidate" : "system"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CalendarRouteDesignLab({
  candidateDates,
  children,
}: {
  candidateDates: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    baseTheme,
    drafts: tokenDrafts,
    errors: tokenErrors,
    previewStyle,
    tokenValues,
    changeBaseTheme,
    resetTokens,
    updateToken,
  } = useDesignLabTheme();
  const dates = candidateDates.length > 0 ? candidateDates : ["calendar-preview"];
  const [panelOpen, setPanelOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const [activeRole, setActiveRole] = useState<CalendarCandidateRole>("selectedBg");
  const [candidateDrafts, setCandidateDrafts] = useState<CalendarCandidateDrafts>({});
  const [accentPreset, setAccentPreset] = useState<AccentPreset>("system");
  const [density, setDensity] = useState<CalendarDensity>("comfortable");
  const [dayRail, setDayRail] = useState<"compact" | "off">("compact");
  const [selectionTreatment, setSelectionTreatment] = useState<SelectionTreatment>("accent-tint");
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [tintPct, setTintPct] = useState(8);
  const [chipTint, setChipTint] = useState(14);
  const [previewTradeState, setPreviewTradeState] = useState<PreviewTradeState>("not-traded");
  const [authorization, setAuthorization] = useState<PreviewAuthorization>("authorized");

  const candidateErrors = useMemo(() => calendarCandidateErrors(candidateDrafts), [candidateDrafts]);
  const candidateValues = useMemo(() => validCalendarCandidates(candidateDrafts), [candidateDrafts]);
  const safeSelectedDate = safeCalendarSelection(selectedDate, dates, dates[0]);
  const exitParams = new URLSearchParams(searchParams.toString());
  exitParams.delete("lab");
  const exitHref = `${pathname}${exitParams.size > 0 ? `?${exitParams.toString()}` : ""}`;

  const cardBg = candidateValues.cardBg ?? tokenValues["--surface"] ?? "var(--surface)";
  const hoverBg = candidateValues.hoverBg ?? `color-mix(in srgb, var(--accent) 5%, ${cardBg})`;
  const selectedBg = candidateValues.selectedBg ?? `color-mix(in srgb, var(--accent) ${tintPct}%, ${cardBg})`;
  const chipBg = candidateValues.chipBg ?? `color-mix(in srgb, var(--accent) ${chipTint}%, ${cardBg})`;
  const chipFg = candidateValues.chipFg ?? tokenValues["--muted"] ?? "var(--muted)";
  const routeStyle = {
    ...previewStyle,
    "--lab-calendar-card-bg": cardBg,
    "--lab-calendar-hover-bg": hoverBg,
    "--lab-calendar-selected-bg": selectionTreatment === "outline" ? cardBg : selectedBg,
    "--lab-calendar-chip-bg": chipBg,
    "--lab-calendar-chip-fg": chipFg,
    "--lab-calendar-cell-min-height": density === "compact" ? "7.5rem" : "9rem",
    "--lab-calendar-columns": dayRail === "off" ? "5" : "6",
    "--lab-calendar-selected-shadow": selectionTreatment === "outline" ? "inset 0 0 0 2px var(--accent)" : "none",
  } as CSSProperties & Record<string, string>;

  function updateCandidate(role: CalendarCandidateRole, value: string) {
    setCandidateDrafts((current) => {
      if (!value) {
        const next = { ...current };
        delete next[role];
        return next;
      }
      return { ...current, [role]: value };
    });
  }

  function selectAccent(value: AccentPreset) {
    setAccentPreset(value);
    if (value === "system") updateToken("--accent", "");
    else if (value !== "custom") updateToken("--accent", ACCENT_PRESETS[value]);
  }

  function resetAll() {
    resetTokens();
    setCandidateDrafts({});
    setPalette(DEFAULT_PALETTE);
    setActiveRole("selectedBg");
    setPaletteOpen(false);
    setAccentPreset("system");
    setDensity("comfortable");
    setDayRail("compact");
    setSelectionTreatment("accent-tint");
    setSelectedDate(dates[0]);
    setTintPct(8);
    setChipTint(14);
    setPreviewTradeState("not-traded");
    setAuthorization("authorized");
  }

  const selectedRule = `[data-calendar-lab] [data-calendar-date="${safeSelectedDate}"]`;

  return (
    <div className="relative">
      <style>{`
        [data-calendar-lab] [data-calendar-cell] {
          background: var(--lab-calendar-card-bg);
          min-height: var(--lab-calendar-cell-min-height);
          transition: background-color 140ms ease, box-shadow 140ms ease;
        }
        [data-calendar-lab] [data-calendar-cell]:hover { background: var(--lab-calendar-hover-bg); }
        ${selectedRule} {
          background: var(--lab-calendar-selected-bg);
          box-shadow: var(--lab-calendar-selected-shadow);
        }
        [data-calendar-lab] [data-calendar-chip] {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          background: var(--lab-calendar-chip-bg);
          color: var(--lab-calendar-chip-fg);
          padding: 0.125rem 0.5rem;
        }
        [data-calendar-lab][data-calendar-rail="off"] [data-calendar-week-heading],
        [data-calendar-lab][data-calendar-rail="off"] [data-calendar-week-summary] { display: none; }
      `}</style>

      <div className="sticky top-[65px] z-30 -mx-5 mb-6 overflow-x-auto border-y border-[var(--border)] bg-[var(--background)] px-4 py-2 shadow-sm">
        <div className="flex min-w-max items-center gap-3">
          <QuickControl label="theme">
            <select value={baseTheme} onChange={(event) => changeBaseTheme(event.target.value as Theme)} className="h-8 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] text-[var(--foreground)]">
              {THEMES.map((theme) => <option key={theme} value={theme}>{titleCase(theme)}</option>)}
            </select>
          </QuickControl>
          <QuickControl label="accent">
            <select value={accentPreset} onChange={(event) => selectAccent(event.target.value as AccentPreset)} className="h-8 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] text-[var(--foreground)]">
              <option value="system">System</option>
              <option value="blue">Blue</option>
              <option value="amber">Amber</option>
              <option value="green">Green</option>
              <option value="custom">Custom</option>
            </select>
          </QuickControl>
          <QuickControl label="accentHex">
            <input
              value={tokenDrafts["--accent"] ?? ""}
              placeholder={tokenValues["--accent"] ?? "CSS color"}
              onChange={(event) => { setAccentPreset("custom"); updateToken("--accent", event.target.value); }}
              className="h-8 w-28 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[10.5px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </QuickControl>
          <QuickControl label="dayRail">
            <select value={dayRail} onChange={(event) => setDayRail(event.target.value as "compact" | "off")} className="h-8 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] text-[var(--foreground)]">
              <option value="compact">Compact rail</option>
              <option value="off">Off</option>
            </select>
          </QuickControl>
          {CALENDAR_CANDIDATE_ROLES.slice(0, 5).map((role) => (
            <QuickControl key={role.key} label={role.key}>
              <input
                value={candidateDrafts[role.key] ?? ""}
                placeholder="system"
                onChange={(event) => updateCandidate(role.key, event.target.value)}
                className="h-8 w-24 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[10.5px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </QuickControl>
          ))}
          <QuickControl label="showLab">
            <input
              type="checkbox"
              checked={panelOpen}
              onChange={(event) => {
                setPanelOpen(event.target.checked);
                if (!event.target.checked) setPaletteOpen(false);
              }}
              className="h-5 w-9 accent-[var(--accent)]"
            />
          </QuickControl>
          <QuickControl label="tintPct">
            <input type="range" min="0" max="30" value={tintPct} onChange={(event) => setTintPct(Number(event.target.value))} className="w-20 accent-[var(--accent)]" />
            <span className="font-mono">{tintPct}%</span>
          </QuickControl>
          <QuickControl label="chipTint">
            <input type="range" min="0" max="30" value={chipTint} onChange={(event) => setChipTint(Number(event.target.value))} className="w-20 accent-[var(--accent)]" />
            <span className="font-mono">{chipTint}%</span>
          </QuickControl>
          <Link href={exitHref} className="ml-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Exit Lab</Link>
        </div>
      </div>

      <div style={routeStyle} data-calendar-lab data-calendar-rail={dayRail}>
        <div className="mx-auto mb-4 flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 rounded-[7px] bg-[var(--panel)] px-3 py-2 font-mono text-[10.5px] text-[var(--muted)]">
          <span className="font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Preview state</span>
          <span>{safeSelectedDate}</span>
          <span>{previewTradeState === "traded" ? "Traded" : "Not yet traded"}</span>
          <span>{authorization === "authorized" ? "Authorized" : "Disconnected"}</span>
        </div>
        {children}
      </div>

      {panelOpen ? (
        <aside className="fixed bottom-4 right-4 top-[74px] z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] pb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Calendar Tweaks</h2>
              <p className="mt-1 text-[10.5px] text-[var(--muted)]">System, candidate, and preview-only controls.</p>
            </div>
            <button
              type="button"
              onClick={() => { setPanelOpen(false); setPaletteOpen(false); }}
              aria-label="Close Calendar Tweaks"
              className="text-[20px] text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              ×
            </button>
          </div>

          <section className="border-b border-[var(--hairline)] py-4">
            <p className="text-[12px] font-semibold text-[var(--foreground)]">Theme · System</p>
            <label className="mt-3 block text-[11px] text-[var(--muted)]">
              Base theme
              <select value={baseTheme} onChange={(event) => changeBaseTheme(event.target.value as Theme)} className="mt-1.5 h-10 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--foreground)]">
                {THEMES.map((theme) => <option key={theme} value={theme}>{titleCase(theme)}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-[11px] text-[var(--muted)]">
              Accent
              <input
                value={tokenDrafts["--accent"] ?? ""}
                placeholder={tokenValues["--accent"] ?? "CSS color"}
                onChange={(event) => { setAccentPreset("custom"); updateToken("--accent", event.target.value); }}
                className="mt-1.5 h-10 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 font-mono text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            {tokenErrors["--accent"] ? <p className="mt-1 text-[10.5px] text-[var(--red)]">{tokenErrors["--accent"]}</p> : null}
          </section>

          <section className="border-b border-[var(--hairline)] py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-[var(--foreground)]">Calendar treatment</p>
                <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--faint)]">Candidate roles</p>
              </div>
              <button type="button" onClick={() => setPaletteOpen(true)} className="rounded-[5px] bg-[var(--surface-2)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--body)] hover:text-[var(--foreground)]">Palette Lab</button>
            </div>
            <div className="mt-2">
              {CALENDAR_CANDIDATE_ROLES.map((role) => (
                <CandidateField
                  key={role.key}
                  role={role}
                  value={candidateDrafts[role.key] ?? ({ cardBg, hoverBg, selectedBg, chipBg, chipFg }[role.key])}
                  edited={candidateDrafts[role.key] != null}
                  error={candidateErrors[role.key]}
                  onChange={(value) => updateCandidate(role.key, value)}
                />
              ))}
            </div>
          </section>

          <section className="grid gap-4 border-b border-[var(--hairline)] py-4">
            <p className="text-[12px] font-semibold text-[var(--foreground)]">Component · Calendar</p>
            <SegmentedControl
              label="Density"
              value={density}
              options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]}
              onChange={(value) => setDensity(value as CalendarDensity)}
            />
            <SegmentedControl
              label="Week summary rail"
              value={dayRail}
              options={[{ value: "compact", label: "Compact rail" }, { value: "off", label: "Off" }]}
              onChange={(value) => setDayRail(value as "compact" | "off")}
            />
            <label className="text-[11px] text-[var(--muted)]">
              Selection treatment
              <select value={selectionTreatment} onChange={(event) => setSelectionTreatment(event.target.value as SelectionTreatment)} className="mt-1.5 h-10 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--foreground)]">
                <option value="accent-tint">Accent tint</option>
                <option value="outline">Accent outline</option>
              </select>
            </label>
          </section>

          <section className="grid gap-4 py-4">
            <p className="text-[12px] font-semibold text-[var(--foreground)]">States · Preview only</p>
            <label className="text-[11px] text-[var(--muted)]">
              Selected day
              <select value={safeSelectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 font-mono text-[11px] text-[var(--foreground)]">
                {dates.map((date) => <option key={date} value={date}>{date}</option>)}
              </select>
            </label>
            <SegmentedControl
              label="Selected-day state"
              value={previewTradeState}
              options={[{ value: "not-traded", label: "Not yet traded" }, { value: "traded", label: "Traded" }]}
              onChange={(value) => setPreviewTradeState(value as PreviewTradeState)}
            />
            <label className="text-[11px] text-[var(--muted)]">
              Account authorization
              <select value={authorization} onChange={(event) => setAuthorization(event.target.value as PreviewAuthorization)} className="mt-1.5 h-10 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--foreground)]">
                <option value="authorized">Authorized</option>
                <option value="disconnected">Disconnected</option>
              </select>
            </label>
          </section>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between gap-3 border-t border-[var(--hairline)] bg-[var(--panel)] px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--faint)]">Temporary draft</p>
            <button type="button" onClick={resetAll} className="rounded-[5px] bg-[var(--surface-2)] px-3 py-2 text-[10px] font-semibold text-[var(--body)] hover:text-[var(--foreground)]">Reset all</button>
          </div>
        </aside>
      ) : null}

      {paletteOpen ? (
        <PaletteLab
          palette={palette}
          activeRole={activeRole}
          candidateDrafts={candidateDrafts}
          onActiveRoleChange={setActiveRole}
          onAssign={(color) => updateCandidate(activeRole, color)}
          onPaletteChange={setPalette}
          onClose={() => setPaletteOpen(false)}
        />
      ) : null}
    </div>
  );
}
