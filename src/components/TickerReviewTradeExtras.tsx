"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { addTradeAttachmentAction, setTradeTagAction } from "@/app/journal/actions";

export type ReviewTagOption = { name: string; uses: number };
export type ReviewAttachment = { id: number; filePath: string; caption: string | null };

export function TradeTagPicker({
  tradeId,
  selectedTags,
  options,
  readOnly,
}: {
  tradeId: number;
  selectedTags: string[];
  options: ReviewTagOption[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(selectedTags));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return undefined;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return options
      .filter((option) => !normalized || option.name.toLowerCase().includes(normalized))
      .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [options, query]);
  const exactMatch = options.some((option) => option.name.toLowerCase() === query.trim().toLowerCase());

  function toggleTag(tagName: string) {
    const nextSelected = !selected.has(tagName);
    setSelected((current) => {
      const next = new Set(current);
      if (nextSelected) next.add(tagName);
      else next.delete(tagName);
      return next;
    });

    const formData = new FormData();
    formData.set("tradeId", String(tradeId));
    formData.set("tagName", tagName);
    formData.set("selected", String(nextSelected));
    startTransition(async () => {
      const result = await setTradeTagAction(formData);
      if (!result.ok) {
        setSelected(new Set(selectedTags));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-2">
      {[...selected].map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => !readOnly && toggleTag(tag)}
          disabled={readOnly || pending}
          title={readOnly ? tag : `Remove ${tag}`}
          className="inline-flex h-7 items-center rounded-md bg-[var(--surface-2)] px-2.5 font-mono text-[11px] text-[var(--foreground)] transition-opacity disabled:cursor-default"
        >
          {tag}
        </button>
      ))}
      {!readOnly ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="h-7 rounded-md px-2.5 text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--surface-2)]"
        >
          + Add tags
        </button>
      ) : null}

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 max-h-[320px] w-[360px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
          <label className="sr-only" htmlFor={`trade-${tradeId}-tag-search`}>Search or create tags</label>
          <input
            id={`trade-${tradeId}-tag-search`}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search or create a tag"
            className="h-10 w-full rounded-md bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none ring-1 ring-[var(--hairline)] focus:ring-[var(--accent)]"
          />
          <div className="mt-2 space-y-1">
            {matches.map((option) => {
              const active = selected.has(option.name);
              return (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => toggleTag(option.name)}
                  className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-sm ${active ? "bg-[var(--action)] text-[var(--action-foreground)]" : "text-[var(--body)] hover:bg-[var(--surface-2)]"}`}
                >
                  <span>{option.name}</span>
                  <span className="font-mono text-[11px] opacity-60">{option.uses} uses</span>
                </button>
              );
            })}
            {query.trim() && !exactMatch ? (
              <button
                type="button"
                onClick={() => toggleTag(query.trim())}
                className="w-full rounded px-2.5 py-2 text-left text-sm font-semibold text-[var(--accent)] hover:bg-[var(--surface-2)]"
              >
                + Create “{query.trim()}”
              </button>
            ) : null}
          </div>
          {options.length > 0 ? (
            <div className="mt-3 border-t border-[var(--hairline)] pt-3">
              <div className="mb-2 text-[11px] text-[var(--muted)]">Recent</div>
              <div className="flex flex-wrap gap-2">
                {options.slice(0, 5).map((option) => (
                  <button
                    key={`recent-${option.name}`}
                    type="button"
                    onClick={() => toggleTag(option.name)}
                    className={`rounded-md px-2 py-1 font-mono text-[11px] ${selected.has(option.name) ? "bg-[var(--action)] text-[var(--action-foreground)]" : "bg-[var(--surface-2)] text-[var(--body)]"}`}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">Esc or click away closes · selections apply immediately</p>
        </div>
      ) : null}
    </div>
  );
}

function attachmentKind(filePath: string): "image" | "video" | "audio" | "file" {
  if (/\.(png|jpe?g|webp|gif)$/i.test(filePath)) return "image";
  if (/\.audio\.webm$/i.test(filePath)) return "audio";
  if (/\.(mp4|webm)$/i.test(filePath)) return "video";
  if (/\.(mp3|m4a|wav)$/i.test(filePath)) return "audio";
  return "file";
}

export function TradeAttachments({
  tradeId,
  attachments,
  readOnly,
}: {
  tradeId: number;
  attachments: ReviewAttachment[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadInFlightRef = useRef(false);
  const [addedAttachments, setAddedAttachments] = useState<ReviewAttachment[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const visibleAttachments = useMemo(() => {
    const merged = new Map(attachments.map((attachment) => [attachment.id, attachment]));
    for (const attachment of addedAttachments) merged.set(attachment.id, attachment);
    return [...merged.values()];
  }, [addedAttachments, attachments]);

  function upload(file: File | undefined) {
    if (!file || uploadInFlightRef.current) return;
    uploadInFlightRef.current = true;
    setError("");
    const formData = new FormData();
    formData.set("tradeId", String(tradeId));
    formData.set("file", file);
    startTransition(async () => {
      try {
        const result = await addTradeAttachmentAction(formData);
        if (!result.ok) {
          setError(result.error ?? "Could not add that attachment.");
          return;
        }
        const savedAttachment = result.attachment;
        if (!savedAttachment) throw new Error("Attachment upload returned no saved record.");
        setAddedAttachments((current) =>
          current.some((attachment) => attachment.id === savedAttachment.id)
            ? current
            : [...current, savedAttachment],
        );
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } catch {
        setError("Could not add that attachment. Try again.");
      } finally {
        uploadInFlightRef.current = false;
      }
    });
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!readOnly && !pending) upload(event.dataTransfer.files[0]);
  }

  if (readOnly && attachments.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-4">
        {visibleAttachments.map((attachment) => {
          const kind = attachmentKind(attachment.filePath);
          return (
            <figure key={attachment.id} className="w-full max-w-[280px]">
              <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)]">
                {kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.filePath} alt={attachment.caption ?? "Trade chart attachment"} className="h-40 w-full object-cover" />
                ) : kind === "video" ? (
                  <video src={attachment.filePath} controls className="h-40 w-full bg-black object-contain" />
                ) : kind === "audio" ? (
                  <div className="flex h-24 items-center px-3"><audio src={attachment.filePath} controls className="w-full" /></div>
                ) : (
                  <a href={attachment.filePath} className="block p-4 text-sm text-[var(--accent)]">Open attachment</a>
                )}
              </div>
              {attachment.caption ? <figcaption className="mt-2 truncate text-[11px] text-[var(--muted)]">{attachment.caption}</figcaption> : null}
            </figure>
          );
        })}

        {!readOnly ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            disabled={pending}
            className="flex h-40 w-full max-w-[280px] flex-col items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--background)] px-5 text-center transition-colors hover:border-[var(--accent)] disabled:opacity-60"
          >
            <span className="text-sm font-semibold text-[var(--foreground)]">{pending ? "Adding attachment…" : "Drop chart or recording"}</span>
            <span className="mt-2 text-[12px] text-[var(--muted)]">or browse files</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/webm"
        className="sr-only"
        onChange={(event) => upload(event.target.files?.[0])}
      />
      {error ? <p className="mt-2 text-[12px] text-[var(--red)]" aria-live="polite">{error}</p> : null}
    </div>
  );
}
