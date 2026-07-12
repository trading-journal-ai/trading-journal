"use client";

import { useEffect, useState } from "react";

import { THEMES, DEFAULT_THEME, type Theme, readStoredTheme, applyTheme } from "@/lib/theme";

export default function ThemeSettings() {
  // Start from the default so SSR and first client render agree, then sync to
  // the persisted theme on mount WITHOUT re-applying it (applying here would
  // clobber a non-default theme before ThemeBoot has restored it).
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  function updateTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div className="inline-flex h-10 items-center rounded-md border border-[var(--border)] p-1">
      {THEMES.map((option) => {
        const active = theme === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => updateTheme(option)}
            className={`h-8 rounded px-3 text-sm font-semibold capitalize transition-colors ${
              active
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-pressed={active}
            suppressHydrationWarning
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
