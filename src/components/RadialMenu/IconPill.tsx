import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

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
}

const pillClass = (active?: boolean, wide?: boolean) =>
  clsx(
    "glass-panel flex h-11 items-center gap-2 overflow-hidden rounded-full px-3",
    "transition-[max-width,background-color] duration-150 ease-out",
    wide
      ? "max-w-11 group-hover:max-w-[280px] focus-within:max-w-[280px]"
      : "max-w-11 group-hover:max-w-[220px] focus-within:max-w-[220px]",
    active
      ? "border-accent/70 text-accent shadow-[0_0_12px_rgb(var(--color-accent-glow)/0.35)]"
      : "text-current",
  );

const labelClass =
  "whitespace-nowrap text-[11px] uppercase tracking-wide opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100";

export function IconPill({ icon, label, x, y, onClick, active, expandedContent, wide }: IconPillProps) {
  const style: CSSProperties = {
    transform: `translate(${x}px, ${y}px)`,
  };

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
      {content}
    </div>
  );
}
