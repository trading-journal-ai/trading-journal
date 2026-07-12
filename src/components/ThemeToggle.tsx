"use client";

import { useState } from "react";

import { THEMES, type Theme, readAppliedTheme, applyTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readAppliedTheme);

  function cycleTheme() {
    const nextTheme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold capitalize text-[var(--foreground)] transition-colors hover:border-[var(--accent)]"
      aria-label="Switch theme"
      suppressHydrationWarning
    >
      {theme}
    </button>
  );
}
