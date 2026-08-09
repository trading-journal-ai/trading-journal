import type { CSSProperties } from "react";

/** Stable neutral chrome for Lab controls, independent from the theme under review. */
export const DESIGN_LAB_TOOL_STYLE = {
  colorScheme: "light",
  "--background": "#ffffff",
  "--surface": "#ffffff",
  "--surface-2": "#f3f4f6",
  "--panel": "#ffffff",
  "--border": "#d7dce2",
  "--hairline": "rgba(17, 24, 39, 0.09)",
  "--foreground": "#171a1f",
  "--body": "#3f4650",
  "--muted": "#68717d",
  "--faint": "#9aa3ae",
  "--accent": "#2563eb",
  "--accent-strong": "#1d4ed8",
  "--action": "#171a1f",
  "--action-foreground": "#ffffff",
  "--red": "#c9342f",
} as CSSProperties & Record<string, string>;
