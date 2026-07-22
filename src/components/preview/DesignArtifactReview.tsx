"use client";

import { useEffect, useMemo, useState } from "react";

import type { DesignArtifactGroup, DesignArtifactWithDate } from "@/lib/preview/designArtifacts";

type Decision = "keep" | "remove";
type ReviewState = Record<string, Decision>;

const STORAGE_KEY = "design-artifact-triage-v1";

function loadState(): ReviewState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as ReviewState) : {};
  } catch {
    return {};
  }
}

function ageLabel(lastCommit: string | null): string {
  if (!lastCommit) return "uncommitted";
  const days = Math.floor((Date.now() - new Date(lastCommit + "T00:00:00").getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(days / 365)}y ago`;
}

const KIND_LABEL: Record<string, string> = { image: "Wireframe", html: "HTML", dir: "Directory" };

function DecisionButtons({
  decision,
  onChange,
}: {
  decision: Decision | undefined;
  onChange: (next: Decision | undefined) => void;
}) {
  const base =
    "flex-1 rounded-[5px] px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-pressed={decision === "keep"}
        onClick={() => onChange(decision === "keep" ? undefined : "keep")}
        className={`${base} ${decision === "keep" ? "bg-[var(--green-tint)] text-[var(--green)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
      >
        Keep
      </button>
      <button
        type="button"
        aria-pressed={decision === "remove"}
        onClick={() => onChange(decision === "remove" ? undefined : "remove")}
        className={`${base} ${decision === "remove" ? "bg-[var(--red-tint)] text-[var(--red)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
      >
        Remove
      </button>
    </div>
  );
}

function ArtifactCard({
  artifact,
  decision,
  onChange,
}: {
  artifact: DesignArtifactWithDate;
  decision: Decision | undefined;
  onChange: (next: Decision | undefined) => void;
}) {
  const ring =
    decision === "remove"
      ? "outline outline-2 outline-[color-mix(in_srgb,var(--red)_40%,transparent)]"
      : decision === "keep"
        ? "outline outline-2 outline-[color-mix(in_srgb,var(--green)_40%,transparent)]"
        : "outline outline-1 outline-[var(--border)]";
  return (
    <div className={`flex flex-col overflow-hidden rounded-[8px] bg-[var(--surface)] ${ring}`}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--surface-2)]">
        {artifact.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- static local preview, no optimization needed
          <img src={artifact.src} alt={artifact.title} className="h-full w-full object-cover object-top" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">
              {KIND_LABEL[artifact.kind] ?? artifact.kind}
            </span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-[4px] bg-[color-mix(in_srgb,var(--background)_78%,transparent)] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] backdrop-blur">
          {KIND_LABEL[artifact.kind] ?? artifact.kind}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[14px] font-semibold leading-5 text-[var(--foreground)]">{artifact.title}</h3>
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--faint)]" title={artifact.lastCommit ?? "not committed"}>
            {ageLabel(artifact.lastCommit)}
          </span>
        </div>
        <p className="text-[12.5px] leading-5 text-[var(--body)]">{artifact.description}</p>
        <p className="truncate font-mono text-[10px] text-[var(--muted)]" title={artifact.file}>{artifact.file}</p>
        <div className="mt-auto pt-1.5">
          <DecisionButtons decision={decision} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

export default function DesignArtifactReview({
  groups,
  artifacts,
}: {
  groups: DesignArtifactGroup[];
  artifacts: DesignArtifactWithDate[];
}) {
  const [state, setState] = useState<ReviewState>({});
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
      // ignore storage failures
    }
  }, [state, hydrated]);

  const setDecision = (id: string, next: Decision | undefined) =>
    setState((prev) => {
      const draft = { ...prev };
      if (next === undefined) delete draft[id];
      else draft[id] = next;
      return draft;
    });

  const counts = useMemo(() => {
    let keep = 0;
    let remove = 0;
    for (const a of artifacts) {
      if (state[a.id] === "keep") keep += 1;
      else if (state[a.id] === "remove") remove += 1;
    }
    return { keep, remove, undecided: artifacts.length - keep - remove };
  }, [state, artifacts]);

  const removalList = useMemo(
    () => artifacts.filter((a) => state[a.id] === "remove").map((a) => a.file),
    [state, artifacts],
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

  return (
    <div>
      {groups.map((group, gi) => {
        const groupArtifacts = artifacts.filter((a) => a.group === group.key);
        if (groupArtifacts.length === 0) return null;
        return (
          <section key={group.key} className="border-t border-[var(--border)] py-10">
            <header className="mb-6 max-w-2xl">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {String(gi + 1).padStart(2, "0")} · {groupArtifacts.length} {groupArtifacts.length === 1 ? "artifact" : "artifacts"}
              </p>
              <h2 className="mt-3 text-[22px] font-semibold leading-7 tracking-[-0.02em] text-[var(--foreground)]">{group.label}</h2>
              <p className="mt-3 text-[13px] leading-6 text-[var(--body)]">{group.blurb}</p>
            </header>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groupArtifacts.map((artifact) => (
                <ArtifactCard key={artifact.id} artifact={artifact} decision={state[artifact.id]} onChange={(next) => setDecision(artifact.id, next)} />
              ))}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-1 py-4 backdrop-blur">
        <dl className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.1em]">
          <div className="flex items-center gap-2"><dt className="text-[var(--muted)]">Keep</dt><dd className="font-semibold tabular-nums text-[var(--green)]">{hydrated ? counts.keep : "—"}</dd></div>
          <div className="flex items-center gap-2"><dt className="text-[var(--muted)]">Remove</dt><dd className="font-semibold tabular-nums text-[var(--red)]">{hydrated ? counts.remove : "—"}</dd></div>
          <div className="flex items-center gap-2"><dt className="text-[var(--muted)]">Undecided</dt><dd className="font-semibold tabular-nums text-[var(--body)]">{hydrated ? counts.undecided : "—"}</dd></div>
        </dl>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setState({})}
            className="rounded-[5px] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={copyRemovals}
            disabled={removalList.length === 0}
            className={`rounded-[5px] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
              removalList.length === 0 ? "cursor-not-allowed text-[var(--faint)]" : "bg-[var(--action)] text-[var(--action-foreground)] hover:opacity-90"
            }`}
          >
            {copied ? "Copied ✓" : `Copy removal list (${removalList.length})`}
          </button>
        </div>
      </div>
      <p className="px-1 pt-3 font-mono text-[10px] leading-5 text-[var(--faint)]">
        Decisions are stored locally in this browser. &ldquo;Copy removal list&rdquo; puts the marked file paths on your clipboard to hand off for deletion.
      </p>
    </div>
  );
}
