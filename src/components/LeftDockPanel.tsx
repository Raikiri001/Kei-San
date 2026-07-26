import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "@/components/EffectsDrawer/icons";
import { HEADER_HEIGHT, PANEL_PUSH_TRANSITION, RAIL_WIDTH } from "@/constants/defaults";

interface LeftDockPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width: number;
  children: ReactNode;
  /** Extra control(s) in the header, before the close button — e.g. Image
   * Effects' "+ Layer Mix" button. */
  headerExtra?: ReactNode;
  /** Rendered first, absolutely positioned by the caller — only the Image
   * Effects panel passes one (its own-width resize grip). */
  resizeHandle?: ReactNode;
}

/**
 * The one shared shell every rail button that opens a panel now expands
 * into (Upload, Image FX, Text FX, Canvas, Color, My Designs) — docked flush
 * against the rail's right edge, full height to match it, sliding in via a
 * plain transform with no Radix Dialog underneath (see EffectsDrawer.tsx's
 * own doc comment for why: this needs to stay permanently mounted so it can
 * push-animate the canvas/ruler over in lockstep — see App.tsx, which reads
 * uiStore's activeLeftPanel to compute exactly how much room to leave).
 */
export function LeftDockPanel({ open, onClose, title, width, children, headerExtra, resizeHandle }: LeftDockPanelProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <div
      role="dialog"
      aria-label={title}
      className="chrome-bar dock-panel-bar fixed z-40 flex flex-col p-6"
      style={{
        width,
        left: RAIL_WIDTH,
        top: HEADER_HEIGHT,
        bottom: 0,
        transform: `translateX(${open ? "0" : "-100%"})`,
        transition: `transform ${PANEL_PUSH_TRANSITION}`,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {resizeHandle}
      <div className="mb-6 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {headerExtra}
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="bar-glow-hover press-scale flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--bar-border)/0.3)] opacity-70 hover:opacity-100"
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center">
              <CloseIcon />
            </span>
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
