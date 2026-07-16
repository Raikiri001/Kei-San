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
    <div className="corner-frame glass-panel group relative overflow-hidden">
      <span className="corner-tl" />
      <span className="corner-bl" />
      <span className="corner-br" />
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
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <DeleteIcon />
      </button>
    </div>
  );
}
