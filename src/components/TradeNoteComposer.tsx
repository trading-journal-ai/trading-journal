"use client";

import { useState } from "react";
import { addTradeNoteAction } from "@/app/trades/[id]/actions";
import TradeNoteFormFields from "@/components/TradeNoteFormFields";

export default function TradeNoteComposer({
  tradeId,
  symbol,
}: {
  tradeId: number;
  symbol: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-md border border-dashed border-[var(--border)] px-4 py-5 text-left transition-colors hover:border-[var(--blue)]"
        title="Click to add a trade note"
      >
        <p className="font-mono text-[13px] font-semibold text-[var(--blue)]">
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
        defaultText=""
        onCancel={() => setOpen(false)}
      />
    </form>
  );
}
