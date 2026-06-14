"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  EMOTION_PILLS,
  PRIMARY_TRADE_LABELS,
  PROCESS_PILLS,
  journalLabelTone,
  type JournalLabelOption,
} from "@/lib/journalLabels";

function toneDotClass(label: string) {
  const tone = journalLabelTone(label);
  if (tone === "positive") return "bg-[var(--green)]";
  if (tone === "negative") return "bg-[var(--red)]";
  return "bg-[var(--muted)]";
}

function labelToneClass(label: string) {
  const tone = journalLabelTone(label);
  if (tone === "positive") return "border-[var(--green)] text-[var(--green)]";
  if (tone === "negative") return "border-[var(--red)] text-[var(--red)]";
  return "border-[var(--border)] text-[var(--muted)]";
}

export function JournalNotePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[11px] text-[var(--foreground)]">
      <span className={`size-1 rounded-full ${toneDotClass(label)}`} />
      {label}
    </span>
  );
}

function PrimaryLabelBadge({ label }: { label: string }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] ${labelToneClass(
        label,
      )}`}
    >
      {label}
    </span>
  );
}

function PillCheckbox({
  name,
  option,
  defaultChecked,
}: {
  name: string;
  option: JournalLabelOption;
  defaultChecked: boolean;
}) {
  return (
    <label>
      <input
        type="checkbox"
        name={name}
        value={option.value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[11px] text-[var(--foreground)] transition-colors peer-checked:bg-[var(--surface)]">
        <span className={`size-1 rounded-full ${toneDotClass(option.value)}`} />
        {option.label}
      </span>
    </label>
  );
}

function PillGroup({
  title,
  name,
  options,
  selected,
}: {
  title: string;
  name: string;
  options: JournalLabelOption[];
  selected: string[];
}) {
  const selectedSet = new Set(selected);

  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <PillCheckbox
            key={option.value}
            name={name}
            option={option}
            defaultChecked={selectedSet.has(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

export default function TradeNoteFormFields({
  symbol,
  defaultPrimaryLabel,
  defaultText,
  defaultProcessTags = [],
  defaultEmotionTags = [],
  pending = false,
  onCancel,
  deleteControl,
  showHeader = true,
}: {
  symbol: string;
  defaultPrimaryLabel: string | null;
  defaultText: string;
  defaultProcessTags?: string[];
  defaultEmotionTags?: string[];
  pending?: boolean;
  onCancel: () => void;
  deleteControl?: ReactNode;
  showHeader?: boolean;
}) {
  const [primaryLabel, setPrimaryLabel] = useState(defaultPrimaryLabel ?? "");

  return (
    <div className="space-y-5">
      {showHeader ? (
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[15px] font-semibold text-[var(--foreground)]">
            {symbol}
          </span>
          {primaryLabel ? <PrimaryLabelBadge label={primaryLabel} /> : null}
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Primary label
        </span>
        <select
          name="primaryLabel"
          value={primaryLabel}
          onChange={(event) => setPrimaryLabel(event.target.value)}
          className="h-10 w-full max-w-64 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--blue)]"
        >
          <option value="">Optional</option>
          {PRIMARY_TRADE_LABELS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="sr-only">Note</span>
        <textarea
          name="note"
          rows={4}
          autoFocus
          defaultValue={defaultText}
          placeholder="What happened? Good trade, bad trade, rule break, lesson, emotion, setup quality..."
          className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--blue)]"
        />
      </label>

      <div className="space-y-4">
        <PillGroup
          title="Process"
          name="processTags"
          options={PROCESS_PILLS}
          selected={defaultProcessTags}
        />
        <PillGroup
          title="Emotion"
          name="emotionTags"
          options={EMOTION_PILLS}
          selected={defaultEmotionTags}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>{deleteControl}</div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md px-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save note"}
          </button>
        </div>
      </div>
    </div>
  );
}
