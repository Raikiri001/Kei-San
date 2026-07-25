import type { ReactNode } from "react";

interface ToolbarIconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  ariaExpanded?: boolean;
}

/** Header toolbar button: icon + label always visible (the header bar is
 * permanent and full-width, so there's no need to collapse to a bare glyph
 * and unfurl on hover — that measure-and-animate-width dance is gone along
 * with the scrollLeft-clipping workaround it needed). All of the hover-lift/
 * active-glow/press-down feedback lives in the .toolbar-btn CSS class (see
 * index.css) rather than Tailwind utilities, since the class already owns
 * border-color/background/transform and a plain utility can't win against
 * that in Tailwind v4's cascade layers. */
export function ToolbarIconButton({ icon, label, onClick, active, ariaExpanded }: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-expanded={ariaExpanded}
      data-active={active ? "true" : undefined}
      className="toolbar-btn flex h-10 items-center gap-2 rounded-full px-4"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
      <span className="shrink-0 whitespace-nowrap text-[12px] font-medium">{label}</span>
    </button>
  );
}
