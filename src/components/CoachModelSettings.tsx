"use client";

import { useState } from "react";

type ProviderId = "openai" | "anthropic" | "gemini" | "ollama" | "other";

type Provider = {
  id: ProviderId;
  name: string;
  label: string;
  status: "available" | "next" | "advanced";
  summary: string;
  fields: string[];
  notes: string[];
};

type CoachModelStatus = {
  openAiConfigured: boolean;
  openAiModel: string;
};

const PROVIDERS: Provider[] = [
  {
    id: "openai",
    name: "OpenAI / ChatGPT",
    label: "Best default",
    status: "available",
    summary: "Use the existing AI coach generation path with OpenAI Responses.",
    fields: ["OPENAI_API_KEY", "OPENAI_MODEL"],
    notes: [
      "Works today for live coach reviews.",
      "Best first path for quality and setup simplicity.",
      "Model defaults to the app's server-side setting when unset.",
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    label: "Frontier option",
    status: "next",
    summary: "Strong reasoning and writing fit for reflective coaching.",
    fields: ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"],
    notes: [
      "Provider adapter still needs to be added.",
      "Same coach payload and JSON contract should be reused.",
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    label: "Frontier option",
    status: "next",
    summary: "Good fit for users already in the Google AI ecosystem.",
    fields: ["GEMINI_API_KEY", "GEMINI_MODEL"],
    notes: [
      "Provider adapter still needs to be added.",
      "Useful as a top-level option, not an advanced-only escape hatch.",
    ],
  },
  {
    id: "ollama",
    name: "Ollama / Local model",
    label: "Private/local",
    status: "next",
    summary: "Run a local model endpoint for people who prefer local control.",
    fields: ["OLLAMA_BASE_URL", "OLLAMA_MODEL"],
    notes: [
      "Best for technical users and local-first workflows.",
      "Quality and latency will depend on the user's machine and chosen model.",
    ],
  },
  {
    id: "other",
    name: "Other OpenAI-compatible",
    label: "Advanced",
    status: "advanced",
    summary: "Bring a provider that supports an OpenAI-shaped chat API.",
    fields: ["AI_BASE_URL", "AI_API_KEY", "AI_MODEL"],
    notes: [
      "Advanced escape hatch for hosted gateways and model routers.",
      "Needs a compatibility adapter before live coach generation uses it.",
    ],
  },
];

function statusLabel(status: Provider["status"]) {
  if (status === "available") return "Available now";
  if (status === "advanced") return "Advanced";
  return "Adapter next";
}

export default function CoachModelSettings({
  status,
}: {
  status: CoachModelStatus;
}) {
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("openai");
  const provider = PROVIDERS.find((item) => item.id === selectedProvider) ?? PROVIDERS[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--hairline)] pt-4">
        <div className="min-w-0">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {status.openAiConfigured ? "Connected" : "Not connected"}
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--body)]">
            {status.openAiConfigured
              ? `OpenAI / ChatGPT is configured with ${status.openAiModel}.`
              : "Add a model provider before live coach reviews can run."}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="h-10 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]"
        >
          {open ? "Close" : status.openAiConfigured ? "Open" : "Add model"}
        </button>
      </div>

      {open ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {PROVIDERS.map((item) => {
              const selected = item.id === selectedProvider;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedProvider(item.id)}
                  className={[
                    "min-h-[124px] rounded-md border px-4 py-3 text-left transition-colors",
                    selected
                      ? "border-[var(--blue)] bg-[var(--surface)]"
                      : "border-[var(--border)] hover:border-[var(--blue)]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">{item.name}</div>
                      <div className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        {item.label}
                      </div>
                    </div>
                    <span className="rounded-sm border border-[var(--hairline)] px-2 py-1 font-mono text-[10px] uppercase text-[var(--muted)]">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-5 text-[var(--body)]">{item.summary}</p>
                </button>
              );
            })}
          </div>

          <div className="border-t border-[var(--hairline)] pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{provider.name}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Connect this provider from server-side local config. Do not paste keys into the
                  hosted read-only demo.
                </p>
              </div>
              {provider.id === "openai" ? (
                <span className="font-mono text-[12px] font-semibold uppercase text-[var(--muted)]">
                  {status.openAiConfigured ? "Connected" : "Missing key"}
                </span>
              ) : null}
            </div>

            <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-[12px] leading-6 text-[var(--body)]">
              {provider.fields.map((field) => (
                <div key={field}>
                  <span className="text-[var(--muted)]">{field}</span>
                  {provider.id === "openai" && field === "OPENAI_MODEL" ? (
                    <span className="text-[var(--foreground)]">={status.openAiModel}</span>
                  ) : null}
                </div>
              ))}
            </div>

            <ul className="mt-4 grid gap-2 text-sm leading-6 text-[var(--body)] sm:grid-cols-2">
              {provider.notes.map((note) => (
                <li key={note} className="border-t border-[var(--hairline)] pt-2">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
