import { ASSET_DRAG_MIME, type UploadedAsset } from "@/store/assetLibraryStore";
import { DeleteIcon } from "@/components/RadialMenu/icons";

interface UploadedImageCardProps {
  asset: UploadedAsset;
  onSpawn: () => void;
  onRemove: () => void;
}

/** One thumbnail in the Upload panel's persistent asset library — clicking
 * always spawns a fresh instance centered on the canvas (same "always adds"
 * convention as EffectCard/PresetCard, never a select-existing toggle), and
 * it's also a native drag source: dragging it onto the canvas spawns that
 * instance at the drop point instead (see CanvasWorkspace's own drop
 * handler, keyed off the same ASSET_DRAG_MIME type). The remove button here
 * only removes it from this library — it has no effect on any copy already
 * placed on the canvas. */
export function UploadedImageCard({ asset, onSpawn, onRemove }: UploadedImageCardProps) {
  return (
    <div className="glass-panel press-scale group relative shrink-0 overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={onSpawn}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(ASSET_DRAG_MIME, asset.id);
          e.dataTransfer.effectAllowed = "copy";
        }}
        className="block w-full cursor-grab text-left active:cursor-grabbing"
        title="Click to add to canvas, or drag onto the canvas"
      >
        <img src={asset.dataUrl} alt="" draggable={false} className="aspect-square w-full object-cover" />
        <div className="px-2 py-1.5 text-[10px] opacity-60">
          {asset.naturalWidth}×{asset.naturalHeight}
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove from uploads"
        title="Remove from uploads"
        className="press-scale absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <DeleteIcon />
      </button>
    </div>
  );
}
