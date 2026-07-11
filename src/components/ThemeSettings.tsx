"use client";

import { useEffect, useState } from "react";

import { THEMES, type Theme, readAppliedTheme, applyTheme } from "@/lib/theme";

export default function ThemeSettings() {
  const [theme, setTheme] = useState<Theme>(readAppliedTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="inline-flex h-10 items-center rounded-md border border-[var(--border)] p-1">
      {THEMES.map((option) => {
        const active = theme === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className={`h-8 rounded px-3 text-sm font-semibold capitalize transition-colors ${
              active
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-pressed={active}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
