"use client";

import { useState } from "react";
import ImportForm from "@/components/ImportForm";

export default function InlineImportPrompt() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="cursor-pointer font-mono text-[13px] font-semibold text-[#58a6ff] hover:underline"
      >
        Import trades
      </button>
    );
  }

  return (
    <div className="max-w-xl space-y-5 pt-2">
      <p className="text-sm leading-6 text-[var(--body)]">
        Upload a CSV file. Fills are parsed, deduped, and grouped into trades.
        Re-importing the same file is safe.
      </p>
      <ImportForm />
    </div>
  );
}
