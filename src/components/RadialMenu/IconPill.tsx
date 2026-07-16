import { useState, type CSSProperties, type ReactNode } from "react";
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
  /** Stagger delay (seconds) for this pill's pop-in, e.g. `index * 0.035` — only
   * replays when the pill actually (re)mounts, e.g. drilling into/out of a
   * submenu, not on every unrelated re-render within the same ring. */
  popDelay?: number;
}

const COLLAPSED_W = 44;
// Wide pills host icon + label + stepper + input + "px" unit — 240 is the
// measured minimum for that combination without clipping the unit text; the
// bigger ring radius (see ring-layout.ts) is what keeps this from overlapping
// a neighbor now, not a narrower pill.
const WIDE_EXPANDED_W = 240;
const NARROW_EXPANDED_W = 200;

// Visible overshoot-then-settle on expand — a HUD panel deploying, not a flat
// width tween — plus a springy icon pop and a diagonal energy sweep, all keyed
// off the same "expanded" variant so hover reads as one choreographed beat
// instead of a label just quietly fading in.
const WIDTH_SPRING = { type: "spring" as const, stiffness: 260, damping: 16, mass: 0.95 };
const LABEL_SPRING = { type: "spring" as const, stiffness: 420, damping: 24 };
const SWEEP_TWEEN = { duration: 0.48, ease: [0.16, 1, 0.3, 1] as const };

const labelVariants: Variants = {
  collapsed: { opacity: 0, x: -8 },
  expanded: { opacity: 1, x: 0 },
};
const iconVariants: Variants = {
  collapsed: { scale: 1 },
  expanded: { scale: 1.15 },
};
const sweepVariants: Variants = {
  collapsed: { x: "-130%" },
  expanded: { x: "130%" },
};

function pillBaseClass(hasStatus?: boolean, active?: boolean, disabled?: boolean) {
  return clsx(
    "glass-panel corner-frame relative flex h-11 items-center gap-2 overflow-hidden px-3",
    !disabled && "accent-glow-hover press-sweep press-scale",
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

function Sweep({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  if (prefersReducedMotion) return null;
  return (
    <motion.span
      variants={sweepVariants}
      transition={SWEEP_TWEEN}
      className="pointer-events-none absolute -inset-y-[60%] -inset-x-[30%]"
      style={{
        background: "linear-gradient(100deg, transparent 35%, rgb(var(--color-accent-glow) / 0.45) 50%, transparent 65%)",
      }}
    />
  );
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
  popDelay = 0,
}: IconPillProps) {
  const outerStyle: CSSProperties = { transform: `translate(${x}px, ${y}px)` };
  const prefersReducedMotion = useReducedMotion();
  const hasStatus = status !== undefined;
  const expandedWidth = wide ? WIDE_EXPANDED_W : NARROW_EXPANDED_W;
  // expandedContent hosts real nested <input>/<button> controls — a keyboard
  // user tabbing into those needs the pill to stay unfurled, but Framer's
  // whileFocus only fires when the *animated* element itself is focused, not a
  // descendant, so that specific case needs its own focus-tracked state.
  const [contentFocused, setContentFocused] = useState(false);

  const widthVariants: Variants = {
    collapsed: { width: COLLAPSED_W },
    expanded: { width: expandedWidth },
  };

  const inner = (
    <>
      <span className="corner-tl" />
      <span className="corner-bl" />
      <span className="corner-br" />
      <Sweep prefersReducedMotion={prefersReducedMotion} />
      <motion.span
        variants={prefersReducedMotion ? undefined : iconVariants}
        transition={LABEL_SPRING}
        className="flex h-5 w-5 shrink-0 items-center justify-center"
      >
        {icon}
      </motion.span>
      <motion.span
        variants={prefersReducedMotion ? undefined : labelVariants}
        transition={LABEL_SPRING}
        className="whitespace-nowrap text-[11px] uppercase tracking-wide"
      >
        {label}
      </motion.span>
      {expandedContent && (
        <motion.span
          variants={prefersReducedMotion ? undefined : labelVariants}
          transition={LABEL_SPRING}
          className="flex items-center"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {expandedContent}
        </motion.span>
      )}
    </>
  );

  // Items with expandedContent host interactive controls (inputs/buttons) of their own,
  // so the pill root must be a <div>, not a <button> — nested buttons are invalid HTML
  // and browsers silently break out of them, corrupting the layout.
  const content = expandedContent ? (
    <motion.div
      aria-disabled={disabled}
      initial="collapsed"
      animate={contentFocused ? "expanded" : "collapsed"}
      whileHover={disabled || prefersReducedMotion ? undefined : "expanded"}
      variants={prefersReducedMotion ? undefined : widthVariants}
      transition={prefersReducedMotion ? { duration: 0 } : WIDTH_SPRING}
      onFocus={() => setContentFocused(true)}
      onBlur={() => setContentFocused(false)}
      className={pillBaseClass(hasStatus, active, disabled)}
      style={{ ...statusStyle(status), ...(prefersReducedMotion ? { width: COLLAPSED_W } : undefined) }}
    >
      {inner}
    </motion.div>
  ) : (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial="collapsed"
      whileHover={disabled || prefersReducedMotion ? undefined : "expanded"}
      whileFocus={disabled || prefersReducedMotion ? undefined : "expanded"}
      variants={prefersReducedMotion ? undefined : widthVariants}
      transition={prefersReducedMotion ? { duration: 0 } : WIDTH_SPRING}
      className={pillBaseClass(hasStatus, active, disabled)}
      style={{ ...statusStyle(status), ...(prefersReducedMotion ? { width: COLLAPSED_W } : undefined) }}
    >
      {inner}
    </motion.button>
  );

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={outerStyle}>
      {/* Positioning (translate x/y above) stays on this plain outer div; the
          pop-in scale/opacity animates on this inner motion.div instead, so the
          two transforms never fight over the same style property. Only replays
          on mount (drilling into/out of a submenu forces a fresh set of pills —
          see RadialMenu's ringPath-keyed container), not on every toggle re-render. */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 24, delay: popDelay }
        }
      >
        {content}
      </motion.div>
    </div>
  );
}
