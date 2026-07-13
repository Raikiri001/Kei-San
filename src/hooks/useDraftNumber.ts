import { useEffect, useRef, useState } from "react";

interface UseDraftNumberOptions {
  min: number;
  max: number;
  onCommit: (value: number) => void;
}

/**
 * Controlled numeric input backed by a local string draft instead of the raw
 * committed value. Fixes the "can't type the number I want" bug: binding an
 * <input> straight to a store number and parsing on every keystroke means an
 * empty/intermediate value snaps back to the old number immediately (since
 * Number("") is 0, a falsy fallback trigger), trapping the caret. Here the
 * draft is free-form while focused; parsing/clamping/commit only happens on
 * blur (or Enter), and external value changes only resync the draft while the
 * input isn't focused, so typing is never interrupted mid-edit.
 */
export function useDraftNumber(value: number, { min, max, onCommit }: UseDraftNumberOptions) {
  const [draft, setDraft] = useState(String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(String(value));
  }, [value]);

  function onFocus() {
    focusedRef.current = true;
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value);
  }

  function commit() {
    focusedRef.current = false;
    const parsed = Math.round(Number(draft));
    const resolved = Number.isFinite(parsed) && draft.trim() !== "" ? Math.min(max, Math.max(min, parsed)) : value;
    setDraft(String(resolved));
    if (resolved !== value) onCommit(resolved);
  }

  function onBlur() {
    commit();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur();
  }

  return { draft, onFocus, onChange, onBlur, onKeyDown };
}
