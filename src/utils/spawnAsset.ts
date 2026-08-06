import { useProjectStore } from "@/store/projectStore";
import { fitDisplaySize } from "@/utils/imageSizing";
import type { UploadedAsset } from "@/store/assetLibraryStore";

/**
 * Places a fresh, independent canvas instance of an already-uploaded asset —
 * used by the Upload panel's own click-to-spawn (UploadedImageCard) and by
 * dragging a thumbnail onto the canvas (CanvasWorkspace's own drop handler).
 * Every spawn is a brand-new ImageElement (its own id/layers/crop/etc, see
 * addImage) — the same asset can be placed as many times as needed without
 * affecting any copy already on the canvas, and deleting one of those copies
 * never touches the asset itself.
 *
 * `position`, if given, is the new image's center in canvas-space px (e.g.
 * where it was dropped); omitted, addImage falls back to its own
 * centered-with-cascade default (used for a plain click).
 */
export function spawnAsset(asset: UploadedAsset, position?: { x: number; y: number }) {
  const { project, addImage } = useProjectStore.getState();
  const { displayWidth, displayHeight } = fitDisplaySize(asset.naturalWidth, asset.naturalHeight, project.width, project.height);
  addImage({
    dataUrl: asset.dataUrl,
    naturalWidth: asset.naturalWidth,
    naturalHeight: asset.naturalHeight,
    displayWidth,
    displayHeight,
    ...position,
  });
}
