import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useUIStore } from "@/store/uiStore";
import { useClickOutside } from "@/hooks/useClickOutside";
import { getRingPositions } from "@/components/RadialMenu/ring-layout";
import { IconPill } from "@/components/RadialMenu/IconPill";
import { BackChevronIcon } from "@/components/RadialMenu/icons";
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
  /**
   * Marks this item as a group pill: clicking it drills into a nested ring made
   * of these items instead of firing onClick/popoverContent/expandedContent
   * (a group pill never sets those three at the same time as this one).
   */
  subItems?: RingItem[];
}

/**
 * Walks `rootItems` by key through `path`, descending into each matched item's
 * `subItems`, and returns the live subItems array at the end of the path (or
 * `rootItems` itself for an empty path). Re-run every render off the current
 * (freshly computed) rootItems — never cache the resolved array in state — so
 * a drilled-in submenu always reflects live store data instead of a stale
 * snapshot from the moment the user drilled in.
 */
function resolveActiveItems(rootItems: RingItem[], path: string[]): RingItem[] {
  let items = rootItems;
  for (const key of path) {
    const match = items.find((item) => item.key === key);
    if (!match?.subItems) return items;
    items = match.subItems;
  }
  return items;
}

export function RadialMenu() {
  const radialMenu = useUIStore((s) => s.radialMenu);
  const closeRadialMenu = useUIStore((s) => s.closeRadialMenu);
  const rootRef = useRef<HTMLDivElement>(null);
  const [openPopoverKey, setOpenPopoverKey] = useState<string | null>(null);
  // Path of group-pill keys drilled into so far (not the item arrays themselves —
  // see resolveActiveItems above for why storing live keys instead of a snapshot
  // is what keeps drilled-in toggles in sync with the store).
  const [ringPath, setRingPath] = useState<string[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const canvasItems = useCanvasContextItems();
  const imageItems = useImageContextItems(radialMenu?.targetId ?? null);
  const textItems = useTextContextItems(radialMenu?.targetId ?? null);

  useClickOutside(rootRef, closeRadialMenu, !!radialMenu?.open);

  // A fresh menu open (or switching to a different target/context) should never
  // inherit a popover or a drilled-into submenu left over from a previous one.
  useEffect(() => {
    setOpenPopoverKey(null);
    setRingPath([]);
  }, [radialMenu?.open, radialMenu?.targetId, radialMenu?.context]);

  if (!radialMenu?.open) return null;

  const rootItems =
    radialMenu.context === "canvas" ? canvasItems : radialMenu.context === "image" ? imageItems : textItems;

  const activeItems = resolveActiveItems(rootItems, ringPath);
  const backItem: RingItem = {
    key: "__back",
    icon: <BackChevronIcon />,
    label: "Back",
    onClick: () => setRingPath((p) => p.slice(0, -1)),
  };
  const items = ringPath.length ? [backItem, ...activeItems] : activeItems;

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
        {/* Keyed by drill depth so drilling into/out of a group pill's submenu replays the pop-in. */}
        <div key={ringPath.length} className="radial-appear absolute inset-0">
          {items.map((item, idx) => (
            <IconPill
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={item.active || openPopoverKey === item.key || (!!item.subItems && item.subItems.some((si) => si.active))}
              onClick={
                item.subItems
                  ? () => setRingPath((p) => [...p, item.key])
                  : item.popoverContent
                    ? () => setOpenPopoverKey((k) => (k === item.key ? null : item.key))
                    : item.onClick
              }
              expandedContent={item.expandedContent}
              wide={item.wide}
              x={positions[idx].x}
              y={positions[idx].y}
              popDelay={idx * 0.035}
            />
          ))}
        </div>
        {openPopoverItem && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }
            }
            className="glass-panel cut-corner pointer-events-auto fixed z-10 max-h-[min(70vh,520px)] -translate-x-1/2 overflow-y-auto p-3"
            style={{ left: radialMenu.x, top: popoverTop }}
          >
            {openPopoverItem.popoverContent}
          </motion.div>
        )}
      </div>
    </div>
  );
}
