import { useEffect, useRef, useState } from "react";

interface UseDraftTextOptions {
  /** Returns the normalized value to commit, or null if `raw` isn't valid (falls back to the last committed value). */
  parse: (raw: string) => string | null;
  onCommit: (value: string) => void;
}

/** Same draft-then-commit pattern as useDraftNumber, generalized to arbitrary validated text (e.g. hex color codes). */
export function useDraftText(value: string, { parse, onCommit }: UseDraftTextOptions) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(value);
  }, [value]);

  function onFocus() {
    focusedRef.current = true;
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value);
  }

  function commit() {
    focusedRef.current = false;
    const parsed = parse(draft);
    const resolved = parsed ?? value;
    setDraft(resolved);
    if (parsed && parsed !== value) onCommit(parsed);
  }

  function onBlur() {
    commit();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur();
  }

  return { draft, onFocus, onChange, onBlur, onKeyDown };
}
