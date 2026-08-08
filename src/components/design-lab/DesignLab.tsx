"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import DesignLabPanel from "@/components/design-lab/DesignLabPanel";
import {
  labTokenErrors,
  mergeLabTokenValues,
  validLabTokenOverrides,
  type LabTokenDrafts,
} from "@/lib/designLab";
import { ALL_TOKEN_NAMES } from "@/lib/designSystem";
import { DEFAULT_THEME, readAppliedTheme, type Theme } from "@/lib/theme";

type DesignLabRenderState = {
  tokenValues: Record<string, string>;
  hydrated: boolean;
};

type DesignLabProps = {
  children: (state: DesignLabRenderState) => ReactNode;
};

const subscribeToInitialTheme = () => () => {};
const readServerTheme = () => DEFAULT_THEME;
const PREVIEW_THEME_TOKEN_NAMES = [...ALL_TOKEN_NAMES, "--font-metric"];

export default function DesignLab({ children }: DesignLabProps) {
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

  const updateToken = (name: string, value: string) => {
    setDrafts((current) => {
      if (!value) {
        const next = { ...current };
        delete next[name];
        return next;
      }
      return { ...current, [name]: value };
    });
  };

  const changeBaseTheme = (theme: Theme) => {
    setHydrated(false);
    setSelectedBaseTheme(theme);
  };

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start">
      <DesignLabPanel
        baseTheme={baseTheme}
        baseValues={baseValues}
        drafts={drafts}
        errors={errors}
        onBaseThemeChange={changeBaseTheme}
        onTokenChange={updateToken}
        onReset={() => setDrafts({})}
      />
      <div
        style={previewStyle}
        className="min-w-0 rounded-[8px] bg-[var(--background)] px-4 text-[var(--foreground)] ring-1 ring-[var(--hairline)] sm:px-6 xl:col-start-1 xl:row-start-1"
      >
        {children({ tokenValues, hydrated })}
      </div>
    </div>
  );
}
