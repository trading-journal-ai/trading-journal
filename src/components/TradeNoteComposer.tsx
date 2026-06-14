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
        className="block w-full text-left"
        title="Click to add a trade note"
      >
        <p className="text-sm leading-6 text-[var(--muted)] italic">
          Add a trade note: setup quality, execution, rules followed or broken,
          emotions, and what to remember next time.
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
