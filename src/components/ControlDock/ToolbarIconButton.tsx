import type { ReactNode } from "react";
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
const EXPANDED_W = 180;

// A visible overshoot-then-settle rather than a flat width tween — the pill
// snaps open past its target width and eases back, reading as a HUD panel
// deploying instead of a CSS fade. Label/icon/sweep all key off the same
// "expanded" variant so the whole button unfurls as one choreographed beat.
const WIDTH_SPRING = { type: "spring" as const, stiffness: 260, damping: 16, mass: 0.9 };
const LABEL_SPRING = { type: "spring" as const, stiffness: 420, damping: 24 };
const SWEEP_TWEEN = { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const };

const widthVariants: Variants = {
  collapsed: { width: COLLAPSED_W },
  expanded: { width: EXPANDED_W },
};
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
 * labeled pill with a springy overshoot + a diagonal energy sweep on
 * hover/focus (or `forceExpanded`) — the same HUD-deploy language as the
 * radial menu's IconPill, so every control surface in the app moves the same way. */
export function ToolbarIconButton({ icon, label, onClick, forceExpanded, active, ariaExpanded }: ToolbarIconButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const animateState = forceExpanded ? "expanded" : "collapsed";

  return (
    <motion.button
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
      transition={prefersReducedMotion ? { duration: 0 } : WIDTH_SPRING}
      className="corner-frame glass-panel accent-glow-hover press-scale relative flex h-9 items-center gap-2 overflow-hidden px-2.5"
      style={prefersReducedMotion ? { width: forceExpanded ? EXPANDED_W : COLLAPSED_W } : undefined}
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
          "whitespace-nowrap text-[11px] uppercase tracking-wide",
          prefersReducedMotion && !forceExpanded && "opacity-0",
        )}
      >
        {label}
      </motion.span>
    </motion.button>
  );
}
