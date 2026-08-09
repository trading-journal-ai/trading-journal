import { colorInputValue, type LabTokenDrafts } from "@/lib/designLab";
import { TOKEN_GROUPS } from "@/lib/designSystem";
import { THEMES, type Theme } from "@/lib/theme";
import { DESIGN_LAB_TOOL_STYLE } from "@/components/design-lab/toolingTheme";

type DesignLabPanelProps = {
  baseTheme: Theme;
  baseValues: Record<string, string>;
  drafts: LabTokenDrafts;
  errors: Record<string, string>;
  onBaseThemeChange: (theme: Theme) => void;
  onTokenChange: (name: string, value: string) => void;
  onReset: () => void;
};

function themeLabel(theme: Theme) {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

function TokenField({
  name,
  use,
  value,
  baseValue,
  edited,
  error,
  onChange,
}: {
  name: string;
  use: string;
  value: string;
  baseValue: string;
  edited: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = colorInputValue(value);

  return (
    <div className="border-t border-[var(--hairline)] py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor={`lab-${name}`} className="block truncate font-mono text-[11px] font-semibold text-[var(--foreground)]">
            {name}
          </label>
          <p className="mt-1 text-[10.5px] leading-4 text-[var(--faint)]">{use}</p>
        </div>
        {edited ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] hover:text-[var(--foreground)]"
          >
            Revert
          </button>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          aria-label={`Pick ${name}`}
          type="color"
          value={pickerValue ?? "#000000"}
          disabled={!pickerValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-8 shrink-0 cursor-pointer rounded-[5px] border border-[var(--border)] bg-[var(--surface)] p-0.5 disabled:cursor-not-allowed disabled:opacity-35"
        />
        <input
          id={`lab-${name}`}
          value={value}
          placeholder={baseValue || "CSS color"}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `lab-error-${name}` : undefined}
          className="min-w-0 flex-1 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--accent)]"
        />
      </div>
      {error ? (
        <p id={`lab-error-${name}`} className="mt-1.5 text-[10.5px] text-[var(--red)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function DesignLabPanel({
  baseTheme,
  baseValues,
  drafts,
  errors,
  onBaseThemeChange,
  onTokenChange,
  onReset,
}: DesignLabPanelProps) {
  const editedCount = Object.keys(drafts).length;

  return (
    <aside
      data-design-lab-tooling="reference-panel"
      style={DESIGN_LAB_TOOL_STYLE}
      className="xl:sticky xl:top-5 xl:col-start-2 xl:row-start-1 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto"
    >
      <div className="rounded-[8px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--hairline)] pb-4">
          <div>
            <p className="text-[15px] font-semibold text-[var(--foreground)]">Design Lab</p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">Temporary overrides, scoped to the preview.</p>
          </div>
          <a
            href="/design-system"
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] hover:text-[var(--foreground)]"
          >
            Exit
          </a>
        </div>

        <div className="border-b border-[var(--hairline)] py-4">
          <label htmlFor="lab-base-theme" className="block text-[12px] font-semibold text-[var(--foreground)]">
            Base theme
          </label>
          <select
            id="lab-base-theme"
            value={baseTheme}
            onChange={(event) => onBaseThemeChange(event.target.value as Theme)}
            className="mt-2 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            {THEMES.map((theme) => (
              <option key={theme} value={theme}>
                {themeLabel(theme)}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[10.5px] leading-4 text-[var(--faint)]">Changes the preview base without changing your saved app theme.</p>
        </div>

        <div className="py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-[var(--foreground)]">Tokens</p>
              <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{editedCount} edited</p>
            </div>
            <button
              type="button"
              disabled={editedCount === 0}
              onClick={onReset}
              className="rounded-[5px] bg-[var(--surface-2)] px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--body)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset all
            </button>
          </div>

          <div className="mt-3">
            {TOKEN_GROUPS.map((group) => (
              <details key={group.label} className="border-t border-[var(--hairline)] first:border-t-0">
                <summary className="cursor-pointer py-3 text-[11px] font-semibold text-[var(--body)] marker:text-[var(--muted)]">
                  {group.label}
                </summary>
                <div className="pb-2">
                  {group.tokens.map((token) => {
                    const edited = Object.hasOwn(drafts, token.name);
                    const baseValue = baseValues[token.name] ?? "";
                    return (
                      <TokenField
                        key={token.name}
                        name={token.name}
                        use={token.use}
                        value={edited ? drafts[token.name] : baseValue}
                        baseValue={baseValue}
                        edited={edited}
                        error={errors[token.name]}
                        onChange={(value) => onTokenChange(token.name, value)}
                      />
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </div>

        <div className="grid gap-2 border-t border-[var(--hairline)] pt-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[6px] bg-[var(--surface)] p-3">
            <p className="text-[11px] font-semibold text-[var(--foreground)]">Component</p>
            <p className="mt-1 text-[10.5px] leading-4 text-[var(--faint)]">Focused component controls arrive in Phase 2.</p>
          </div>
          <div className="rounded-[6px] bg-[var(--surface)] p-3">
            <p className="text-[11px] font-semibold text-[var(--foreground)]">States</p>
            <p className="mt-1 text-[10.5px] leading-4 text-[var(--faint)]">Interactive state matrices arrive in Phase 2.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
