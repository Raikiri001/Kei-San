import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUIStore } from "@/store/uiStore";
import { useClickOutside } from "@/hooks/useClickOutside";
import { getRingPositions } from "@/components/RadialMenu/ring-layout";
import { IconPill } from "@/components/RadialMenu/IconPill";
import { useCanvasContextItems } from "@/components/RadialMenu/contexts/CanvasContextMenu";
import { useImageContextItems } from "@/components/RadialMenu/contexts/ImageContextMenu";
import { useTextContextItems } from "@/components/RadialMenu/contexts/TextContextMenu";

export interface RingItem {
  key: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  /** Inline content revealed on hover (steppers, small inputs) — stays within the pill's own row. */
  expandedContent?: ReactNode;
  /** Larger floating panel toggled open by clicking the pill (e.g. the color picker) instead of hover-expanding inline. */
  popoverContent?: ReactNode;
  /** Widens the hover-expanded pill (e.g. for a multi-swatch color panel). */
  wide?: boolean;
}

export function RadialMenu() {
  const radialMenu = useUIStore((s) => s.radialMenu);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);
  const rootRef = useRef<HTMLDivElement>(null);
  const [openPopoverKey, setOpenPopoverKey] = useState<string | null>(null);

  const canvasItems = useCanvasContextItems();
  const imageItems = useImageContextItems(radialMenu?.targetId ?? null);
  const textItems = useTextContextItems(radialMenu?.targetId ?? null);

  useClickOutside(rootRef, closeRadialMenu, !!radialMenu?.open);

  // A fresh menu open should never inherit a popover left open from a previous one.
  useEffect(() => {
    if (!radialMenu?.open) setOpenPopoverKey(null);
  }, [radialMenu?.open]);

  if (!radialMenu?.open) return null;

  const items =
    radialMenu.context === "canvas" ? canvasItems : radialMenu.context === "image" ? imageItems : textItems;

  const positions = getRingPositions(items.length);
  const openPopoverItem = items.find((item) => item.key === openPopoverKey && item.popoverContent);

  // Positioned in true viewport coordinates (not relative to the ring anchor) and
  // clamped against an estimated max height, so a tall panel (color wheel + swatches
  // + hex/RGB fields) never gets pushed off the top or bottom of the screen — the
  // internal max-height + scroll below is a second line of defense for anything
  // still taller than the estimate.
  const POPOVER_ESTIMATED_HEIGHT = 480;
  const POPOVER_VIEWPORT_MARGIN = 16;
  const popoverTop = Math.min(
    Math.max(POPOVER_VIEWPORT_MARGIN, radialMenu.y + 110),
    window.innerHeight - POPOVER_ESTIMATED_HEIGHT - POPOVER_VIEWPORT_MARGIN,
  );

  return (
    <div
      ref={rootRef}
      className="radial-appear pointer-events-none fixed z-50"
      style={{ left: radialMenu.x, top: radialMenu.y }}
    >
      <div className="pointer-events-auto relative h-0 w-0">
        <div className="glass-panel absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" />
        {items.map((item, idx) => (
          <IconPill
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={item.active || openPopoverKey === item.key}
            onClick={
              item.popoverContent
                ? () => setOpenPopoverKey((k) => (k === item.key ? null : item.key))
                : item.onClick
            }
            expandedContent={item.expandedContent}
            wide={item.wide}
            x={positions[idx].x}
            y={positions[idx].y}
          />
        ))}
        {openPopoverItem && (
          <div
            className="glass-panel corner-frame radial-appear pointer-events-auto fixed z-10 max-h-[min(70vh,520px)] -translate-x-1/2 overflow-y-auto p-3"
            style={{ left: radialMenu.x, top: popoverTop }}
          >
            <span className="corner-bl" />
            <span className="corner-br" />
            {openPopoverItem.popoverContent}
          </div>
        )}
      </div>
    </div>
  );
}
