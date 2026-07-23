import type { SavedDesign } from "@/store/types";
import { DeleteIcon } from "@/components/RadialMenu/icons";

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function DesignCard({
  design,
  onSelect,
  onDelete,
}: {
  design: SavedDesign;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    // shrink-0: this card is a flex child of the drawer's scrollable list — that
    // list (and this card itself, via overflow-hidden) both have non-visible
    // overflow, which per the flexbox spec zeroes their automatic min-size floor.
    // Without shrink-0, the default flex-shrink:1 on every card then lets them
    // all compress to fit whatever space is left instead of the list actually
    // scrolling — the list would rather squash every card's aspect-video
    // thumbnail down to a sliver than let its own height exceed the drawer.
    <div className="glass-panel group relative shrink-0 overflow-hidden rounded-2xl">
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <img src={design.thumbnailDataUrl} alt={design.name || "Untitled design"} className="aspect-video w-full object-cover" />
        <div className="px-3 py-2">
          <div className="truncate text-[12px]">{design.name || "Untitled"}</div>
          <div className="text-[10px] opacity-60">
            {design.width}×{design.height} · {relativeTime(design.updatedAt)}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete design"
        // Fixed neutral backdrop (not a --chrome-* token) is intentional: it sits over an
        // arbitrary user thumbnail image, not chrome, so it needs to stay legible against any
        // image content regardless of theme.
        className="press-scale absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <DeleteIcon />
      </button>
    </div>
  );
}
