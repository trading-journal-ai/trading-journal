"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { sendCoachChatMessageAction } from "@/app/coach/actions";
import DictationTextarea, { type DictationStatus } from "@/components/DictationTextarea";
import type { CoachChatMessage, CoachChatReply } from "@/lib/coach/chat";

type UiMessage = CoachChatMessage & {
  id: string;
  source?: CoachChatReply["source"];
  model?: string;
};

const STARTER_PROMPTS = [
  "I'm spiraling and need help stepping away.",
  "Talk me through today without making it about P&L.",
  "Help me stop trading for the day.",
  "What should I review before tomorrow?",
];

const INTRO_MESSAGE: UiMessage = {
  id: "intro",
  role: "assistant",
  content: "I'm here for the debrief: completed trades, trader state, process drift, and getting you back to the plan. No live trade calls.",
  source: "fallback",
  model: "preview",
};

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function currentActivity({
  dictationStatus,
  isPending,
  modelConfigured,
}: {
  dictationStatus: DictationStatus;
  isPending: boolean;
  modelConfigured: boolean;
}) {
  if (dictationStatus === "recording") {
    return {
      label: "Recording",
      detail: "Speak naturally. When you stop, this turn will transcribe and send automatically.",
      tone: "active",
    };
  }

  if (dictationStatus === "transcribing") {
    return {
      label: "Transcribing",
      detail: "Converting your audio into text, then sending it to the coach.",
      tone: "active",
    };
  }

  if (isPending) {
    return {
      label: "Coach thinking",
      detail: "Reading the conversation and preparing a process-focused response.",
      tone: "active",
    };
  }

  return {
    label: modelConfigured ? "Ready" : "Preview fallback",
    detail: modelConfigured
      ? "Type and send, or dictate a turn and stop recording to send automatically."
      : "Voice is ready, but the coach brain is not connected to a live model yet.",
    tone: modelConfigured ? "idle" : "active",
  };
}

export default function CoachChatPreview({
  modelConfigured,
  modelName,
}: {
  modelConfigured: boolean;
  modelName: string;
}) {
  const [messages, setMessages] = useState<UiMessage[]>([INTRO_MESSAGE]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dictationStatus, setDictationStatus] = useState<DictationStatus>("idle");
  const [isPending, startTransition] = useTransition();
  const messageListRef = useRef<HTMLDivElement | null>(null);

  const activity = currentActivity({ dictationStatus, isPending, modelConfigured });

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    const userMessage: UiMessage = {
      id: nextId(),
      role: "user",
      content: trimmed,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setError(null);

    startTransition(async () => {
      try {
        const reply = await sendCoachChatMessageAction(
          nextMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        );
        setMessages((current) => [
          ...current,
          {
            id: nextId(),
            role: "assistant",
            content: reply.content,
            source: reply.source,
            model: reply.model,
          },
        ]);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Coach chat failed.");
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  function onDictationComplete(nextValue: string) {
    sendMessage(nextValue);
  }

  return (
    <div className="grid min-h-[calc(100vh-132px)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-[620px] flex-col border-t border-[var(--hairline)] pt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase text-[var(--muted)]">
              AI Coach preview
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Reset, debrief, and get back to process.
            </h1>
          </div>
        </div>

        {!modelConfigured ? (
          <div className="mt-5 rounded-md border border-[var(--red)] px-4 py-3 text-sm leading-6 text-[var(--body)]" role="status">
            Dictation is working, but the coach is using preview fallback because
            <span className="font-mono text-[12px] text-[var(--foreground)]"> OPENAI_API_KEY </span>
            is not set for the running app.
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-[var(--hairline)] px-4 py-3 text-sm leading-6 text-[var(--body)]" role="status">
            Live coach model connected:
            <span className="ml-1 font-mono text-[12px] text-[var(--foreground)]">{modelName}</span>
          </div>
        )}

        <div
          ref={messageListRef}
          className="mt-6 flex-1 space-y-4 overflow-y-auto border-y border-[var(--hairline)] py-5 pr-1"
          aria-live="polite"
        >
          {messages.map((message) => (
            <article
              key={message.id}
              className={[
                "max-w-[860px] rounded-md border px-4 py-3",
                message.role === "user"
                  ? "ml-auto border-[var(--border)] bg-[var(--surface)]"
                  : "border-[var(--hairline)] bg-transparent",
              ].join(" ")}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-[11px] font-semibold uppercase text-[var(--muted)]">
                  {message.role === "user" ? "You" : "Coach"}
                </div>
                {message.role === "assistant" && message.source ? (
                  <div className="font-mono text-[10px] uppercase text-[var(--faint)]">
                    {message.source === "openai" ? message.model : "Preview fallback"}
                  </div>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--body)]">
                {message.content}
              </p>
            </article>
          ))}

          {isPending ? (
            <div className="max-w-[860px] rounded-md border border-[var(--hairline)] px-4 py-3">
              <div className="font-mono text-[11px] font-semibold uppercase text-[var(--muted)]">
                Coach
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--body)]">Thinking through the reset...</p>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-[var(--red)] px-4 py-3 text-sm leading-6 text-[var(--body)]" role="alert">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4">
          <div
            className={[
              "mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3",
              activity.tone === "active"
                ? "border-[var(--blue)] bg-[color-mix(in_srgb,var(--blue)_7%,transparent)]"
                : "border-[var(--hairline)] bg-transparent",
            ].join(" ")}
            aria-live="polite"
          >
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase text-[var(--muted)]">
                {activity.label}
              </div>
              <p className="mt-1 text-sm leading-5 text-[var(--body)]">
                {activity.detail}
              </p>
            </div>
            {activity.tone === "active" ? (
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="size-1.5 rounded-full bg-[var(--blue)] opacity-40" />
                <span className="size-1.5 rounded-full bg-[var(--blue)] opacity-70" />
                <span className="size-1.5 rounded-full bg-[var(--blue)]" />
              </div>
            ) : null}
          </div>
          <label htmlFor="coach-chat-message" className="sr-only">
            Message the AI coach
          </label>
          <DictationTextarea
            id="coach-chat-message"
            value={draft}
            onValueChange={setDraft}
            onDictationStatusChange={setDictationStatus}
            onDictationComplete={onDictationComplete}
            placeholder="What happened, what are you feeling, and are you still trading?"
            rows={4}
            className="min-h-[116px] w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--blue)]"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Stop dictation to auto-send. Completed-trade debriefs only; no live entries, exits, alerts, or position instructions.
            </p>
            <button
              type="submit"
              disabled={!draft.trim() || isPending || dictationStatus === "transcribing"}
              className="h-10 rounded-md border border-[var(--blue)] px-5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:text-[var(--faint)]"
            >
              {dictationStatus === "transcribing" ? "Transcribing" : isPending ? "Sending" : "Send"}
            </button>
          </div>
        </form>
      </section>

      <aside className="border-t border-[var(--hairline)] pt-5">
        <div className="font-mono text-[11px] font-semibold uppercase text-[var(--muted)]">
          Reset prompts
        </div>
        <div className="mt-4 grid gap-3">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={isPending}
              className="rounded-md border border-[var(--hairline)] px-4 py-3 text-left text-sm leading-5 text-[var(--body)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-8 border-t border-[var(--hairline)] pt-5">
          <div className="font-mono text-[11px] font-semibold uppercase text-[var(--muted)]">
            Conversation path
          </div>
          <dl className="mt-4 space-y-4 text-sm leading-6">
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Now</dt>
              <dd className="mt-1 text-[var(--body)]">Local Whisper dictation, editable text, then live model response.</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--foreground)]">Next</dt>
              <dd className="mt-1 text-[var(--body)]">
                Save useful coach sessions to the trading date once the text flow feels right.
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
