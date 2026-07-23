import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { motion, useReducedMotion, type Variants } from "motion/react";

interface ToolbarIconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  /** Keeps the label unfurled even without hover/focus — used while this
   * button's own popover is open, so the trigger doesn't snap back to a bare
   * icon just because the pointer left it to interact with the popover. */
  forceExpanded?: boolean;
  active?: boolean;
  ariaExpanded?: boolean;
}

const COLLAPSED_W = 36;
// Pre-measurement fallback only — the real target is this instance's own
// measured label width (see measuredWidth below), so "Save" no longer
// inherits a width sized for "Export Wallpaper".
const FALLBACK_EXPANDED_W = 180;
// Must match px-2.5 below (10px each side) — added on top of the measured
// *content* width (icon+label only) to get the button's full target width.
const BUTTON_PADDING_X = 20;

// One calm, critically-damped spring for both width and label — deliberately
// the only thing animating here (no sweep, no pulse, no icon scale): a
// button unfurling several competing effects at once is what read as "busy"
// rather than smooth.
const EXPAND_SPRING = { type: "spring" as const, stiffness: 280, damping: 32, mass: 1 };

const labelVariants: Variants = {
  collapsed: { opacity: 0, x: -6 },
  expanded: { opacity: 1, x: 0 },
};

/** Icon-first toolbar button: collapses to a bare glyph and unfurls into a
 * labeled glass capsule on hover/focus (or `forceExpanded`) — one calm,
 * critically-damped width+label animation, no bounce, no competing effects. */
export function ToolbarIconButton({ icon, label, onClick, forceExpanded, active, ariaExpanded }: ToolbarIconButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Measures only the icon+label group, not the whole button, so a shrink-wrapped
  // scrollWidth read isn't thrown off by anything else absolutely positioned inside.
  const contentRef = useRef<HTMLSpanElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // scrollWidth reports the content's true (unclipped) width regardless of
    // the currently-animated `width` + overflow-hidden — this instance's own
    // natural expanded width, not a shared constant sized for the longest
    // label among every toolbar button.
    setMeasuredWidth(el.scrollWidth + BUTTON_PADDING_X);
  }, [label]);

  // Belt-and-suspenders for the scrollLeft quirk documented at resetScrollLeft
  // below: Framer's `onUpdate` only fires while its own spring is actively
  // running, so a scrollLeft corruption that happens (or recurs) after the
  // width spring has already settled would go uncorrected. A native `scroll`
  // listener catches that regardless of cause or timing, since it fires on
  // the actual DOM event, not on animation frames.
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollLeft !== 0) el.scrollLeft = 0;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const expandedWidth = measuredWidth ?? FALLBACK_EXPANDED_W;
  const widthVariants: Variants = {
    collapsed: { width: COLLAPSED_W },
    expanded: { width: expandedWidth },
  };
  const animateState = forceExpanded ? "expanded" : "collapsed";

  // Root-caused browser quirk, not a layout bug: this button's `width` is
  // animated while overflow-hidden, and somewhere in that combination the
  // browser assigns it a stray non-zero `scrollLeft` early in the transition
  // (reproduced even with `overflow-anchor: none` set, so it isn't standard
  // CSS scroll-anchoring) — clipping the *start* of the label instead of the
  // harmless empty space past its end. Forcing scrollLeft back to 0 every
  // animation frame neutralizes it regardless of the exact underlying cause.
  const resetScrollLeft = () => {
    if (buttonRef.current) buttonRef.current.scrollLeft = 0;
  };

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      title={label}
      aria-expanded={ariaExpanded}
      data-active={active ? "true" : undefined}
      initial="collapsed"
      animate={animateState}
      whileHover={prefersReducedMotion ? undefined : "expanded"}
      whileFocus={prefersReducedMotion ? undefined : "expanded"}
      variants={prefersReducedMotion ? undefined : widthVariants}
      transition={prefersReducedMotion ? { duration: 0 } : EXPAND_SPRING}
      onUpdate={resetScrollLeft}
      onHoverStart={resetScrollLeft}
      onFocus={resetScrollLeft}
      className="glass-panel accent-glow-hover press-scale no-scroll-anchor relative flex h-9 items-center overflow-hidden rounded-full px-2.5"
      style={prefersReducedMotion ? { width: forceExpanded ? expandedWidth : COLLAPSED_W } : undefined}
    >
      <span ref={contentRef} className="flex items-center gap-2">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
        <motion.span
          variants={prefersReducedMotion ? undefined : labelVariants}
          transition={EXPAND_SPRING}
          className={clsx(
            "shrink-0 whitespace-nowrap text-[11px] uppercase tracking-wide",
            prefersReducedMotion && !forceExpanded && "opacity-0",
          )}
        >
          {label}
        </motion.span>
      </span>
    </motion.button>
  );
}
