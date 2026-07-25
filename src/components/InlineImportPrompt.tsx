"use client";

import { useState } from "react";
import ImportForm from "@/components/ImportForm";

export default function InlineImportPrompt({ readOnly = false }: { readOnly?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  if (readOnly) {
    return (
      <p className="max-w-[460px] text-sm leading-6 text-[var(--body)]">
        This hosted demo is read-only and uses simulated paper-trading data.
      </p>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="cursor-pointer font-mono text-[13px] font-semibold text-[var(--accent)] hover:underline"
      >
        Import trades
      </button>
    );
  }

  return (
    <div className="max-w-xl space-y-5 pt-2">
      <p className="text-sm leading-6 text-[var(--body)]">
        Sync recent fills from Schwab or upload a broker file. Overlapping imports
        are deduped without replacing your journal notes.
      </p>
      <ImportForm />
    </div>
  );
}
