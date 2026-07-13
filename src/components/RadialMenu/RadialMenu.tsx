import { useRef, type ReactNode } from "react";
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
  expandedContent?: ReactNode;
  /** Widens the hover-expanded pill (e.g. for a multi-swatch color panel). */
  wide?: boolean;
}

export function RadialMenu() {
  const radialMenu = useUIStore((s) => s.radialMenu);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);
  const rootRef = useRef<HTMLDivElement>(null);

  const canvasItems = useCanvasContextItems();
  const imageItems = useImageContextItems(radialMenu?.targetId ?? null);
  const textItems = useTextContextItems(radialMenu?.targetId ?? null);

  useClickOutside(rootRef, closeRadialMenu, !!radialMenu?.open);

  if (!radialMenu?.open) return null;

  const items =
    radialMenu.context === "canvas" ? canvasItems : radialMenu.context === "image" ? imageItems : textItems;

  const positions = getRingPositions(items.length);

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
            active={item.active}
            onClick={item.onClick}
            expandedContent={item.expandedContent}
            wide={item.wide}
            x={positions[idx].x}
            y={positions[idx].y}
          />
        ))}
      </div>
    </div>
  );
}
