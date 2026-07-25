import type { ReactNode } from "react";

interface RailIconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  ariaExpanded?: boolean;
}

/** Rail button: the vertical (icon-above-label) counterpart to
 * ToolbarIconButton, sized to sit comfortably in the narrow left tool rail.
 * See .rail-btn in index.css for the hover/active/press feedback. */
export function RailIconButton({ icon, label, onClick, active, ariaExpanded }: RailIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-expanded={ariaExpanded}
      data-active={active ? "true" : undefined}
      className="rail-btn flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-2xl py-3"
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span className="whitespace-nowrap text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}
