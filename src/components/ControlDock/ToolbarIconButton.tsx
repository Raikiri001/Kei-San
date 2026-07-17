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
const PULSE_MS = 380;
// Must match px-2.5 below (10px each side) — added on top of the measured
// *content* width (icon+label only) to get the button's full target width.
const BUTTON_PADDING_X = 20;

// A snap, not a bounce: damping raised close to critical so the expand keeps
// its speed but settles without overshooting past its target width.
const WIDTH_SPRING = { type: "spring" as const, stiffness: 260, damping: 29, mass: 0.9 };
const LABEL_SPRING = { type: "spring" as const, stiffness: 420, damping: 24 };
const SWEEP_TWEEN = { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const };

const labelVariants: Variants = {
  collapsed: { opacity: 0, x: -8 },
  expanded: { opacity: 1, x: 0 },
};
const iconVariants: Variants = {
  collapsed: { scale: 1 },
  expanded: { scale: 1.12 },
};
const sweepVariants: Variants = {
  collapsed: { x: "-130%" },
  expanded: { x: "130%" },
};

/** Icon-first toolbar button: collapses to a bare glyph and unfurls into a
 * labeled pill with a snap (not bounce) width animation + a diagonal energy
 * sweep + a corner-bracket pulse on hover/focus (or `forceExpanded`) — the
 * same HUD-deploy language as the radial menu's IconPill, so every control
 * surface in the app moves the same way. */
export function ToolbarIconButton({ icon, label, onClick, forceExpanded, active, ariaExpanded }: ToolbarIconButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Measures only the icon+label group, NOT the whole button — the button
  // also contains the diagonal sweep overlay (`position: absolute`), and
  // `scrollWidth` on the button itself would include however far the sweep's
  // animated position currently extends, producing a garbage measurement.
  const contentRef = useRef<HTMLSpanElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const wasInteractingRef = useRef(false);
  const wasForceExpandedRef = useRef(Boolean(forceExpanded));

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // scrollWidth reports the content's true (unclipped) width regardless of
    // the currently-animated `width` + overflow-hidden — this instance's own
    // natural expanded width, not a shared constant sized for the longest
    // label among every toolbar button.
    setMeasuredWidth(el.scrollWidth + BUTTON_PADDING_X);
  }, [label]);

  useLayoutEffect(() => {
    const active = isInteracting || Boolean(forceExpanded);
    const wasActive = wasInteractingRef.current || wasForceExpandedRef.current;
    if (active && !wasActive) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), PULSE_MS);
      wasInteractingRef.current = isInteracting;
      wasForceExpandedRef.current = Boolean(forceExpanded);
      return () => clearTimeout(t);
    }
    wasInteractingRef.current = isInteracting;
    wasForceExpandedRef.current = Boolean(forceExpanded);
  }, [isInteracting, forceExpanded]);

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

  // Root-caused browser quirk, not a layout bug: this button's diagonal sweep
  // overlay sweeps from -130% to 130% while `width` is *also* animating, and
  // somewhere in that combination the browser assigns the overflow-hidden
  // button a stray non-zero `scrollLeft` early in the transition (reproduced
  // even with `overflow-anchor: none` set, so it isn't standard CSS
  // scroll-anchoring) — clipping the *start* of the label instead of the
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
      data-pulse={pulsing ? "true" : undefined}
      initial="collapsed"
      animate={animateState}
      whileHover={prefersReducedMotion ? undefined : "expanded"}
      whileFocus={prefersReducedMotion ? undefined : "expanded"}
      variants={prefersReducedMotion ? undefined : widthVariants}
      transition={prefersReducedMotion ? { duration: 0 } : WIDTH_SPRING}
      onUpdate={resetScrollLeft}
      onHoverStart={() => {
        setIsInteracting(true);
        resetScrollLeft();
      }}
      onHoverEnd={() => setIsInteracting(false)}
      onFocus={() => {
        setIsInteracting(true);
        resetScrollLeft();
      }}
      onBlur={() => setIsInteracting(false)}
      className="corner-frame glass-panel accent-glow-hover press-scale no-scroll-anchor relative flex h-9 items-center overflow-hidden px-2.5"
      style={prefersReducedMotion ? { width: forceExpanded ? expandedWidth : COLLAPSED_W } : undefined}
    >
      <span className="corner-tl" />
      <span className="corner-bl" />
      <span className="corner-br" />
      {!prefersReducedMotion && (
        <motion.span
          variants={sweepVariants}
          transition={SWEEP_TWEEN}
          className="pointer-events-none absolute -inset-y-[60%] -inset-x-[30%]"
          style={{
            background:
              "linear-gradient(100deg, transparent 35%, rgb(var(--color-accent-glow) / 0.4) 50%, transparent 65%)",
          }}
        />
      )}
      <span ref={contentRef} className="flex items-center gap-2">
        <motion.span
          variants={prefersReducedMotion ? undefined : iconVariants}
          transition={LABEL_SPRING}
          className="flex h-4 w-4 shrink-0 items-center justify-center"
        >
          {icon}
        </motion.span>
        <motion.span
          variants={prefersReducedMotion ? undefined : labelVariants}
          transition={LABEL_SPRING}
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
