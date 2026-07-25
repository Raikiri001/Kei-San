import { useEffect } from "react";
import { useUIStore } from "@/store/uiStore";
import { CloseIcon } from "@/components/EffectsDrawer/icons";
import { HEADER_HEIGHT, PANEL_PUSH_TRANSITION, RAIL_WIDTH, TEXT_EFFECTS_PANEL_WIDTH } from "@/constants/defaults";

/**
 * Text Effects' left-docked panel — same docked shell and push-animation as
 * the Image Effects stack panel (EffectsDrawer.tsx), but with no actual
 * effects wired up yet: the button + working open/close/push behavior is
 * the whole scope for now, content comes later.
 */
export function TextEffectsDrawer() {
  const open = useUIStore((s) => s.textEffectsDrawerOpen);
  const setOpen = useUIStore((s) => s.setTextEffectsDrawerOpen);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  return (
    <div
      role="dialog"
      aria-label="Text Effects"
      className="glass-panel stack-panel-bar fixed z-40 flex flex-col p-6"
      style={{
        width: TEXT_EFFECTS_PANEL_WIDTH,
        left: RAIL_WIDTH,
        top: HEADER_HEIGHT,
        bottom: 0,
        transform: `translateX(${open ? "0" : "-100%"})`,
        transition: `transform ${PANEL_PUSH_TRANSITION}`,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <h2 className="text-[16px] font-semibold">Text Effects</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close Text Effects"
          className="accent-glow-hover press-scale flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--chrome-border)/0.3)] opacity-70 hover:opacity-100"
        >
          <span className="flex h-3.5 w-3.5 items-center justify-center">
            <CloseIcon />
          </span>
        </button>
      </div>
      <p className="mt-8 text-center text-[12px] opacity-50">Text effects are coming soon.</p>
    </div>
  );
}
