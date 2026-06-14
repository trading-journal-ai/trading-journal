"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteJournalEntryAction,
  updateJournalEntryStateAction,
} from "@/app/journal/actions";
import TradeNoteFormFields, { JournalNotePill } from "@/components/TradeNoteFormFields";

export default function TradeJournalNote({
  noteId,
  tradeId,
  symbol,
  text,
  primaryLabel,
  processTags,
  emotionTags,
  showHeader = false,
  showFormHeader = false,
}: {
  noteId: number;
  tradeId: number;
  symbol: string;
  text: string;
  primaryLabel: string | null;
  processTags: string[];
  emotionTags: string[];
  showHeader?: boolean;
  showFormHeader?: boolean;
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
        {showHeader ? (
          <div className="mb-2 flex min-w-0 items-center gap-2">
            <span className="text-[15px] font-semibold text-[var(--foreground)]">
              {symbol}
            </span>
            {primaryLabel ? (
              <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                {primaryLabel}
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
          {text || "Add a trade note."}
        </p>
        {processTags.length > 0 || emotionTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {[...processTags, ...emotionTags].map((tag) => (
              <JournalNotePill key={tag} label={tag} />
            ))}
          </div>
        ) : null}
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
        defaultText={text}
        defaultProcessTags={processTags}
        defaultEmotionTags={emotionTags}
        pending={pending}
        onCancel={() => setEditing(false)}
        showHeader={showFormHeader}
        deleteControl={
          <button
            type="submit"
            formAction={deleteJournalEntryAction}
            className="h-10 rounded-md px-3 text-sm text-[var(--red)] hover:bg-[color-mix(in_srgb,var(--red)_10%,transparent)]"
          >
            Delete note
          </button>
        }
      />
    </form>
  );
}
