import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";

interface IconPillProps {
  icon: ReactNode;
  label: string;
  x: number;
  y: number;
  onClick?: () => void;
  active?: boolean;
  /** Inline content (input/swatches) revealed alongside the label on hover. */
  expandedContent?: ReactNode;
  /** Widens the hover-expanded pill (e.g. for swatch rows that need more room than a label). */
  wide?: boolean;
  /** Stagger delay (seconds) for this pill's pop-in, e.g. `index * 0.035` — only
   * replays when the pill actually (re)mounts, e.g. drilling into/out of a
   * submenu, not on every unrelated re-render within the same ring. */
  popDelay?: number;
}

const pillClass = (active?: boolean, wide?: boolean) =>
  clsx(
    "glass-panel accent-glow-hover press-sweep flex h-11 items-center gap-2 overflow-hidden rounded-full px-3",
    "transition-[max-width,background-color] duration-150 ease-out",
    wide
      ? "max-w-11 group-hover:max-w-[280px] focus-within:max-w-[280px]"
      : "max-w-11 group-hover:max-w-[220px] focus-within:max-w-[220px]",
    active
      ? "border-accent/70 text-accent shadow-[0_0_16px_rgb(var(--color-accent-glow)/0.5),0_0_32px_rgb(var(--color-accent-glow)/0.2)]"
      : "text-current",
  );

const labelClass =
  "whitespace-nowrap text-[11px] uppercase tracking-wide opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100";

export function IconPill({ icon, label, x, y, onClick, active, expandedContent, wide, popDelay = 0 }: IconPillProps) {
  const style: CSSProperties = {
    transform: `translate(${x}px, ${y}px)`,
  };
  const prefersReducedMotion = useReducedMotion();

  // Items with expandedContent host interactive controls (inputs/buttons) of their own,
  // so the pill root must be a <div>, not a <button> — nested buttons are invalid HTML
  // and browsers silently break out of them, corrupting the layout.
  const content = expandedContent ? (
    <div className={pillClass(active, wide)}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className={labelClass}>{label}</span>
      <span className={clsx(labelClass, "flex items-center")} onPointerDown={(e) => e.stopPropagation()}>
        {expandedContent}
      </span>
    </div>
  ) : (
    <button type="button" onClick={onClick} className={pillClass(active, wide)}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className={labelClass}>{label}</span>
    </button>
  );

  return (
    <div className="group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={style}>
      {/* Positioning (translate x/y above) stays on this plain outer div; the
          pop-in scale/opacity animates on this inner motion.div instead, so the
          two transforms never fight over the same style property. Only replays
          on mount (drilling into/out of a submenu forces a fresh set of pills —
          see RadialMenu's ringPath-keyed container), not on every toggle re-render. */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 22, delay: popDelay }
        }
      >
        {content}
      </motion.div>
    </div>
  );
}
