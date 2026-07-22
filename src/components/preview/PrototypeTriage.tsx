"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { PrototypeEntryWithDate, PrototypeGroup } from "@/lib/preview/prototypeCatalog";

type Decision = "keep" | "remove";
type TriageState = Record<string, Decision>;

const STORAGE_KEY = "preview-triage-v1";

function loadState(): TriageState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as TriageState;
    return {};
  } catch {
    return {};
  }
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="none">
      <path d="M5 15 15 5M7 5h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Rough age label from a YYYY-MM-DD commit date. */
function ageLabel(lastCommit: string | null): string {
  if (!lastCommit) return "uncommitted";
  const then = new Date(lastCommit + "T00:00:00");
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function DecisionToggle({
  decision,
  pinned,
  onChange,
}: {
  decision: Decision | undefined;
  pinned?: boolean;
  onChange: (next: Decision | undefined) => void;
}) {
  const base =
    "rounded-[5px] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-pressed={decision === "keep"}
        onClick={() => onChange(decision === "keep" ? undefined : "keep")}
        className={`${base} ${
          decision === "keep"
            ? "bg-[var(--green-tint)] text-[var(--green)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        Keep
      </button>
      <button
        type="button"
        aria-pressed={decision === "remove"}
        disabled={pinned}
        title={pinned ? "Pinned exploration — protected from removal" : undefined}
        onClick={() => onChange(decision === "remove" ? undefined : "remove")}
        className={`${base} ${
          pinned
            ? "cursor-not-allowed text-[var(--faint)]"
            : decision === "remove"
              ? "bg-[var(--red-tint)] text-[var(--red)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        {pinned ? "Pinned" : "Remove"}
      </button>
    </div>
  );
}

function Row({
  entry,
  index,
  decision,
  onChange,
}: {
  entry: PrototypeEntryWithDate;
  index: number;
  decision: Decision | undefined;
  onChange: (next: Decision | undefined) => void;
}) {
  const rowTint =
    decision === "remove"
      ? "bg-[color-mix(in_srgb,var(--red)_5%,transparent)]"
      : decision === "keep"
        ? "bg-[color-mix(in_srgb,var(--green)_4%,transparent)]"
        : "";
  return (
    <div
      className={`grid grid-cols-1 gap-3 border-t border-[var(--hairline)] px-3 py-4 transition-colors lg:grid-cols-[40px_minmax(150px,0.7fr)_minmax(190px,1.1fr)_108px_84px_150px] lg:items-center lg:gap-5 ${rowTint}`}
    >
      <span className="font-mono text-[11px] tabular-nums text-[var(--faint)]">{String(index + 1).padStart(2, "0")}</span>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold leading-6 text-[var(--foreground)]">{entry.title}</p>
        <p className="truncate font-mono text-[10.5px] text-[var(--muted)]">{entry.href ?? entry.file}</p>
      </div>
      <p className="max-w-2xl text-[13px] leading-6 text-[var(--body)]">{entry.description}</p>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{entry.meta}</span>
      <span
        className={`font-mono text-[10px] tabular-nums ${entry.lastCommit ? "text-[var(--faint)]" : "text-[var(--accent)]"}`}
        title={entry.lastCommit ?? "not committed"}
      >
        {ageLabel(entry.lastCommit)}
      </span>
      <div className="flex items-center justify-between gap-3">
        <DecisionToggle decision={decision} pinned={entry.pinned} onChange={onChange} />
        {entry.href ? (
          <Link
            href={entry.href}
            target="_blank"
            className="text-[var(--muted)] transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            aria-label={`Open ${entry.title} in a new tab`}
          >
            <ArrowIcon />
          </Link>
        ) : (
          <span className="w-4" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

export default function PrototypeTriage({
  groups,
  entries,
}: {
  groups: PrototypeGroup[];
  entries: PrototypeEntryWithDate[];
}) {
  const [state, setState] = useState<TriageState>({});
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage failures (private mode, quota)
    }
  }, [state, hydrated]);

  const setDecision = (id: string, next: Decision | undefined) => {
    setState((prev) => {
      const draft = { ...prev };
      if (next === undefined) delete draft[id];
      else draft[id] = next;
      return draft;
    });
  };

  const counts = useMemo(() => {
    let keep = 0;
    let remove = 0;
    for (const entry of entries) {
      if (state[entry.id] === "keep") keep += 1;
      else if (state[entry.id] === "remove") remove += 1;
    }
    return { keep, remove, undecided: entries.length - keep - remove };
  }, [state, entries]);

  const removalList = useMemo(
    () => entries.filter((entry) => state[entry.id] === "remove").map((entry) => entry.file),
    [state, entries],
  );

  const copyRemovals = async () => {
    if (removalList.length === 0) return;
    try {
      await navigator.clipboard.writeText(removalList.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const resetAll = () => setState({});

  return (
    <div>
      {groups.map((group, gi) => {
        const groupEntries = entries.filter((entry) => entry.group === group.key);
        if (groupEntries.length === 0) return null;
        return (
          <section key={group.key} className="grid gap-6 border-t border-[var(--border)] py-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
            <header>
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {String(gi + 1).padStart(2, "0")} · {groupEntries.length} {groupEntries.length === 1 ? "surface" : "surfaces"}
              </p>
              <h2 className="mt-4 text-[24px] font-semibold leading-8 tracking-[-0.02em] text-[var(--foreground)]">{group.label}</h2>
              <p className="mt-4 max-w-sm text-[13px] leading-6 text-[var(--body)]">{group.blurb}</p>
            </header>
            <div className="border-b border-[var(--hairline)]">
              {groupEntries.map((entry, index) => (
                <Row key={entry.id} entry={entry} index={index} decision={state[entry.id]} onChange={(next) => setDecision(entry.id, next)} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Sticky triage summary + export */}
      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-3 py-4 backdrop-blur">
        <dl className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.1em]">
          <div className="flex items-center gap-2">
            <dt className="text-[var(--muted)]">Keep</dt>
            <dd className="tabular-nums font-semibold text-[var(--green)]">{hydrated ? counts.keep : "—"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-[var(--muted)]">Remove</dt>
            <dd className="tabular-nums font-semibold text-[var(--red)]">{hydrated ? counts.remove : "—"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-[var(--muted)]">Undecided</dt>
            <dd className="tabular-nums font-semibold text-[var(--body)]">{hydrated ? counts.undecided : "—"}</dd>
          </div>
        </dl>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetAll}
            className="rounded-[5px] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={copyRemovals}
            disabled={removalList.length === 0}
            className={`rounded-[5px] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
              removalList.length === 0
                ? "cursor-not-allowed text-[var(--faint)]"
                : "bg-[var(--action)] text-[var(--action-foreground)] hover:opacity-90"
            }`}
          >
            {copied ? "Copied ✓" : `Copy removal list (${removalList.length})`}
          </button>
        </div>
      </div>
      <p className="px-3 pt-3 font-mono text-[10px] leading-5 text-[var(--faint)]">
        Decisions are stored locally in this browser. &ldquo;Copy removal list&rdquo; puts the marked file paths on your clipboard to hand off for deletion.
      </p>
    </div>
  );
}
