"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that reflects its form's server-action status — used for the
 * coach generation forms, where the round-trip takes ~10s and a silent
 * button reads as "nothing happened".
 */
export default function PendingSubmitButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} ${pending ? "cursor-wait opacity-60" : ""}`}>
      {pending ? pendingLabel : label}
    </button>
  );
}
