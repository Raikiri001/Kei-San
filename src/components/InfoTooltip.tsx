import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import clsx from "clsx";
import { useClickOutside } from "@/hooks/useClickOutside";

interface InfoTooltipProps {
  /** The explanatory copy this reveals — the thing that used to sit always-on inline. */
  text: string;
  /** Accessible name for the trigger button. Defaults to "More info". */
  label?: string;
  /** Which side of the trigger the bubble opens toward. */
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

// Same curve as --ease-liquid in index.css — Motion's `ease` can't read a CSS
// custom property directly, so this mirrors that value in JS.
const EASE_LIQUID = [0.22, 1, 0.36, 1] as const;
const GAP_PX = 10;
const VIEWPORT_MARGIN_PX = 12;

/**
 * Small info-glyph trigger that reveals secondary/explanatory copy on hover,
 * focus, or tap — the single mechanism this app uses to keep long-form text
 * out of the way until someone actually wants it, instead of always-on
 * inline paragraphs. Keyboard accessible (focus/blur + Escape) and works on
 * touch (click toggles, tap-outside closes).
 *
 * Rendered through a portal at a `position: fixed` coordinate computed from
 * the trigger's own bounding rect, then re-clamped to the viewport after its
 * first paint — plain CSS-relative positioning would get silently clipped by
 * any ancestor with `overflow-hidden`/`overflow-y-auto` (e.g. the Effects
 * Drawer's scrollable body), which is exactly what a portal sidesteps.
 */
export function InfoTooltip({ text, label = "More info", side = "top", className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; transform: string } | null>(null);
  const tooltipId = useId();
  const prefersReducedMotion = useReducedMotion();

  useClickOutside(rootRef, () => setOpen(false), open);

  const place = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const centerX = r.left + r.width / 2;
    const centerY = r.top + r.height / 2;
    const byside = {
      top: { top: r.top - GAP_PX, left: centerX, transform: "translate(-50%, -100%)" },
      bottom: { top: r.bottom + GAP_PX, left: centerX, transform: "translate(-50%, 0)" },
      left: { top: centerY, left: r.left - GAP_PX, transform: "translate(-100%, -50%)" },
      right: { top: centerY, left: r.right + GAP_PX, transform: "translate(0, -50%)" },
    };
    setPos(byside[side]);
  }, [side]);

  // Two-pass placement: an initial guess (above) lets the bubble mount so its
  // real size can be measured, then this clamps it fully inside the viewport
  // before the very first paint (useLayoutEffect, so there's no visible jump).
  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useLayoutEffect(() => {
    if (!open || !pos) return;
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const r = bubble.getBoundingClientRect();
    let dx = 0;
    let dy = 0;
    if (r.left < VIEWPORT_MARGIN_PX) dx = VIEWPORT_MARGIN_PX - r.left;
    if (r.right > window.innerWidth - VIEWPORT_MARGIN_PX) dx = window.innerWidth - VIEWPORT_MARGIN_PX - r.right;
    if (r.top < VIEWPORT_MARGIN_PX) dy = VIEWPORT_MARGIN_PX - r.top;
    if (r.bottom > window.innerHeight - VIEWPORT_MARGIN_PX) dy = window.innerHeight - VIEWPORT_MARGIN_PX - r.bottom;
    if (dx || dy) {
      bubble.style.transform = `${pos.transform} translate(${dx}px, ${dy}px)`;
    }
    // Deliberately excludes `pos` (identity changes every open, but this
    // pass only needs to run once per open against whatever `pos` produced).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => setOpen(false);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={clsx("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="press-scale flex h-4 w-4 shrink-0 items-center justify-center rounded-full opacity-55 transition-[opacity,color] duration-150 hover:text-accent hover:opacity-100 focus-visible:text-accent focus-visible:opacity-100 focus-visible:outline-none"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-full w-full">
          <circle cx="10" cy="10" r="7.25" />
          <path d="M10 9.25v4.25" strokeLinecap="round" />
          <circle cx="10" cy="6.75" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={bubbleRef}
              id={tooltipId}
              role="tooltip"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.15, ease: EASE_LIQUID }}
              style={{ position: "fixed", top: pos.top, left: pos.left, transform: pos.transform }}
              className="glass-panel pointer-events-none z-[200] w-max max-w-72 rounded-2xl px-3.5 py-2.5 text-[12px] leading-6"
            >
              {text}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
