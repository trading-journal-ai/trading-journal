"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";

import {
  labTokenErrors,
  mergeLabTokenValues,
  validLabTokenOverrides,
  type LabTokenDrafts,
} from "@/lib/designLab";
import { ALL_TOKEN_NAMES } from "@/lib/designSystem";
import { DEFAULT_THEME, readAppliedTheme, type Theme } from "@/lib/theme";

const subscribeToInitialTheme = () => () => {};
const readServerTheme = () => DEFAULT_THEME;
const PREVIEW_THEME_TOKEN_NAMES = [...ALL_TOKEN_NAMES, "--font-metric"];

export default function useDesignLabTheme() {
  const appliedTheme = useSyncExternalStore(subscribeToInitialTheme, readAppliedTheme, readServerTheme);
  const [selectedBaseTheme, setSelectedBaseTheme] = useState<Theme | null>(null);
  const [baseValues, setBaseValues] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<LabTokenDrafts>({});
  const [hydrated, setHydrated] = useState(false);
  const baseTheme = selectedBaseTheme ?? appliedTheme;

  useEffect(() => {
    const root = document.documentElement;
    const originalTheme = root.dataset.theme;

    const frame = requestAnimationFrame(() => {
      const next: Record<string, string> = {};
      try {
        root.dataset.theme = baseTheme;
        const computed = getComputedStyle(root);
        for (const name of PREVIEW_THEME_TOKEN_NAMES) next[name] = computed.getPropertyValue(name).trim();
      } finally {
        if (originalTheme) root.dataset.theme = originalTheme;
        else delete root.dataset.theme;
      }
      setBaseValues(next);
      setHydrated(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [baseTheme]);

  const errors = useMemo(() => labTokenErrors(drafts), [drafts]);
  const overrides = useMemo(() => validLabTokenOverrides(drafts), [drafts]);
  const tokenValues = useMemo(() => mergeLabTokenValues(baseValues, overrides), [baseValues, overrides]);
  const previewStyle = {
    ...tokenValues,
    colorScheme: baseTheme === "dark" || baseTheme === "evening" ? "dark" : "light",
  } as CSSProperties & Record<string, string>;

  function updateToken(name: string, value: string) {
    setDrafts((current) => {
      if (!value) {
        const next = { ...current };
        delete next[name];
        return next;
      }
      return { ...current, [name]: value };
    });
  }

  function changeBaseTheme(theme: Theme) {
    setHydrated(false);
    setSelectedBaseTheme(theme);
  }

  return {
    baseTheme,
    baseValues,
    drafts,
    errors,
    hydrated,
    previewStyle,
    tokenValues,
    changeBaseTheme,
    resetTokens: () => setDrafts({}),
    updateToken,
  };
}
