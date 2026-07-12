"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteJournalEntryAction,
  updateJournalEntryStateAction,
} from "@/app/journal/actions";
import TradeNoteFormFields from "@/components/TradeNoteFormFields";
import useLocalStorageText from "@/components/useLocalStorageText";
import { demoTradeNoteKey } from "@/lib/demoLocalNotes";

export default function TradeJournalNote({
  noteId,
  tradeId,
  text,
  setupPattern,
  readOnly = false,
}: {
  noteId: number;
  tradeId: number;
  text: string;
  setupPattern: string | null;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateJournalEntryStateAction, null);
  const localStorageKey = readOnly ? demoTradeNoteKey(tradeId, noteId) : undefined;
  const [displayText, setDisplayText] = useLocalStorageText(localStorageKey, text);

  useEffect(() => {
    // Collapse back to the clean reading view after a successful save.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div data-testid="trade-journal-note">
        {setupPattern ? (
          <div className="mb-2 font-mono text-[11px] text-[var(--muted)]">{setupPattern}</div>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
          {displayText || "Add a trade note."}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
        >
          Edit note
        </button>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="noteId" value={noteId} />
      <input type="hidden" name="tradeId" value={tradeId} />
      <TradeNoteFormFields
        defaultSetupPattern={setupPattern}
        defaultText={displayText}
        pending={pending}
        onCancel={() => setEditing(false)}
        localStorageKey={localStorageKey}
        onLocalSave={(value) => {
          setDisplayText(value);
          setEditing(false);
        }}
        deleteControl={!readOnly ? (
          <button
            type="submit"
            formAction={deleteJournalEntryAction}
            className="h-10 rounded-md px-3 text-sm text-[var(--red)] hover:bg-[color-mix(in_srgb,var(--red)_10%,transparent)]"
          >
            Delete note
          </button>
        ) : undefined}
      />
    </form>
  );
}
