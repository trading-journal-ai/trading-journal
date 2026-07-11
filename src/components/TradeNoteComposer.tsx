"use client";

import { useState } from "react";
import { addTradeNoteAction } from "@/app/trades/[id]/actions";
import TradeNoteFormFields from "@/components/TradeNoteFormFields";
import useLocalStorageText from "@/components/useLocalStorageText";
import { demoTradeNoteKey } from "@/lib/demoLocalNotes";

export default function TradeNoteComposer({
  tradeId,
  symbol,
  readOnly = false,
}: {
  tradeId: number;
  symbol: string;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const localStorageKey = readOnly ? demoTradeNoteKey(tradeId) : undefined;
  const [localText, setLocalText] = useLocalStorageText(localStorageKey, "");

  if (!open && localText) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="trade-journal-note"
        className="block w-full text-left"
        title="Click to edit"
      >
        <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">{localText}</p>
        <p className="mt-3 text-[11px] text-[var(--muted)]">
          Saved in this browser
        </p>
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-md border border-dashed border-[var(--border)] px-4 py-5 text-left transition-colors hover:border-[var(--accent)]"
        title="Click to add a trade note"
      >
        <p className="text-[13px] font-semibold text-[var(--accent)]">
          + Add a trade note
        </p>
        <p className="mt-3 max-w-[28rem] text-sm leading-6 text-[var(--muted)]">
          Setup quality, execution, rules followed or broken, emotions, and what
          to remember next time.
        </p>
      </button>
    );
  }

  return (
    <form action={addTradeNoteAction}>
      <input type="hidden" name="tradeId" value={tradeId} />
      <TradeNoteFormFields
        symbol={symbol}
        defaultPrimaryLabel={null}
        defaultText={localText}
        onCancel={() => setOpen(false)}
        localStorageKey={localStorageKey}
        onLocalSave={(value) => {
          setLocalText(value);
          setOpen(false);
        }}
      />
    </form>
  );
}
