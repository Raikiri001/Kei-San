import { computeCropSourceRect } from "@/utils/coverFit";
import type { RGB } from "@/canvas/colorExtraction";

export const DOT_PITCH = 14;
const ALPHA_SKIP_THRESHOLD = 20;

export type HalftoneMode = "color" | "ink";

/**
 * Draws `img` into the box (x,y,w,h) on `ctx` as a halftone-style grid of dots:
 * one dot per dotPitch x dotPitch cell, radius scaled by that cell's darkness
 * (darker -> bigger dot, the classic halftone convention), filled with either
 * the cell's own averaged color ("color" mode) or a single flat ink color.
 */
export function drawHalftone(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  mode: HalftoneMode,
  inkColor: RGB,
  dotPitch = DOT_PITCH,
  cropZoom = 1,
  cropOffsetX = 0,
  cropOffsetY = 0,
) {
  const boxW = Math.ceil(w);
  const boxH = Math.ceil(h);
  if (boxW <= 0 || boxH <= 0) return;

  const source = document.createElement("canvas");
  source.width = boxW;
  source.height = boxH;
  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  if (!sourceCtx) return;

  // Stretched (not cover-cropped) to the box — see computeCropSourceRect's doc
  // comment: this is what makes resize squish the image, with cropZoom/Offset
  // as the separate, independent crop-mode mechanism.
  const crop = computeCropSourceRect(img.naturalWidth, img.naturalHeight, cropZoom, cropOffsetX, cropOffsetY);
  sourceCtx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, boxW, boxH);

  // Single whole-box readback: far cheaper than one getImageData call per cell,
  // and averaging every pixel in a cell from this one buffer is barely more
  // expensive than sampling just its center pixel — so we get smoother, less
  // noisy dot values for effectively the same cost.
  const { data } = sourceCtx.getImageData(0, 0, boxW, boxH);
  const maxRadius = (dotPitch / 2) * 0.95;

  ctx.save();
  // Clip to the image's own box: the last row/column of cells is almost always
  // partial (box dimensions are rarely an exact multiple of dotPitch), and a
  // fully-dark partial-edge cell can compute a radius bigger than its remaining
  // space — without this clip that dot pokes outside the image's bounding box.
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  for (let cellY = 0; cellY < boxH; cellY += dotPitch) {
    const cellH = Math.min(dotPitch, boxH - cellY);
    for (let cellX = 0; cellX < boxW; cellX += dotPitch) {
      const cellW = Math.min(dotPitch, boxW - cellX);

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let py = cellY; py < cellY + cellH; py++) {
        for (let px = cellX; px < cellX + cellW; px++) {
          const i = (py * boxW + px) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          a += data[i + 3];
          count += 1;
        }
      }
      if (count === 0) continue;
      r /= count;
      g /= count;
      b /= count;
      a /= count;

      if (a < ALPHA_SKIP_THRESHOLD) continue;

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const radius = maxRadius * (1 - luminance);
      if (radius <= 0.4) continue;

      const centerX = x + cellX + cellW / 2;
      const centerY = y + cellY + cellH / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle =
        mode === "ink"
          ? `rgb(${inkColor.r}, ${inkColor.g}, ${inkColor.b})`
          : `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      ctx.fill();
    }
  }

  ctx.restore();
}

/** Picks a high-contrast ink color (black or white) against a given background hex color. */
export function resolveInkColor(backgroundColor: string): RGB {
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
}
