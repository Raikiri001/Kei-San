import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import { motion, useReducedMotion, type Variants } from "motion/react";

interface IconPillProps {
  icon: ReactNode;
  label: string;
  x: number;
  y: number;
  onClick?: () => void;
  active?: boolean;
  /** Explicit on/off state (halftone, edge blend toggles) — renders the HUD's
   * green/red signal-light colors instead of the generic accent glow, so on/off
   * reads unambiguously without relying on the label text alone. */
  status?: "on" | "off";
  /** Visually and functionally inert (e.g. a sub-setting whose parent toggle is
   * off) while still occupying its ring slot — kept in the layout on purpose so
   * toggling the parent doesn't reshuffle every other pill's position. */
  disabled?: boolean;
  /** Inline content (input/swatches) revealed alongside the label on hover. */
  expandedContent?: ReactNode;
  /** Widens the hover-expanded pill (e.g. for swatch rows that need more room than a label). */
  wide?: boolean;
  /** Expands into a stacked box (grows width AND height, content laid out in a
   * column below the icon/label header) instead of the default single-line
   * sideways expansion — for a control hosting two related stacked fields
   * (e.g. Width above Height) where one long horizontal line would either
   * cramp both fields or force the whole ring to grow to avoid overlap. */
  stack?: boolean;
  /** Stagger delay (seconds) for this pill's pop-in, e.g. `index * 0.035` — only
   * replays when the pill actually (re)mounts, e.g. drilling into/out of a
   * submenu, not on every unrelated re-render within the same ring. */
  popDelay?: number;
}

const COLLAPSED_W = 44;
// Pre-measurement fallbacks only — the real target is this instance's own
// measured content width (see measuredWidth below), so a short label like
// "Delete" no longer inherits a bucket width sized for the longest label
// sharing its `wide` bucket.
const WIDE_EXPANDED_W = 240;
const NARROW_EXPANDED_W = 200;
const STACK_EXPANDED_H = 108;

// One calm, critically-damped spring for the expand/collapse — deliberately
// the only thing animating on hover (no sweep, no pulse, no icon scale): a
// pill unfurling several competing effects at once read as "busy" rather
// than smooth.
const WIDTH_SPRING = { type: "spring" as const, stiffness: 280, damping: 32, mass: 1 };
const POP_SPRING = { type: "spring" as const, stiffness: 260, damping: 32, mass: 1 };
// Exit runs faster than the enter spring above (exit-faster-than-enter) — a
// quick tween reads crisper than a spring for something leaving the screen.
const EASE_LIQUID = [0.22, 1, 0.36, 1] as const;
const EXIT_TWEEN = { duration: 0.13, ease: EASE_LIQUID };

// Per-state transitions (spring+stagger in, quick tween out) require the
// variants API — a single `transition` prop can't differ between enter/exit.
function popVariants(popDelay: number): Variants {
  return {
    hidden: { opacity: 0, scale: 0.55 },
    visible: { opacity: 1, scale: 1, transition: { ...POP_SPRING, delay: popDelay } },
    exit: { opacity: 0, scale: 0.5, transition: EXIT_TWEEN },
  };
}

const labelVariants: Variants = {
  collapsed: { opacity: 0, x: -6 },
  expanded: { opacity: 1, x: 0 },
};

// PILL_PADDING_X must match px-3 below (12px each side) — added on top of the
// measured *content* width (icon+label+expandedContent only) to get the pill's
// full target width, since the padding itself isn't part of what gets measured.
const PILL_PADDING_X = 24;
// Must match the stack variant's py-3 (12px each side) below — analogous to
// PILL_PADDING_X above but for the stacked pill's animated *height* instead
// of width.
const PILL_PADDING_Y = 24;

function pillBaseClass(hasStatus?: boolean, active?: boolean, disabled?: boolean, stack?: boolean) {
  return clsx(
    "glass-panel no-scroll-anchor relative flex overflow-hidden",
    stack ? "rounded-3xl" : "rounded-full",
    // Stack pills flip flex-direction to column, which flips what "items-center"
    // (the cross-axis alignment) even means: for a row it's vertical centering
    // (harmless), but for a column it's *horizontal* centering — and content
    // here (header + both fields) is always wider than the collapsed 44px box,
    // so centering it clips evenly off both sides, hiding the icon (the
    // leftmost thing in the content) behind the collapsed window's left edge.
    // items-start + justify-start instead: content anchors to the box's own
    // top-left corner. That alone would read as off-center while *collapsed*
    // (nothing else around to get clipped, so the icon just sits in the
    // corner) — the fix isn't flipping to centered alignment (the label span
    // stays in the DOM at opacity:0 rather than display:none, so it still
    // occupies its layout width even while invisible, and centering that
    // whole icon+hidden-label block visibly shifts the icon left of true
    // center). It's sizing the padding itself so the anchored icon lands
    // exactly in the middle: px-3/py-3 (12px) on each side of the 20px icon
    // sums to exactly COLLAPSED_W (44px), so top-left anchoring places the
    // icon flush against symmetric padding on every side — the same
    // arithmetic coincidence a normal row pill already relies on (px-3 + a
    // 20px icon exactly filling COLLAPSED_W there too).
    stack ? "flex-col items-start justify-start px-3 py-3" : "h-11 items-center px-3",
    !disabled && "accent-glow-hover press-scale",
    !hasStatus && (active
      ? "border-accent/70 text-accent shadow-[0_0_16px_rgb(var(--color-accent-glow)/0.5),0_0_32px_rgb(var(--color-accent-glow)/0.2)]"
      : "text-current"),
    disabled && "pointer-events-none opacity-40 saturate-[0.4]",
  );
}

/** Inline style for the two explicit on/off states — kept out of the Tailwind
 * class string since the HUD signal colors (green/red) are semantic, not part
 * of the accent theme, and need their own translucent glow/border variants. */
function statusStyle(status?: "on" | "off"): CSSProperties | undefined {
  if (status === "on") {
    return {
      borderColor: "rgb(var(--status-active-rgb) / 0.75)",
      color: "rgb(var(--status-active-rgb))",
      boxShadow: "0 0 16px rgb(var(--status-active-rgb) / 0.45), 0 0 32px rgb(var(--status-active-rgb) / 0.18)",
    };
  }
  if (status === "off") {
    return {
      borderColor: "rgb(var(--status-inactive-rgb) / 0.55)",
      color: "rgb(var(--status-inactive-rgb) / 0.9)",
    };
  }
  return undefined;
}

export function IconPill({
  icon,
  label,
  x,
  y,
  onClick,
  active,
  status,
  disabled,
  expandedContent,
  wide,
  stack,
  popDelay = 0,
}: IconPillProps) {
  // Both halves of this transform must live in the SAME inline style: an
  // inline `style.transform` always wins over a Tailwind `-translate-x-1/2
  // -translate-y-1/2` utility class targeting the same property (inline
  // beats class regardless of Tailwind's layer ordering), so splitting the
  // ring-position translate (inline) from the self-centering translate
  // (class) silently drops the centering half entirely — the pill then
  // anchors by its top-left corner instead of its center, so its content
  // visibly drifts as its own width animates. Composing both here keeps the
  // pill centered on its ring anchor point at every width.
  const outerStyle: CSSProperties = { transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` };
  const prefersReducedMotion = useReducedMotion();
  const hasStatus = status !== undefined;
  const pillRef = useRef<HTMLButtonElement | HTMLDivElement>(null);
  // Measures only the icon+label+expandedContent group, NOT the whole pill —
  // scrollWidth on the pill itself would include its own animated `width`.
  const contentRef = useRef<HTMLSpanElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  // expandedContent hosts real nested <input>/<button> controls — a keyboard
  // user tabbing into those needs the pill to stay unfurled, but Framer's
  // whileFocus only fires when the *animated* element itself is focused, not a
  // descendant, so that specific case needs its own focus-tracked state.
  const [contentFocused, setContentFocused] = useState(false);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // scrollWidth reports the content's true (unclipped) width regardless of
    // the currently-animated `width` + overflow-hidden — this instance's own
    // natural expanded width, not a shared bucket constant sized for whatever
    // the longest label in its `wide`/narrow group happens to be.
    setMeasuredWidth(el.scrollWidth + PILL_PADDING_X);
    setMeasuredHeight(el.scrollHeight + PILL_PADDING_Y);
  }, [label, expandedContent, wide, stack]);

  // Belt-and-suspenders for the scrollLeft quirk documented at resetScrollLeft
  // below: Framer's `onUpdate` only fires while its own spring is actively
  // running, so a scrollLeft corruption that happens (or recurs) after the
  // width spring has already settled — e.g. triggered by a *different*
  // nearby pill's own expand/collapse reflowing this one — would go
  // uncorrected. A native `scroll` listener catches that regardless of cause
  // or timing, since it fires on the actual DOM event, not on animation frames.
  useEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollLeft !== 0) el.scrollLeft = 0;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const expandedWidth = measuredWidth ?? (wide ? WIDE_EXPANDED_W : NARROW_EXPANDED_W);
  const widthVariants: Variants = {
    collapsed: { width: COLLAPSED_W },
    expanded: { width: expandedWidth },
  };
  // Stack pills grow both dimensions together — a square icon button unfurling
  // into a compact box, rather than a bar sliding out sideways.
  const expandedHeight = measuredHeight ?? STACK_EXPANDED_H;
  const boxVariants: Variants = {
    collapsed: { width: COLLAPSED_W, height: COLLAPSED_W },
    expanded: { width: expandedWidth, height: expandedHeight },
  };
  const sizeVariants = stack ? boxVariants : widthVariants;

  // Root-caused browser quirk, not a layout bug: this pill's `width` is
  // animated while overflow-hidden, and somewhere in that combination the
  // browser assigns it a stray non-zero `scrollLeft` early in the transition
  // (reproduced even with `overflow-anchor: none` set, so it isn't standard
  // CSS scroll-anchoring) — which then clips the *start* of the visible label
  // instead of the harmless empty space past its end. Forcing scrollLeft back
  // to 0 every animation frame is a cheap, guaranteed-correct way to neutralize
  // it regardless of the exact underlying cause.
  const resetScrollLeft = () => {
    if (pillRef.current) pillRef.current.scrollLeft = 0;
  };

  const inner = (
    <>
      {/* items-start (not -center) for stack: expandedContent below is always
          mounted (just opacity-0 while collapsed — see its span below), so it
          contributes real layout width/height even collapsed; centering
          against that hidden-but-present sibling would pull the icon+label
          row off from the collapsed box's true center, the same padding-vs-
          hidden-content mismatch pillBaseClass's stack padding comment above
          works around one level up. */}
      <span ref={contentRef} className={clsx("flex gap-2", stack ? "flex-col items-start gap-1.5" : "items-center")}>
        <span className={clsx("flex items-center gap-2", stack && "justify-center")}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
          <motion.span
            variants={prefersReducedMotion ? undefined : labelVariants}
            transition={WIDTH_SPRING}
            className="shrink-0 whitespace-nowrap text-[11px] uppercase tracking-wide"
          >
            {label}
          </motion.span>
        </span>
        {expandedContent && (
          <motion.span
            variants={prefersReducedMotion ? undefined : labelVariants}
            transition={WIDTH_SPRING}
            className={clsx("flex shrink-0 items-center", stack && "flex-col items-stretch gap-1")}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {expandedContent}
          </motion.span>
        )}
      </span>
    </>
  );

  // Items with expandedContent host interactive controls (inputs/buttons) of their own,
  // so the pill root must be a <div>, not a <button> — nested buttons are invalid HTML
  // and browsers silently break out of them, corrupting the layout.
  const content = expandedContent ? (
    <motion.div
      ref={pillRef as React.Ref<HTMLDivElement>}
      aria-disabled={disabled}
      initial="collapsed"
      animate={contentFocused ? "expanded" : "collapsed"}
      whileHover={disabled || prefersReducedMotion ? undefined : "expanded"}
      variants={prefersReducedMotion ? undefined : sizeVariants}
      transition={prefersReducedMotion ? { duration: 0 } : WIDTH_SPRING}
      onUpdate={resetScrollLeft}
      onFocus={() => {
        setContentFocused(true);
        resetScrollLeft();
      }}
      onBlur={() => setContentFocused(false)}
      className={pillBaseClass(hasStatus, active, disabled, stack)}
      style={{
        ...statusStyle(status),
        ...(prefersReducedMotion ? { width: COLLAPSED_W, height: stack ? COLLAPSED_W : undefined } : undefined),
      }}
    >
      {inner}
    </motion.div>
  ) : (
    <motion.button
      ref={pillRef as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial="collapsed"
      whileHover={disabled || prefersReducedMotion ? undefined : "expanded"}
      whileFocus={disabled || prefersReducedMotion ? undefined : "expanded"}
      variants={prefersReducedMotion ? undefined : sizeVariants}
      transition={prefersReducedMotion ? { duration: 0 } : WIDTH_SPRING}
      onUpdate={resetScrollLeft}
      onFocus={resetScrollLeft}
      className={pillBaseClass(hasStatus, active, disabled, stack)}
      style={{
        ...statusStyle(status),
        ...(prefersReducedMotion ? { width: COLLAPSED_W, height: stack ? COLLAPSED_W : undefined } : undefined),
      }}
    >
      {inner}
    </motion.button>
  );

  return (
    <div className="absolute left-1/2 top-1/2" style={outerStyle}>
      {/* Positioning (translate x/y above) stays on this plain outer div; the
          pop-in scale/opacity animates on this inner motion.div instead, so the
          two transforms never fight over the same style property. Only replays
          on mount (drilling into/out of a submenu forces a fresh set of pills —
          see RadialMenu's ringPath-keyed container), not on every toggle re-render. */}
      <motion.div
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
        exit={prefersReducedMotion ? undefined : "exit"}
        variants={prefersReducedMotion ? undefined : popVariants(popDelay)}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
      >
        {content}
      </motion.div>
    </div>
  );
}
