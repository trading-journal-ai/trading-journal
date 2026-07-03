"use client";

import { useEffect, useState } from "react";

export default function useLocalStorageText(
  storageKey: string | undefined,
  fallback: string,
): [string, (value: string) => void] {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    // Hydrate browser-local demo notes after mount; localStorage is not available during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(fallback);
    if (!storageKey || typeof window === "undefined") return;

    const stored = window.localStorage.getItem(storageKey);
    if (stored != null) setValue(stored);
  }, [fallback, storageKey]);

  function update(nextValue: string) {
    setValue(nextValue);
    if (!storageKey || typeof window === "undefined") return;

    if (nextValue.trim()) {
      window.localStorage.setItem(storageKey, nextValue);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }

  return [value, update];
}
