"use client";

import { type ReactNode } from "react";

import DesignLabPanel from "@/components/design-lab/DesignLabPanel";
import useDesignLabTheme from "@/components/design-lab/useDesignLabTheme";

type DesignLabRenderState = {
  tokenValues: Record<string, string>;
  hydrated: boolean;
};

type DesignLabProps = {
  children: (state: DesignLabRenderState) => ReactNode;
};

export default function DesignLab({ children }: DesignLabProps) {
  const {
    baseTheme,
    baseValues,
    drafts,
    errors,
    hydrated,
    previewStyle,
    tokenValues,
    changeBaseTheme,
    resetTokens,
    updateToken,
  } = useDesignLabTheme();

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start">
      <DesignLabPanel
        baseTheme={baseTheme}
        baseValues={baseValues}
        drafts={drafts}
        errors={errors}
        onBaseThemeChange={changeBaseTheme}
        onTokenChange={updateToken}
        onReset={resetTokens}
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
