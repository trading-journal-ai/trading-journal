"use client";

import { useActionState, useEffect, useState } from "react";
import { upsertScopedNoteAction } from "@/app/journal/actions";

export default function RecapNote({
  scope,
  scopeKey,
  text,
  thesis = "",
  whatWentWell = "",
  whatWentWrong = "",
  emotionalState = "",
  placeholder,
}: {
  scope: "day" | "week" | "month";
  scopeKey: string;
  text: string;
  thesis?: string;
  whatWentWell?: string;
  whatWentWrong?: string;
  emotionalState?: string;
  placeholder: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(upsertScopedNoteAction, null);
  const titleBreak = placeholder.indexOf(":");
  const emptyTitle = titleBreak === -1 ? `Add a ${scope} recap` : placeholder.slice(0, titleBreak).trim();
  const emptyHelper = titleBreak === -1 ? placeholder : placeholder.slice(titleBreak + 1).trim();

  useEffect(() => {
    // Collapse back to view mode once the save action resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="block w-full text-left"
        title="Click to edit"
      >
        {text ? (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">{text}</p>
            {scope === "day" && (thesis || whatWentWell || whatWentWrong || emotionalState) ? (
              <div className="grid gap-2 border-l border-[var(--hairline)] pl-3 font-mono text-[12px] leading-5 text-[var(--muted)]">
                {thesis ? <span>Intent: {thesis}</span> : null}
                {whatWentWell ? <span>Did well: {whatWentWell}</span> : null}
                {whatWentWrong ? <span>Standards drift: {whatWentWrong}</span> : null}
                {emotionalState ? <span>State: {emotionalState}</span> : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] px-4 py-5 transition-colors hover:border-[var(--blue)]">
            <p className="font-mono text-[13px] font-semibold text-[var(--blue)]">
              + {emptyTitle}
            </p>
            <p className="mt-3 max-w-[34rem] text-sm leading-6 text-[var(--muted)]">
              {emptyHelper}
            </p>
          </div>
        )}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="scopeKey" value={scopeKey} />
      {scope === "day" ? (
        <div className="mb-3 grid gap-3">
          <input
            name="thesis"
            defaultValue={thesis}
            placeholder="What were you trying to trade today?"
            className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--blue)]"
          />
          <input
            name="whatWentWell"
            defaultValue={whatWentWell}
            placeholder="What did you do well?"
            className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--blue)]"
          />
          <input
            name="whatWentWrong"
            defaultValue={whatWentWrong}
            placeholder="Where did you lower standards?"
            className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--blue)]"
          />
          <select
            name="emotionalState"
            defaultValue={emotionalState}
            className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--blue)]"
          >
            <option value="">Emotional state</option>
            <option value="Calm">Calm</option>
            <option value="Rushed">Rushed</option>
            <option value="Tilted">Tilted</option>
            <option value="Hesitant">Hesitant</option>
            <option value="FOMO">FOMO</option>
            <option value="Revenge">Revenge</option>
            <option value="Confident">Confident</option>
          </select>
        </div>
      ) : null}
      <textarea
        name="body"
        defaultValue={text}
        rows={3}
        autoFocus
        placeholder={placeholder}
        className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--blue)]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
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
