"use client";

import { useEffect } from "react";

import { DEFAULT_THEME, isTheme } from "@/lib/theme";

export default function ThemeBoot() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      document.documentElement.dataset.theme = isTheme(stored) ? stored : DEFAULT_THEME;
    } catch {
      document.documentElement.dataset.theme = DEFAULT_THEME;
    }
  }, []);

  return null;
}
