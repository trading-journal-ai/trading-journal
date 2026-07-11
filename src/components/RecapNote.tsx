"use client";

import { useActionState, useEffect, useState } from "react";
import { upsertScopedNoteAction } from "@/app/journal/actions";
import SharedNoteComposer from "@/components/SharedNoteComposer";
import useLocalStorageText from "@/components/useLocalStorageText";
import { demoRecapNoteKey } from "@/lib/demoLocalNotes";

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
  readOnly = false,
}: {
  scope: "day" | "week" | "month";
  scopeKey: string;
  text: string;
  thesis?: string;
  whatWentWell?: string;
  whatWentWrong?: string;
  emotionalState?: string;
  placeholder: string;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(upsertScopedNoteAction, null);
  const localStorageKey = readOnly ? demoRecapNoteKey(scope, scopeKey) : undefined;
  const titleBreak = placeholder.indexOf(":");
  const emptyTitle = titleBreak === -1 ? `Add a ${scope} recap` : placeholder.slice(0, titleBreak).trim();
  const emptyHelper = titleBreak === -1 ? placeholder : placeholder.slice(titleBreak + 1).trim();
  const editorText = scope === "day"
    ? combineDayNote({ text, thesis, whatWentWell, whatWentWrong, emotionalState })
    : text;
  const [displayText, setDisplayText] = useLocalStorageText(localStorageKey, editorText);

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
        {displayText ? (
          <div>
            <p className="text-[13px] font-semibold text-[var(--accent)]">✎ Your {scope} recap</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">{displayText}</p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] px-4 py-5 transition-colors hover:border-[var(--accent)]">
            <p className="font-mono text-[13px] font-semibold text-[var(--accent)]">
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
        <>
          <input type="hidden" name="thesis" value="" />
          <input type="hidden" name="whatWentWell" value="" />
          <input type="hidden" name="whatWentWrong" value="" />
          <input type="hidden" name="emotionalState" value="" />
        </>
      ) : null}
      <SharedNoteComposer
        name="body"
        defaultValue={displayText}
        rows={scope === "day" ? 7 : 3}
        autoFocus
        placeholder={
          scope === "day"
            ? "Talk through the session in one pass. Market read, plan, where standards held or slipped, and what to carry forward."
            : placeholder
        }
        pending={pending}
        pendingLabel="Saving..."
        submitLabel="Save note"
        onCancel={() => setEditing(false)}
        localStorageKey={localStorageKey}
        onLocalSave={(value) => {
          setDisplayText(value);
          setEditing(false);
        }}
        helper={
          scope === "day"
            ? "Describe your trading day in one pass. Capture what you were trying to do, what worked, where standards slipped, and what you want to carry forward."
            : undefined
        }
      />
    </form>
  );
}
