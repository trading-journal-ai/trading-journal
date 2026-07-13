"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import DictationTextarea, { type DictationStatus } from "@/components/DictationTextarea";
import { SETUP_PATTERN_CUES } from "@/lib/journalLabels";

type SharedNoteComposerProps = {
  name: string;
  defaultValue: string;
  placeholder: string;
  rows?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  pendingLabel?: string;
  onCancel?: () => void;
  helper?: ReactNode;
  showSetupPatternCues?: boolean;
  actionsSlot?: ReactNode;
  className?: string;
  localStorageKey?: string;
  onLocalSave?: (value: string) => void;
  onTextChange?: (value: string) => void;
  primaryAction?: boolean;
  value?: string;
  textareaId?: string;
  textareaClassName?: string;
  dictationPromptMode?: boolean;
  dictationPromptContent?: ReactNode;
  hideActions?: boolean;
  onDictationStatusChange?: (status: DictationStatus) => void;
};

function SetupPatternCues() {
  return (
    <div className="space-y-2">
      <div className="text-[12px] font-semibold text-[var(--muted)]">
        Setup / pattern
      </div>
      <div className="flex flex-wrap gap-2">
        {SETUP_PATTERN_CUES.map((cue) => (
          <span
            key={cue.value}
            title="Playbook placeholder"
            className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] text-[var(--foreground)]"
          >
            {cue.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SharedNoteComposer({
  name,
  defaultValue,
  placeholder,
  rows = 4,
  autoFocus = false,
  disabled = false,
  pending = false,
  submitLabel,
  pendingLabel = "Saving...",
  onCancel,
  helper,
  showSetupPatternCues = false,
  actionsSlot,
  className = "",
  localStorageKey,
  onLocalSave,
  onTextChange,
  primaryAction = false,
  value,
  textareaId,
  textareaClassName,
  dictationPromptMode = false,
  dictationPromptContent,
  hideActions = false,
  onDictationStatusChange,
}: SharedNoteComposerProps) {
  const [initialValue, setInitialValue] = useState(defaultValue);
  const [savedLocal, setSavedLocal] = useState(false);
  const [dictationBusy, setDictationBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const actionsHiddenAtDictationStartRef = useRef(hideActions);
  const inputKey = `${localStorageKey ?? "server"}:${initialValue}`;
  const localMode = Boolean(localStorageKey);
  // Freeze the actions row in its pre-dictation state while recording, so
  // streamed live text doesn't pop the row in (or out) mid-dictation.
  const actionsHidden = dictationBusy ? actionsHiddenAtDictationStartRef.current : hideActions;

  function handleDictationStatusChange(status: DictationStatus) {
    const busy = status === "recording" || status === "transcribing";
    if (busy && !dictationBusy) actionsHiddenAtDictationStartRef.current = hideActions;
    setDictationBusy(busy);
    onDictationStatusChange?.(status);
  }

  useEffect(() => {
    // Hydrate browser-local demo notes after mount; localStorage is not available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedLocal(false);
    if (!localStorageKey || typeof window === "undefined") {
      setInitialValue(defaultValue);
      return;
    }

    setInitialValue(window.localStorage.getItem(localStorageKey) ?? defaultValue);
  }, [defaultValue, localStorageKey]);

  function handleLocalSave() {
    if (!localStorageKey || typeof window === "undefined") return;

    const textarea = rootRef.current?.querySelector("textarea");
    const value = textarea?.value ?? "";
    if (value.trim()) {
      window.localStorage.setItem(localStorageKey, value);
    } else {
      window.localStorage.removeItem(localStorageKey);
    }

    setSavedLocal(true);
    onLocalSave?.(value);
  }

  return (
    <div ref={rootRef} className={`space-y-4 ${className}`}>
      {helper ? <div className="max-w-[42rem] text-sm leading-6 text-[var(--muted)]">{helper}</div> : null}
      {showSetupPatternCues ? <SetupPatternCues /> : null}
      <div className="block space-y-2">
        <span className="sr-only">Note</span>
        <DictationTextarea
          key={inputKey}
          id={textareaId}
          name={name}
          rows={rows}
          autoFocus={autoFocus}
          disabled={disabled}
          defaultValue={initialValue}
          value={value}
          placeholder={placeholder}
          onValueChange={onTextChange}
          onDictationStatusChange={handleDictationStatusChange}
          promptMode={dictationPromptMode}
          promptContent={dictationPromptContent}
          className={textareaClassName ?? "min-h-[128px] w-full resize-y rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"}
        />
      </div>
      {!actionsHidden ? <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{savedLocal ? <span className="text-[11px] text-[var(--muted)]">Saved in this browser</span> : null}</div>
        <div className="flex justify-end gap-2">
          {actionsSlot}
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-md px-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
          ) : null}
          <button
            type={localMode ? "button" : "submit"}
            onClick={localMode ? handleLocalSave : undefined}
            disabled={disabled || pending}
            className={primaryAction
              ? "h-10 rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              : "h-10 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"}
          >
            {pending ? pendingLabel : submitLabel}
          </button>
        </div>
      </div> : null}
    </div>
  );
}
