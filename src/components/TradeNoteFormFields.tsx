"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import SharedNoteComposer from "@/components/SharedNoteComposer";
import {
  PRIMARY_TRADE_LABELS,
  journalLabelTone,
} from "@/lib/journalLabels";

function toneDotClass(label: string) {
  const tone = journalLabelTone(label);
  if (tone === "positive") return "bg-[var(--green)]";
  if (tone === "negative") return "bg-[var(--red)]";
  return "bg-[var(--muted)]";
}

function labelToneClass(label: string) {
  const tone = journalLabelTone(label);
  if (tone === "positive") return "border-[var(--green)] text-[var(--green)]";
  if (tone === "negative") return "border-[var(--red)] text-[var(--red)]";
  return "border-[var(--border)] text-[var(--muted)]";
}

export function JournalNotePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[11px] text-[var(--foreground)]">
      <span className={`size-1 rounded-full ${toneDotClass(label)}`} />
      {label}
    </span>
  );
}

function PrimaryLabelBadge({ label }: { label: string }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] ${labelToneClass(
        label,
      )}`}
    >
      {label}
    </span>
  );
}

export default function TradeNoteFormFields({
  symbol,
  defaultPrimaryLabel,
  defaultText,
  pending = false,
  onCancel,
  deleteControl,
  showHeader = true,
  localStorageKey,
  onLocalSave,
}: {
  symbol: string;
  defaultPrimaryLabel: string | null;
  defaultText: string;
  pending?: boolean;
  onCancel: () => void;
  deleteControl?: ReactNode;
  showHeader?: boolean;
  localStorageKey?: string;
  onLocalSave?: (value: string) => void;
}) {
  const [primaryLabel, setPrimaryLabel] = useState(defaultPrimaryLabel ?? "");

  return (
    <div className="space-y-5">
      {showHeader ? (
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[15px] font-semibold text-[var(--foreground)]">
            {symbol}
          </span>
          {primaryLabel ? <PrimaryLabelBadge label={primaryLabel} /> : null}
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Primary label
        </span>
        <select
          name="primaryLabel"
          value={primaryLabel}
          onChange={(event) => setPrimaryLabel(event.target.value)}
          className="h-10 w-full max-w-64 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        >
          <option value="">Optional</option>
          {PRIMARY_TRADE_LABELS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <SharedNoteComposer
        name="note"
        defaultValue={defaultText}
        placeholder="Talk through what happened, what you saw, where standards held or slipped, and what to remember next time."
        autoFocus
        pending={pending}
        submitLabel="Save note"
        onCancel={onCancel}
        showSetupPatternCues
        actionsSlot={deleteControl}
        localStorageKey={localStorageKey}
        onLocalSave={onLocalSave}
      />
    </div>
  );
}
