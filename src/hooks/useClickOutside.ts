import { useEffect, type RefObject } from "react";

/** Accepts one ref (the common case) or several — e.g. a trigger button plus
 * its own popover content, when that content is portaled out to
 * document.body (RailPopover) and so isn't a DOM descendant of the trigger
 * anymore. A click is "outside" only once it's outside *every* mounted ref. */
export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  onOutside: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return;
    const list = Array.isArray(refs) ? refs : [refs];

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      const mounted = list.filter((r) => r.current);
      if (mounted.length === 0) return;
      if (mounted.every((r) => !r.current!.contains(target))) onOutside();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOutside();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
    // `refs` intentionally excluded: RefObjects are stable containers whose
    // `.current` is always read fresh inside the handler, so re-subscribing
    // just because a caller passed a new inline array literal (e.g.
    // `[rootRef, popoverRef]`) on every render would be pure churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onOutside, active]);
}
