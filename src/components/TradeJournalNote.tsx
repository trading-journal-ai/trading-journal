"use client";

import { useActionState, useEffect, useState } from "react";
import { updateJournalEntryStateAction } from "@/app/journal/actions";

const REVIEW_OPTIONS = [
  "Good trade",
  "Bad trade",
  "Rule break",
  "Revenge trade",
  "Chased",
  "Overtraded",
  "Needs review",
];

export default function TradeJournalNote({
  noteId,
  tradeId,
  text,
  emotionalState,
}: {
  noteId: number;
  tradeId: number;
  text: string;
  emotionalState: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateJournalEntryStateAction, null);

  useEffect(() => {
    // Collapse back to the clean reading view after a successful save.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        data-testid="trade-journal-note"
        className="block w-full text-left"
        title="Click to edit"
      >
        <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
          {text || "Add a trade note."}
        </p>
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="noteId" value={noteId} />
      <input type="hidden" name="tradeId" value={tradeId} />
      <select
        name="emotionalState"
        defaultValue={emotionalState ?? ""}
        className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm outline-none focus:border-[var(--blue)]"
      >
        <option value="">Optional</option>
        {REVIEW_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <textarea
        name="note"
        rows={3}
        autoFocus
        defaultValue={text}
        className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--blue)]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)] disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save note"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-9 rounded-md px-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
