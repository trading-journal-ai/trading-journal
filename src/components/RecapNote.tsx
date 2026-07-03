"use client";

import { useActionState, useEffect, useState } from "react";
import { upsertScopedNoteAction } from "@/app/journal/actions";
import DictationTextarea from "@/components/DictationTextarea";

function combineDayNote({
  text,
  thesis,
  whatWentWell,
  whatWentWrong,
  emotionalState,
}: {
  text: string;
  thesis: string;
  whatWentWell: string;
  whatWentWrong: string;
  emotionalState: string;
}) {
  const sections = [
    thesis ? `Intent: ${thesis}` : "",
    whatWentWell ? `Did well: ${whatWentWell}` : "",
    whatWentWrong ? `Standards drift: ${whatWentWrong}` : "",
    emotionalState ? `State: ${emotionalState}` : "",
    text,
  ].filter(Boolean);

  return sections.join("\n\n");
}

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
  const editorText = scope === "day"
    ? combineDayNote({ text, thesis, whatWentWell, whatWentWrong, emotionalState })
    : text;

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
        {editorText ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">{editorText}</p>
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
    <form action={formAction} className="pb-6">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="scopeKey" value={scopeKey} />
      {scope === "day" ? (
        <p className="mb-3 max-w-[42rem] text-sm leading-6 text-[var(--muted)]">
          Describe your trading day in one pass. Capture what you were trying to do, what worked,
          where standards slipped, how you felt, and what you want to carry forward.
        </p>
      ) : null}
      {scope === "day" ? (
        <>
          <input type="hidden" name="thesis" value="" />
          <input type="hidden" name="whatWentWell" value="" />
          <input type="hidden" name="whatWentWrong" value="" />
          <input type="hidden" name="emotionalState" value="" />
        </>
      ) : null}
      <DictationTextarea
        name="body"
        defaultValue={editorText}
        rows={scope === "day" ? 7 : 3}
        autoFocus
        placeholder={
          scope === "day"
            ? "Talk through the session in one pass. Intent, what worked, where standards slipped, emotional state, and the lesson to carry forward."
            : placeholder
        }
        className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--blue)]"
      />
      <div className="mt-1.5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-9 rounded-md px-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--blue)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save note"}
        </button>
      </div>
    </form>
  );
}
