"use client";

import type { ReactNode } from "react";
import SharedNoteComposer from "@/components/SharedNoteComposer";
import { SETUP_PATTERN_CUES } from "@/lib/journalLabels";

export default function TradeNoteFormFields({
  defaultSetupPattern,
  defaultText,
  pending = false,
  onCancel,
  deleteControl,
  localStorageKey,
  onLocalSave,
}: {
  defaultSetupPattern: string | null;
  defaultText: string;
  pending?: boolean;
  onCancel: () => void;
  deleteControl?: ReactNode;
  localStorageKey?: string;
  onLocalSave?: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="block space-y-2">
        <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Setup / pattern
        </span>
        <select
          name="setupPattern"
          defaultValue={defaultSetupPattern ?? ""}
          className="h-10 w-full max-w-72 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        >
          <option value="">Choose a setup or pattern</option>
          {SETUP_PATTERN_CUES.map((option) => (
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
        primaryAction
        actionsSlot={deleteControl}
        localStorageKey={localStorageKey}
        onLocalSave={onLocalSave}
      />
    </div>
  );
}
