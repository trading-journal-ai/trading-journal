"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { upsertScopedNoteAction } from "@/app/journal/actions";
import SharedNoteComposer from "@/components/SharedNoteComposer";
import useLocalStorageText from "@/components/useLocalStorageText";
import { demoRecapNoteKey } from "@/lib/demoLocalNotes";
import {
  GUIDED_REFLECTION_PROMPTS,
  parseGuidedReflection,
  serializeGuidedReflection,
} from "@/lib/guidedReflection";

function combineDayNote({
  text,
  thesis,
  whatWentWell,
  whatWentWrong,
  emotionalState,
}: {
  text: string;
  thesis: string;
  whatWentWell: string;
  whatWentWrong: string;
  emotionalState: string;
}) {
  const sections = [
    thesis ? `Intent: ${thesis}` : "",
    whatWentWell ? `Did well: ${whatWentWell}` : "",
    whatWentWrong ? `Standards drift: ${whatWentWrong}` : "",
    emotionalState ? `State: ${emotionalState}` : "",
    text,
  ].filter(Boolean);

  return sections.join("\n\n");
}

function reflectionPresentation(text: string) {
  const heading = text.match(/^Session reflection\s*[—–-]\s*added\s+([^\r\n]+)(?:\r?\n)+/i);
  if (!heading) return { body: text, meta: "" };

  return {
    body: text.slice(heading[0].length).trimStart(),
    meta: `Added ${heading[1].trim()}`,
  };
}

export default function RecapNote({
  scope,
  scopeKey,
  text,
  thesis = "",
  whatWentWell = "",
  whatWentWrong = "",
  emotionalState = "",
  placeholder,
  readOnly = false,
  guided = false,
  reflectionOnly = false,
}: {
  scope: "day" | "week" | "month";
  scopeKey: string;
  text: string;
  thesis?: string;
  whatWentWell?: string;
  whatWentWrong?: string;
  emotionalState?: string;
  placeholder: string;
  readOnly?: boolean;
  /** Renders the day-note reflection prompts as separate optional fields. */
  guided?: boolean;
  /** Edit only the general reflection while retaining saved guided answers. */
  reflectionOnly?: boolean;
}) {
  const structuredDay = scope === "day" && (guided || reflectionOnly);
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(upsertScopedNoteAction, null);
  const localStorageKey = readOnly ? demoRecapNoteKey(scope, scopeKey) : undefined;
  const titleBreak = placeholder.indexOf(":");
  const emptyTitle = titleBreak === -1 ? `Add a ${scope} recap` : placeholder.slice(0, titleBreak).trim();
  const emptyHelper = titleBreak === -1 ? placeholder : placeholder.slice(titleBreak + 1).trim();
  const editorText = scope === "day"
    ? combineDayNote({ text, thesis, whatWentWell, whatWentWrong, emotionalState })
    : text;
  const [displayText, setDisplayText] = useLocalStorageText(localStorageKey, editorText);
  const [guidedFreeform, setGuidedFreeform] = useState("");
  const [guidedAnswers, setGuidedAnswers] = useState<[string, string, string]>(["", "", ""]);
  const [refreshRequested, setRefreshRequested] = useState(false);
  const handledActionState = useRef<unknown>(null);
  const inputIdRoot = `${scope}-${scopeKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const parsedGuidedReflection = structuredDay ? parseGuidedReflection(displayText) : null;
  const presentedReflection = parsedGuidedReflection
    ? reflectionPresentation(parsedGuidedReflection.freeform)
    : null;
  const saveError = state && !state.ok ? ("error" in state && typeof state.error === "string" ? state.error : "Could not save your note. Try again.") : null;
  const coachError = state && "coachError" in state && typeof state.coachError === "string" ? state.coachError : null;
  const coachRefreshed = state && "coachRefreshed" in state && state.coachRefreshed === true;

  useEffect(() => {
    // An action result stays in useActionState until the next submit. Handle it
    // once so reopening an editor never replays a previous successful save.
    if (state?.ok && handledActionState.current !== state) {
      handledActionState.current = state;
      if (structuredDay) {
        setDisplayText(serializeGuidedReflection({ freeform: guidedFreeform, answers: guidedAnswers }));
      }
      if (coachRefreshed) {
        window.dispatchEvent(new CustomEvent("coach-review-refreshed", { detail: { scope, scopeKey } }));
      }
      setEditing(false);
    }
  }, [coachRefreshed, structuredDay, guidedAnswers, guidedFreeform, scope, scopeKey, setDisplayText, state]);

  function openEditor() {
    if (parsedGuidedReflection) {
      setGuidedFreeform(parsedGuidedReflection.freeform);
      setGuidedAnswers(parsedGuidedReflection.answers);
    }
    setEditing(true);
  }

  function updateGuidedAnswer(index: number, value: string) {
    setGuidedAnswers((answers) => {
      const next = [...answers] as [string, string, string];
      next[index] = value;
      return next;
    });
  }

  if (!editing && !(reflectionOnly && !displayText.trim())) {
    return (
      <div>
        {displayText ? (
          <div>
            {structuredDay ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[16px] font-semibold text-[var(--foreground)]">Overall thoughts</h3>
                  {presentedReflection?.meta ? <p className="mt-1 text-[12px] text-[var(--muted)]">{presentedReflection.meta}</p> : null}
                </div>
                <button type="button" onClick={openEditor} aria-label="Edit day reflection" className="min-h-10 shrink-0 px-2 text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">Edit</button>
              </div>
            ) : (
              <button type="button" onClick={openEditor} className="text-[13px] font-semibold text-[var(--accent)]" title="Click to edit">Edit {scope} recap</button>
            )}
            {parsedGuidedReflection ? (
              <div className="mt-3 max-w-[70ch] space-y-7">
                {reflectionOnly && !presentedReflection?.body ? <p className="text-sm leading-6 text-[var(--muted)]">Add your overall thoughts on the day.</p> : null}
                {presentedReflection?.body ? <p className="whitespace-pre-wrap text-[15px] leading-7 text-[var(--body)]">{presentedReflection.body}</p> : null}
                {!reflectionOnly && parsedGuidedReflection.answers.some(Boolean) ? (
                  <div className="border-t border-[var(--hairline)] pt-5">
                    <h3 className="text-[16px] font-semibold text-[var(--foreground)]">Guided reflection</h3>
                    <dl className="mt-4 space-y-5">
                      {GUIDED_REFLECTION_PROMPTS.map((prompt, index) => parsedGuidedReflection.answers[index] ? (
                        <div key={prompt}>
                          <dt className="text-[13px] font-semibold leading-5 text-[var(--foreground)]">{prompt}</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--body)]">{parsedGuidedReflection.answers[index]}</dd>
                        </div>
                      ) : null)}
                    </dl>
                  </div>
                ) : null}
              </div>
            ) : <p className="mt-3 max-w-[70ch] whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">{displayText}</p>}
          </div>
        ) : (
          <button type="button" onClick={openEditor} className="block w-full rounded-md border border-dashed border-[var(--border)] px-4 py-5 text-left transition-colors hover:border-[var(--accent)]">
            <p className="font-mono text-[13px] font-semibold text-[var(--accent)]">+ {emptyTitle}</p>
            <p className="mt-3 max-w-[34rem] text-sm leading-6 text-[var(--muted)]">{emptyHelper}</p>
          </button>
        )}
        {structuredDay && state?.ok ? <p role="status" className="mt-3 text-sm text-[var(--muted)]">{coachError ? "Answers saved. Coach could not refresh; you can try again when ready." : coachRefreshed ? "Answers saved. Open AI review below for the refreshed feedback." : reflectionOnly ? "Note saved." : "Answers saved."}</p> : null}
      </div>
    );
  }

  if (structuredDay) {
    const serializedBody = serializeGuidedReflection({ freeform: guidedFreeform, answers: guidedAnswers });
    const saveLocal = () => {
      setDisplayText(serializedBody);
      setEditing(false);
    };

    return (
      <form action={readOnly ? undefined : formAction} className="space-y-6 pb-6">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="scopeKey" value={scopeKey} />
        <input type="hidden" name="body" value={serializedBody} />
        <input type="hidden" name="thesis" value="" />
        <input type="hidden" name="whatWentWell" value="" />
        <input type="hidden" name="whatWentWrong" value="" />
        <input type="hidden" name="emotionalState" value="" />

        <div>
          <label htmlFor={`${inputIdRoot}-freeform`} className="text-[13px] font-semibold text-[var(--foreground)]">Overall thoughts</label>
          {!reflectionOnly ? <p className="mt-1 max-w-[70ch] text-[13px] leading-5 text-[var(--muted)]">Capture the market, your plan, and the decisions that shaped the session. The prompts below are optional.</p> : null}
          <SharedNoteComposer
            name="guidedFreeform"
            textareaId={`${inputIdRoot}-freeform`}
            value={guidedFreeform}
            defaultValue=""
            rows={reflectionOnly ? 5 : 7}
            autoFocus={!reflectionOnly}
            placeholder={reflectionOnly ? placeholder : "Talk through the session in one pass. Market read, plan, where standards held or slipped, and what to carry forward."}
            pending={pending}
            disabled={pending}
            submitLabel="Save"
            hideActions
            onTextChange={setGuidedFreeform}
            textareaClassName="mt-3 min-h-[144px] w-full resize-y rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
        </div>

        {!reflectionOnly ? <fieldset className="space-y-5 border-t border-[var(--hairline)] pt-5">
          <legend className="text-[16px] font-semibold text-[var(--foreground)]">Guided reflection</legend>
          <p className="max-w-[70ch] text-[13px] leading-5 text-[var(--muted)]">Answer only what helps you review the session. A loss or a setup may not apply every day.</p>
          {GUIDED_REFLECTION_PROMPTS.map((prompt, index) => (
            <div key={prompt}>
              <label htmlFor={`${inputIdRoot}-reflection-${index}`} className="block max-w-[75ch] text-[13px] font-semibold leading-5 text-[var(--foreground)]">{prompt}</label>
              <SharedNoteComposer
                name={`guidedReflection${index}`}
                textareaId={`${inputIdRoot}-reflection-${index}`}
                value={guidedAnswers[index]}
                defaultValue=""
                rows={3}
                placeholder="Optional"
                pending={pending}
                disabled={pending}
                submitLabel="Save"
                hideActions
                onTextChange={(value) => updateGuidedAnswer(index, value)}
                textareaClassName="mt-2 min-h-[88px] w-full resize-y rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
              />
            </div>
          ))}
        </fieldset> : null}

        {saveError ? <p role="alert" className="text-sm text-[var(--red)]">{saveError}</p> : null}
        {coachError ? <p role="status" className="text-sm text-[var(--muted)]">Your note saved, but Coach could not refresh. You can try again when ready.</p> : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--hairline)] pt-4">
          {editing ? <button type="button" onClick={() => setEditing(false)} disabled={pending} className="h-10 rounded-md px-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50">Cancel</button> : null}
          {readOnly ? (
            <button type="button" onClick={saveLocal} className="h-10 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]">{reflectionOnly ? "Save note" : "Save answers"}</button>
          ) : (
            <>
              <button type="submit" onClick={() => setRefreshRequested(false)} disabled={pending} className="h-10 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50">{pending && !refreshRequested ? "Saving…" : reflectionOnly ? "Save note" : "Save answers"}</button>
              {!reflectionOnly ? <button type="submit" name="intent" value="refreshCoach" onClick={() => setRefreshRequested(true)} disabled={pending} className="h-10 rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{pending && refreshRequested ? "Refreshing Coach…" : "Save & refresh Coach"}</button> : null}
            </>
          )}
        </div>
      </form>
    );
  }

  return (
    <form action={formAction} className="pb-6">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="scopeKey" value={scopeKey} />
      {scope === "day" ? (
        <>
          <input type="hidden" name="thesis" value="" />
          <input type="hidden" name="whatWentWell" value="" />
          <input type="hidden" name="whatWentWrong" value="" />
          <input type="hidden" name="emotionalState" value="" />
        </>
      ) : null}
      <SharedNoteComposer
        name="body"
        defaultValue={displayText}
        rows={scope === "day" ? 7 : 3}
        autoFocus
        placeholder={
          scope === "day"
            ? "Talk through the session in one pass. Market read, plan, where standards held or slipped, and what to carry forward."
            : placeholder
        }
        pending={pending}
        pendingLabel="Saving..."
        submitLabel="Save note"
        onCancel={() => setEditing(false)}
        localStorageKey={localStorageKey}
        onLocalSave={(value) => {
          setDisplayText(value);
          setEditing(false);
        }}
        helper={
          scope === "day"
            ? "Describe your trading day in one pass. Capture what you were trying to do, what worked, where standards slipped, and what you want to carry forward."
            : undefined
        }
      />
    </form>
  );
}
