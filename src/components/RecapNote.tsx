"use client";

import { useActionState, useEffect, useState } from "react";
import { upsertScopedNoteAction } from "@/app/journal/actions";

export default function RecapNote({
  scope,
  scopeKey,
  text,
  placeholder,
}: {
  scope: "day" | "week" | "month";
  scopeKey: string;
  text: string;
  placeholder: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(upsertScopedNoteAction, null);

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
          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">{text}</p>
        ) : (
          <p className="text-sm leading-6 text-[var(--muted)] italic">{placeholder}</p>
        )}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="scopeKey" value={scopeKey} />
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
