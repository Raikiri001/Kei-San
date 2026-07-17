export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Picks the natural-space source rect for an image given its crop state, for
 * canvas drawImage's 9-arg source-rect form. Stretching this rect to the
 * display box (ignoring its aspect ratio) is what makes resize "squish" the
 * image instead of cropping it — the crop rect itself is what implements
 * cropping, entirely independent of the box's own aspect ratio.
 *
 * At `cropZoom` 1 (default, no crop) this is just the whole natural image, so
 * a plain resize-drag squish is this function's `cropZoom=1` case with zero
 * extra math. `cropOffsetX/Y` are fractions (-1..1) of the max pannable
 * distance at the current zoom, not raw px, matching ImageElement's stored
 * fields — see the doc comment there for why (stays valid across later
 * resizes of the frame).
 */
export function computeCropSourceRect(
  naturalW: number,
  naturalH: number,
  cropZoom: number,
  cropOffsetX: number,
  cropOffsetY: number,
): Rect {
  const width = naturalW / cropZoom;
  const height = naturalH / cropZoom;
  const maxOffsetX = (naturalW - width) / 2;
  const maxOffsetY = (naturalH - height) / 2;
  // Minus, not plus: the DOM crop preview (ImageElementView) pans by moving the
  // *image* itself by +offset (grab-and-slide — dragging right slides the image
  // right), which is equivalent to the sampled source window moving the
  // opposite way, i.e. by -offset. Getting this backwards doesn't break either
  // path in isolation, only their agreement — was previously flipped, so the
  // canvas-rendered result (halftone preview, and PNG export) landed mirrored
  // relative to the plain DOM preview at the same stored crop values.
  const centerX = naturalW / 2 - clamp(cropOffsetX, -1, 1) * maxOffsetX;
  const centerY = naturalH / 2 - clamp(cropOffsetY, -1, 1) * maxOffsetY;

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}
