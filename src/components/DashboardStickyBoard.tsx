"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";

const PAPERS = {
  amber: { bg: "#f1cf5b", edge: "#d8b443", ink: "#34301f" },
  peach: { bg: "#f0ad84", edge: "#dd9870", ink: "#3a271c" },
  mint: { bg: "#bfe0a8", edge: "#a6cc8d", ink: "#243019" },
  sky: { bg: "#a8d0ef", edge: "#8fbbe0", ink: "#1c2c3a" },
} as const;

type PaperKey = keyof typeof PAPERS;

type StickyCue = {
  id: string;
  category: string;
  body: string;
  paper: PaperKey;
  x: number;
  y: number;
  rotation: number;
  done: boolean;
};

const PAPER_KEYS = Object.keys(PAPERS) as PaperKey[];
const STORAGE_KEY = "tj-dashboard-sticky-cues";
const NOTE_WIDTH = 196;
const NOTE_MIN_HEIGHT = 150;

const SEED_NOTES: StickyCue[] = [
  {
    id: "n1",
    category: "Execution",
    body: "Check Level 2 before you click. Is the offer stacked or thin?",
    paper: "amber",
    x: 18,
    y: 20,
    rotation: -3,
    done: false,
  },
  {
    id: "n2",
    category: "Setup",
    body: "Is volume confirming the move, or are you early again?",
    paper: "mint",
    x: 250,
    y: 40,
    rotation: 2.4,
    done: false,
  },
  {
    id: "n3",
    category: "Risk",
    body: "Max loss is -$150. It does not move. Ever.",
    paper: "peach",
    x: 486,
    y: 16,
    rotation: -1.6,
    done: false,
  },
  {
    id: "n4",
    category: "Mindset",
    body: "Wait for YOUR setup. FOMO is not a setup.",
    paper: "sky",
    x: 150,
    y: 196,
    rotation: 1.5,
    done: false,
  },
  {
    id: "n5",
    category: "Mindset",
    body: "You're green. Don't hand it back chasing a 5th trade.",
    paper: "amber",
    x: 392,
    y: 210,
    rotation: -2.6,
    done: false,
  },
];

const QUICK_CUES = [
  "Did I check Level 2?",
  "Is volume confirming?",
  "Am I forcing this?",
  "What's my exit before I enter?",
  "A+ only - walk if it's not.",
];

function readStoredNotes() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StickyCue[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function StickyNote({
  note,
  dragging,
  onChange,
  onDelete,
  onDragStart,
}: {
  note: StickyCue;
  dragging: boolean;
  onChange: (note: StickyCue) => void;
  onDelete: (id: string) => void;
  onDragStart: (event: PointerEvent<HTMLDivElement>, note: StickyCue) => void;
}) {
  const paper = PAPERS[note.paper];
  const bodyRef = useRef<HTMLDivElement>(null);

  function cyclePaper() {
    const currentIndex = PAPER_KEYS.indexOf(note.paper);
    onChange({ ...note, paper: PAPER_KEYS[(currentIndex + 1) % PAPER_KEYS.length] });
  }

  function commitBody() {
    const nextBody = bodyRef.current?.innerText.trim();
    if (nextBody !== undefined) onChange({ ...note, body: nextBody });
  }

  return (
    <div
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-no-drag]")) return;
        onDragStart(event, note);
      }}
      className="absolute select-none p-[14px_15px_16px] shadow-[0_10px_22px_-8px_rgba(0,0,0,.55),0_1px_2px_rgba(0,0,0,.3)] transition-[transform,box-shadow] duration-200"
      style={{
        left: note.x,
        top: note.y,
        width: NOTE_WIDTH,
        minHeight: NOTE_MIN_HEIGHT,
        transform: `rotate(${note.rotation}deg) scale(${dragging ? 1.04 : 1})`,
        transition: dragging ? "none" : undefined,
        background: paper.bg,
        color: paper.ink,
        cursor: dragging ? "grabbing" : "grab",
        opacity: note.done ? 0.62 : 1,
        zIndex: dragging ? 50 : 1,
        boxShadow: dragging
          ? "0 22px 40px -10px rgba(0,0,0,.6), 0 2px 4px rgba(0,0,0,.3)"
          : undefined,
      }}
    >
      <div className="absolute left-1/2 top-[-9px] h-[17px] w-[52px] -translate-x-1/2 rotate-[-1.5deg] rounded-[1px] border border-[rgba(255,255,255,.18)] bg-[rgba(255,255,255,.22)]" />

      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          data-no-drag
          onClick={cyclePaper}
          title="Change color"
          className="border-0 bg-transparent p-0 text-[13px] font-normal uppercase tracking-[0.08em] opacity-70"
          style={{
            color: paper.ink,
            fontFamily: "var(--font-patrick-hand-sc), var(--font-sans), system-ui, sans-serif",
          }}
        >
          {note.category}
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            data-no-drag
            onClick={() => onChange({ ...note, done: !note.done })}
            title="Mark as run"
            className="grid h-[22px] w-[22px] place-items-center rounded-[5px] bg-transparent p-0"
            style={{ border: `1.5px solid ${paper.edge}` }}
          >
            {note.done ? (
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                stroke={paper.bg}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
              >
                <path d="M2.5 6.2l2.3 2.3 4.5-4.8" />
              </svg>
            ) : null}
          </button>
          <button
            type="button"
            data-no-drag
            onClick={() => onDelete(note.id)}
            title="Remove"
            className="h-[22px] w-[22px] border-0 bg-transparent p-0 text-[17px] leading-none opacity-50"
            style={{ color: paper.ink }}
          >
            &times;
          </button>
        </div>
      </div>

      <div
        ref={bodyRef}
        data-no-drag
        contentEditable
        suppressContentEditableWarning
        onBlur={commitBody}
        className="min-h-[60px] cursor-text text-[22px] font-normal leading-[1.22] outline-none"
        style={{
          fontFamily: "var(--font-permanent-marker), var(--font-sans), system-ui, sans-serif",
          textDecoration: note.done ? "line-through rgba(0,0,0,.4)" : "none",
        }}
      >
        {note.body}
      </div>
    </div>
  );
}

export default function DashboardStickyBoard() {
  const [notes, setNotes] = useState<StickyCue[]>(() => readStoredNotes() ?? SEED_NOTES);
  const [drag, setDrag] = useState<null | { id: string; dx: number; dy: number }>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // Ignore storage failures; the board still works for the current session.
    }
  }, [notes]);

  useEffect(() => {
    if (!drag) return;
    const activeDrag = drag;

    function move(event: globalThis.PointerEvent) {
      const board = boardRef.current?.getBoundingClientRect();
      if (!board) return;

      const x = Math.max(
        0,
        Math.min(event.clientX - board.left - activeDrag.dx, board.width - NOTE_WIDTH),
      );
      const y = Math.max(
        0,
        Math.min(event.clientY - board.top - activeDrag.dy, board.height - NOTE_MIN_HEIGHT),
      );

      setNotes((current) =>
        current.map((note) => (note.id === activeDrag.id ? { ...note, x, y } : note)),
      );
    }

    function up() {
      setDrag(null);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag]);

  function updateNote(nextNote: StickyCue) {
    setNotes((current) => current.map((note) => (note.id === nextNote.id ? nextNote : note)));
  }

  function removeNote(id: string) {
    setNotes((current) => current.filter((note) => note.id !== id));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>, note: StickyCue) {
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;

    setDrag({
      id: note.id,
      dx: event.clientX - board.left - note.x,
      dy: event.clientY - board.top - note.y,
    });
    event.preventDefault();
  }

  function addNote(body = "") {
    nextIdRef.current += 1;
    const id = `n-new-${nextIdRef.current}`;
    setNotes((current) => [
      ...current,
      {
        id,
        category: "Cue",
        body,
        paper: PAPER_KEYS[current.length % PAPER_KEYS.length],
        x: 40 + Math.random() * 320,
        y: 40 + Math.random() * 140,
        rotation: Math.random() * 6 - 3,
        done: false,
      },
    ]);
  }

  const runCount = notes.filter((note) => note.done).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Cues on the glass
          </div>
          <span className="font-mono text-[11px] text-[var(--muted)]">
            {runCount}/{notes.length} run today
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_CUES.map((cue) => (
            <button
              key={cue}
              type="button"
              onClick={() => addNote(cue)}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--body)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]"
            >
              + {cue}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addNote()}
            className="rounded-full border border-[var(--blue)] bg-[rgba(77,155,255,.12)] px-3 py-1.5 text-[12px] font-semibold text-[var(--foreground)]"
          >
            + Blank note
          </button>
        </div>
      </div>

      <div
        ref={boardRef}
        className="relative h-[392px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
        style={{
          backgroundImage: "radial-gradient(var(--hairline) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {notes.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-[var(--muted)]">
            No cues posted. Add one from the quick cues above.
          </div>
        ) : null}
        {notes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            onChange={updateNote}
            onDelete={removeNote}
            onDragStart={startDrag}
            dragging={drag?.id === note.id}
          />
        ))}
      </div>
    </div>
  );
}
