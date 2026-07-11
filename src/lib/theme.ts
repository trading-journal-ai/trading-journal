export const THEMES = ["dark", "light", "daylight", "evening"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** The theme currently applied to <html>, falling back to the default. */
export function readAppliedTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : DEFAULT_THEME;
}

/**
 * The persisted theme from localStorage — independent of when ThemeBoot runs,
 * so controls can sync to it on mount without clobbering it.
 */
export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem("theme");
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Ignore storage failures (private mode, quota) — the theme still applies for this session.
  }
}
