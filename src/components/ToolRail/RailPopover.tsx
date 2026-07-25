import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface RailPopoverProps {
  /** The rail button this popover is anchored to — its right edge is where
   * the popover's own left edge lands. */
  anchorRef: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

const VIEWPORT_MARGIN = 16;
const ANCHOR_GAP = 12;

/**
 * Portals its content to document.body instead of rendering it as a normal
 * descendant — required because the rail itself is a scrollable container
 * (overflow-y-auto), and the CSS overflow spec computes overflow-x as auto
 * (i.e. clipping) too the moment overflow-y isn't `visible`, silently
 * clipping any absolutely-positioned popover that flies out past the rail's
 * own right edge. A portal sidesteps that entirely.
 *
 * Position is measured (not guessed) in two passes: render once off-screen
 * to get this panel's real height, then place it clamped to the viewport so
 * a rail button near the bottom edge never pushes the panel off-screen.
 * Forwards a ref to the portaled root so the caller can include it in
 * useClickOutside's ref list — content living outside the trigger's own DOM
 * subtree would otherwise always read as "outside click."
 */
export const RailPopover = forwardRef<HTMLDivElement, RailPopoverProps>(function RailPopover(
  { anchorRef, className, children },
  ref,
) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    const panelHeight = panel?.offsetHeight ?? 0;
    const top = Math.min(anchorRect.top, window.innerHeight - panelHeight - VIEWPORT_MARGIN);
    setPos({ left: anchorRect.right + ANCHOR_GAP, top: Math.max(VIEWPORT_MARGIN, top) });
    // Only ever needs the anchor's position at mount time — this popover
    // closes on any scroll/resize-worthy interaction anyway (click-outside).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      ref={(node) => {
        panelRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={className}
      style={{
        position: "fixed",
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
});
