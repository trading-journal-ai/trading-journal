"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import Tag, { TagIcon, tagVisualStyle } from "@/components/ui/Tag";

type TagCategory = "pattern" | "execution" | "risk" | "emotion";
type TagTone = "neutral" | "reinforcing" | "review";
type TagSentiment = "settled" | "activated";

type TagOption = {
  slug: string;
  label: string;
  category: TagCategory;
  tone: TagTone;
  sentiment?: TagSentiment;
  group?: string;
};

type TagSelection = {
  pattern: string | null;
  execution: string[];
  risk: string[];
  emotion: string[];
};

const CATEGORY_ORDER: TagCategory[] = ["pattern", "execution", "risk", "emotion"];

const CATEGORY_CONFIG: Record<
  TagCategory,
  {
    label: string;
    question: string;
    helper: string;
    limit: number;
  }
> = {
  pattern: {
    label: "Pattern",
    question: "What pattern did you trade?",
    helper: "Choose one primary pattern.",
    limit: 1,
  },
  execution: {
    label: "Execution",
    question: "How did you execute it?",
    helper: "Choose one entry assessment.",
    limit: 1,
  },
  risk: {
    label: "Risk",
    question: "Did a risk exception occur?",
    helper: "Optional. Choose up to two exceptions.",
    limit: 2,
  },
  emotion: {
    label: "Emotion",
    question: "What state affected the decision?",
    helper: "Optional. Use the note when the story needs more nuance.",
    limit: 2,
  },
};

const TAG_OPTIONS: TagOption[] = [
  { slug: "curl", label: "Curl", category: "pattern", tone: "neutral" },
  { slug: "micro-pullback", label: "Micro pullback", category: "pattern", tone: "neutral" },
  { slug: "flat-top-breakout", label: "Flat-top breakout", category: "pattern", tone: "neutral" },
  { slug: "reclaim", label: "Reclaim", category: "pattern", tone: "neutral" },
  { slug: "dip-buy", label: "Dip buy", category: "pattern", tone: "neutral" },
  { slug: "ema-rail", label: "EMA rail", category: "pattern", tone: "neutral" },
  { slug: "double-bottom", label: "Double bottom", category: "pattern", tone: "neutral" },
  { slug: "other-pattern", label: "Other", category: "pattern", tone: "neutral" },
  { slug: "chop", label: "Chop", category: "pattern", tone: "neutral" },

  { slug: "clean", label: "Clean", category: "execution", tone: "reinforcing", group: "entry-quality" },
  { slug: "early", label: "Early", category: "execution", tone: "review", group: "entry-quality" },
  { slug: "chased", label: "Chased", category: "execution", tone: "review", group: "entry-quality" },
  { slug: "anticipated", label: "Anticipated", category: "execution", tone: "review", group: "entry-quality" },
  { slug: "no-trigger", label: "No trigger", category: "execution", tone: "review", group: "entry-quality" },

  { slug: "undersized", label: "Undersized", category: "risk", tone: "review", group: "position-size" },
  { slug: "oversized", label: "Oversized", category: "risk", tone: "review", group: "position-size" },
  { slug: "averaged-down", label: "Averaged down", category: "risk", tone: "review" },
  { slug: "stop-ignored", label: "Stop ignored", category: "risk", tone: "review" },

  { slug: "calm", label: "Calm", category: "emotion", tone: "neutral", sentiment: "settled" },
  { slug: "focused", label: "Focused", category: "emotion", tone: "neutral", sentiment: "settled" },
  { slug: "hesitant", label: "Hesitant", category: "emotion", tone: "neutral", sentiment: "activated" },
  { slug: "impatient", label: "Impatient", category: "emotion", tone: "neutral", sentiment: "activated" },
  { slug: "frustrated", label: "Frustrated", category: "emotion", tone: "neutral", sentiment: "activated" },
  { slug: "fomo", label: "FOMO", category: "emotion", tone: "neutral", sentiment: "activated" },
];

const INITIAL_SELECTION: TagSelection = {
  pattern: "curl",
  execution: ["clean"],
  risk: [],
  emotion: [],
};


const TICKERS = [
  { symbol: "CRVO", pnl: "+$234.60", tone: "positive" as const },
  { symbol: "SUGP", pnl: "+$5.00", tone: "positive" as const },
  { symbol: "LASE", pnl: "$0.00", tone: "neutral" as const },
  { symbol: "PMAX", pnl: "-$89.25", tone: "negative" as const },
];

function tagBySlug(slug: string | null, options: TagOption[] = TAG_OPTIONS): TagOption | undefined {
  return slug ? options.find((tag) => tag.slug === slug) : undefined;
}

function selectedSlugs(selection: TagSelection, category: TagCategory): string[] {
  if (category === "pattern") return selection.pattern ? [selection.pattern] : [];
  return selection[category];
}

function selectedTags(selection: TagSelection, options: TagOption[]): TagOption[] {
  return CATEGORY_ORDER.flatMap((category) =>
    selectedSlugs(selection, category).flatMap((slug) => {
      const tag = tagBySlug(slug, options);
      return tag ? [tag] : [];
    }),
  );
}

export default function TagTaxonomyPrototypePage() {
  const [selection, setSelection] = useState<TagSelection>(INITIAL_SELECTION);
  const [note, setNote] = useState("");
  const activeTags = useMemo(() => selectedTags(selection, TAG_OPTIONS), [selection]);

  function selectTag(tag: TagOption) {
    setSelection((current) => {
      if (tag.category === "pattern") {
        return { ...current, pattern: current.pattern === tag.slug ? null : tag.slug };
      }

      const category = tag.category;
      const currentlySelected = current[category];
      if (currentlySelected.includes(tag.slug)) {
        return {
          ...current,
          [category]: currentlySelected.filter((slug) => slug !== tag.slug),
        };
      }

      const withoutExclusiveConflict = tag.group
        ? currentlySelected.filter((slug) => tagBySlug(slug)?.group !== tag.group)
        : currentlySelected;
      if (withoutExclusiveConflict.length >= CATEGORY_CONFIG[category].limit) return current;

      return {
        ...current,
        [category]: [...withoutExclusiveConflict, tag.slug],
      };
    });
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--body)]">
      <PrototypeHeader />

      <div className="mx-auto w-full max-w-[1440px] px-5 pb-20 pt-9 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-5 border-b border-[var(--hairline)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Tag taxonomy prototype
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <h1 className="text-4xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">CRVO</h1>
              <span className="font-mono text-lg font-semibold tabular-nums text-[var(--green)]">+$234.60</span>
            </div>
            <p className="mt-3 font-mono text-[12px] tabular-nums text-[var(--muted)]">
              Jun 16, 2026 · 1 trade · 1,300 shares · 100% win
            </p>
          </div>
          <Link
            href="/review/journal"
            className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            Review hub
          </Link>
        </div>

        <TickerRail />

        <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(520px,.95fr)]">
          <section aria-labelledby="review-title" className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="review-title" className="text-2xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  How did I trade CRVO?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Worth 30 seconds each · Best trade +$234.60</p>
              </div>
            </div>

            <InlineTagEditor
              selection={selection}
              options={TAG_OPTIONS}
              activeTags={activeTags}
              onSelectTag={selectTag}
            />

            <label className="mt-7 block">
              <span className="text-base font-semibold text-[var(--foreground)]">
                How did CRVO trade, and how did you trade it?
              </span>
              <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">
                Write naturally. Tags give Coach structure; the note carries the nuance.
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={8}
                placeholder="Talk through what happened, what you saw, where standards held or slipped, and what to remember next time."
                className="mt-4 min-h-[210px] w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-[15px] leading-7 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
              />
            </label>
          </section>

          <TradeLedger />
        </div>
      </div>
    </main>
  );
}

function PrototypeHeader() {
  return (
    <header className="border-b border-[var(--hairline)] bg-[var(--background)]">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-8 px-5 sm:px-8 lg:px-12">
        <Link href="/" className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">
          Trading Journal AI
        </Link>
        <nav aria-label="Prototype navigation" className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
          <Link href="/dashboard" className="hover:text-[var(--foreground)]">Dashboard</Link>
          <Link href="/journal" className="font-semibold text-[var(--foreground)]">Journal</Link>
          <Link href="/calendar" className="hover:text-[var(--foreground)]">Calendar</Link>
          <Link href="/trades" className="hover:text-[var(--foreground)]">Trades</Link>
          <Link href="/analytics" className="hover:text-[var(--foreground)]">Analytics</Link>
        </nav>
        <span className="ml-auto rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--body)]">
          Prototype
        </span>
      </div>
    </header>
  );
}

function TickerRail() {
  return (
    <section aria-labelledby="traded-today-title" className="mt-8">
      <h2 id="traded-today-title" className="text-sm font-medium text-[var(--muted)]">Traded this day</h2>
      <div className="mt-3 divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
        {TICKERS.map((ticker) => (
          <div
            key={ticker.symbol}
            className={`flex items-center justify-between py-3 font-mono text-[12px] ${ticker.symbol === "CRVO" ? "border-l-2 border-[var(--accent)] bg-[var(--surface)] px-3" : "px-3"}`}
          >
            <span className={ticker.symbol === "CRVO" ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]"}>{ticker.symbol}</span>
            <span className={ticker.tone === "positive" ? "text-[var(--green)]" : ticker.tone === "negative" ? "text-[var(--red)]" : "text-[var(--muted)]"}>{ticker.pnl}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TradeLedger() {
  return (
    <aside aria-labelledby="trade-ledger-title" className="min-w-0 xl:pt-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--hairline)] pb-4 font-mono text-[12px] text-[var(--muted)]">
        <span id="trade-ledger-title">1 trade</span>
        <span>·</span>
        <span>100% accuracy</span>
        <span>·</span>
        <span>PF ∞</span>
        <span>·</span>
        <span className="text-[var(--green)]">+$234.60 total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full min-w-[520px] text-left text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <tr className="border-b border-[var(--hairline)]">
              <th className="py-3 font-medium">Trade</th>
              <th className="py-3 font-medium">Shares</th>
              <th className="py-3 font-medium">Entry / exit</th>
              <th className="py-3 font-medium">Per share</th>
              <th className="py-3 font-medium">Held</th>
              <th className="py-3 text-right font-medium">P&amp;L</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[12px] tabular-nums text-[var(--body)]">
            <tr className="border-b border-[var(--hairline)]">
              <td className="py-4">1 · 11:00</td>
              <td className="py-4">1,300</td>
              <td className="py-4">$3.95 / $4.13</td>
              <td className="py-4 text-[var(--green)]">+$0.18</td>
              <td className="py-4">2m 06s</td>
              <td className="py-4 text-right text-[var(--green)]">+$234.60</td>
            </tr>
          </tbody>
        </table>
      </div>
    </aside>
  );
}

function InlineTagEditor({
  selection,
  options,
  activeTags,
  onSelectTag,
}: {
  selection: TagSelection;
  options: TagOption[];
  activeTags: TagOption[];
  onSelectTag: (tag: TagOption) => void;
}) {
  const [openCategory, setOpenCategory] = useState<TagCategory | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openCategory) return undefined;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest("[data-tag-category-trigger]")) return;
      if (!menuRef.current?.contains(target)) setOpenCategory(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenCategory(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openCategory]);

  return (
    <div className="relative mt-6 border-y border-[var(--hairline)] py-4">
      <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Trade classification
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((category) => {
          const categoryOptions = options.filter((tag) => tag.category === category);
          const activeSlugs = selectedSlugs(selection, category);
          const menuOpen = openCategory === category;

          return (
            <div key={category} className="relative">
              <button
                type="button"
                data-testid={"tag-category-" + category}
                data-tag-category-trigger
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setOpenCategory((current) => (current === category ? null : category))}
                className="inline-flex h-8 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                {CATEGORY_CONFIG[category].label}
              </button>

              {menuOpen ? (
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label={CATEGORY_CONFIG[category].label + " tags"}
                  className={"absolute top-[calc(100%+7px)] z-30 w-[230px] overflow-hidden rounded-lg border border-[#e7e0d5] bg-[#fcfaf7] p-1.5 text-[#211e18] shadow-[0_18px_44px_-14px_rgba(0,0,0,.55)] " + (category === "emotion" ? "right-0" : "left-0")}
                >
                  <div className="px-2.5 pb-1.5 pt-1">
                    <div className="text-[12px] font-semibold">{CATEGORY_CONFIG[category].question}</div>
                    <div className="mt-0.5 text-[10.5px] leading-4 text-[#7a7469]">{CATEGORY_CONFIG[category].helper}</div>
                  </div>

                  <div className="mt-1 border-t border-[#eee8de] pt-1">
                    {categoryOptions.map((tag) => {
                      const selected = activeSlugs.includes(tag.slug);
                      const hasGroupReplacement = Boolean(
                        tag.group &&
                        activeSlugs.some((slug) => tagBySlug(slug, options)?.group === tag.group),
                      );
                      const atLimit = category !== "pattern" && activeSlugs.length >= CATEGORY_CONFIG[category].limit;
                      const disabled = !selected && atLimit && !hasGroupReplacement;
                      const visualStyle = tagVisualStyle(tag);

                      return (
                        <button
                          key={tag.slug}
                          type="button"
                          data-testid={"tag-option-" + tag.slug}
                          role={category === "pattern" || category === "execution" ? "menuitemradio" : "menuitemcheckbox"}
                          aria-checked={selected}
                          disabled={disabled}
                          onClick={() => {
                            onSelectTag(tag);
                            if (category === "pattern" || category === "execution") setOpenCategory(null);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-[#f2ede5] focus-visible:outline-2 focus-visible:outline-[#b06e2a] disabled:cursor-default disabled:opacity-35"
                          style={selected ? { backgroundColor: visualStyle.background, color: visualStyle.foreground, fontWeight: 600 } : undefined}
                        >
                          <span style={selected ? undefined : { color: visualStyle.foreground }}>
                            <TagIcon tag={tag} size={14} />
                          </span>
                          <span>{tag.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div data-testid="selected-tags" className="mt-3 flex min-h-6 flex-wrap gap-1.5">
        {activeTags.length > 0 ? (
          activeTags.map((tag) => (
            <Tag key={tag.slug} label={tag.label} category={tag.category} tone={tag.tone} sentiment={tag.sentiment} />
          ))
        ) : (
          <span className="text-sm text-[var(--muted)]">No classification yet.</span>
        )}
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
        Tags are your assessment. Coach compares them with the playbook and available trade evidence.
      </p>
    </div>
  );
}
