import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "@/hooks/useClickOutside";
import { ColorPickerPanel } from "@/components/RadialMenu/contexts/ColorPickerPanel";
import type { SuggestionGroup } from "@/components/RadialMenu/contexts/ColorSwatchPanel";

interface ColorPickerButtonProps {
  value: string;
  /** Omit for a color with no meaningful transparency of its own (e.g. an effect tint). */
  alpha?: number;
  onChange: (hex: string) => void;
  onAlphaChange?: (alpha: number) => void;
  suggestionGroups?: SuggestionGroup[];
  label?: string;
  className?: string;
}

const VIEWPORT_MARGIN = 16;
const ANCHOR_GAP = 8;

/**
 * The same swatch-picking experience as the canvas background color picker
 * (ColorPickerPanel: suggestions + saved swatches + saturation/value board +
 * hue/alpha + hex/RGB + eyedropper) — used everywhere else in the app a color
 * needs picking, so an effect's tint/ink/duotone colors don't fall back to the
 * browser's own native OS color dialog, which looks and behaves nothing like
 * the rest of this app. A small swatch button opens a popover with the panel
 * in it; unlike RailPopover (always anchored to the rail's own left edge),
 * this measures which side actually has room, since it gets used anywhere —
 * including right up against the screen's right edge in the Layer Inspector.
 */
export function ColorPickerButton({ value, alpha, onChange, onAlphaChange, suggestionGroups = [], label = "Pick color", className }: ColorPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useClickOutside([anchorRef, panelRef], () => setOpen(false), open);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    const panelWidth = panel?.offsetWidth ?? 0;
    const panelHeight = panel?.offsetHeight ?? 0;
    const fitsRight = anchorRect.right + ANCHOR_GAP + panelWidth <= window.innerWidth - VIEWPORT_MARGIN;
    const left = fitsRight ? anchorRect.right + ANCHOR_GAP : Math.max(VIEWPORT_MARGIN, anchorRect.left - ANCHOR_GAP - panelWidth);
    const top = Math.min(anchorRect.top, window.innerHeight - panelHeight - VIEWPORT_MARGIN);
    setPos({ left, top: Math.max(VIEWPORT_MARGIN, top) });
  }, [open]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={className ?? "h-6 w-10 shrink-0 cursor-pointer rounded border border-[rgb(var(--chrome-border)/0.3)]"}
        style={{ background: value }}
      />
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="glass-panel radial-appear fixed z-50 rounded-2xl"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, visibility: pos ? "visible" : "hidden" }}
          >
            <ColorPickerPanel suggestionGroups={suggestionGroups} value={value} alpha={alpha} onChange={onChange} onAlphaChange={onAlphaChange} />
          </div>,
          document.body,
        )}
    </>
  );
}
