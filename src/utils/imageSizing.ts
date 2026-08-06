/** Shared "fit a freshly-placed image to a sane initial size" rule — caps its
 * longest side at 60% of the canvas's shorter dimension, never upscaling a
 * naturally-smaller image. Used both for a brand-new upload (useImageUpload)
 * and for spawning another instance of an already-uploaded asset (spawnAsset),
 * so the two paths size an image identically. */
export function fitDisplaySize(naturalWidth: number, naturalHeight: number, projectWidth: number, projectHeight: number) {
  const maxDim = Math.min(projectWidth, projectHeight) * 0.6;
  const scale = Math.min(1, maxDim / Math.max(naturalWidth, naturalHeight));
  return { displayWidth: naturalWidth * scale, displayHeight: naturalHeight * scale };
}
