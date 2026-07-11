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
  symbol,
  text,
  primaryLabel,
  readOnly = false,
  showHeader = false,
  showFormHeader = false,
}: {
  noteId: number;
  tradeId: number;
  symbol: string;
  text: string;
  primaryLabel: string | null;
  readOnly?: boolean;
  showHeader?: boolean;
  showFormHeader?: boolean;
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
      <button
        type="button"
        onClick={() => setEditing(true)}
        data-testid="trade-journal-note"
        className="block w-full text-left"
        title="Click to edit"
      >
        {showHeader ? (
          <div className="mb-2 flex min-w-0 items-center gap-2">
            <span className="text-[15px] font-semibold text-[var(--foreground)]">
              {symbol}
            </span>
            {primaryLabel ? (
              <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                {primaryLabel}
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
          {displayText || "Add a trade note."}
        </p>
      </button>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="noteId" value={noteId} />
      <input type="hidden" name="tradeId" value={tradeId} />
      <TradeNoteFormFields
        symbol={symbol}
        defaultPrimaryLabel={primaryLabel}
        defaultText={displayText}
        pending={pending}
        onCancel={() => setEditing(false)}
        showHeader={showFormHeader}
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
