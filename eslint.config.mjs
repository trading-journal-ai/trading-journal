import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".venv*/**",
    ".claude/**",
    "**/__pycache__/**",
    // Local/private databases and generated provider backfills are not source.
    "data/**",
    // Static design references kept for product/design review, not app source.
    "samples/**",
    "public/review/**",
  ]),
]);

export default eslintConfig;
