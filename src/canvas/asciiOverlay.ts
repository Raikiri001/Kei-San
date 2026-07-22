import type { AsciiEffect } from "@/store/types";

// Sparse -> dense, matching a dark background with brighter pixels drawn as denser/
// more-filled glyphs (a glowing-terminal look) rather than the inverse convention
// used for dark-ink-on-paper ASCII art.
const CHAR_RAMP = " .:-=+*#%@";

let scratchCanvas: HTMLCanvasElement | null = null;
function getScratchCanvas(w: number, h: number): HTMLCanvasElement {
  if (!scratchCanvas) scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = w;
  scratchCanvas.height = h;
  return scratchCanvas;
}

/**
 * Renders the ASCII-art look for a box already containing `source`'s pixels (the
 * already-GPU-rendered content, or the plain image — whatever would otherwise have
 * been drawn in the box) into a fresh same-size scratch canvas, sampling luminance/
 * color from `source`. Returns that scratch canvas — callers `drawImage` it back into
 * their own destination context (which may be rotated/translated) rather than
 * drawing into it directly here, since `getImageData` ignores the current transform
 * but `drawImage` doesn't; see ImageElementView.tsx/exportEngine.ts's call sites.
 */
export function renderAsciiOverlay(source: CanvasImageSource, w: number, h: number, params: AsciiEffect): HTMLCanvasElement {
  const boxW = Math.max(1, Math.ceil(w));
  const boxH = Math.max(1, Math.ceil(h));
  const canvas = getScratchCanvas(boxW, boxH);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, boxW, boxH);
  ctx.drawImage(source, 0, 0, boxW, boxH);
  const { data } = ctx.getImageData(0, 0, boxW, boxH);

  const cell = Math.max(4, params.cellSize);
  ctx.clearRect(0, 0, boxW, boxH);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, boxW, boxH);
  ctx.font = `${cell}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let cy = 0; cy < boxH; cy += cell) {
    const cellH = Math.min(cell, boxH - cy);
    for (let cx = 0; cx < boxW; cx += cell) {
      const cellW = Math.min(cell, boxW - cx);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let py = cy; py < cy + cellH; py++) {
        for (let px = cx; px < cx + cellW; px++) {
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
      if (a < 16) continue;

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const charIndex = Math.min(CHAR_RAMP.length - 1, Math.floor(lum * CHAR_RAMP.length));
      const char = CHAR_RAMP[charIndex];
      if (char === " ") continue;

      ctx.fillStyle = params.colorMode === "color" ? `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})` : "white";
      ctx.fillText(char, cx + cellW / 2, cy + cellH / 2);
    }
  }

  return canvas;
}
