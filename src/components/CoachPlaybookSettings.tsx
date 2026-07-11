"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCoachPlaybookAction } from "@/app/coach/actions";

type CoachPlaybook = {
  title: string;
  body: string;
  rubric: string;
};

export default function CoachPlaybookSettings({
  playbook,
}: {
  playbook: CoachPlaybook;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(playbook.title);
  const [body, setBody] = useState(playbook.body);
  const [rubric, setRubric] = useState(playbook.rubric);
  const hasPlaybook = playbook.body.trim().length > 0 && playbook.rubric.trim().length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--hairline)] pt-4">
        <div className="min-w-0">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {hasPlaybook ? "Configured" : "Needs setup"}
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--body)]">
            {hasPlaybook
              ? `${playbook.title} is ready for coach context.`
              : "Add setups, rules, and rubric language so the coach has standards."}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="h-10 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          {open ? "Close" : hasPlaybook ? "Open" : "Add playbook"}
        </button>
      </div>

      {open ? (
        <form
          action={async (formData) => {
            await saveCoachPlaybookAction(formData);
            router.refresh();
          }}
          className="space-y-4"
        >
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
          <label className="block space-y-2">
            <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Playbook
            </span>
            <textarea
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={12}
              className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[12px] leading-5 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block space-y-2">
            <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Rubric
            </span>
            <textarea
              name="rubric"
              value={rubric}
              onChange={(event) => setRubric(event.target.value)}
              rows={8}
              className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[12px] leading-5 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          >
            Save coach playbook
          </button>
        </form>
      ) : null}
    </div>
  );
}
