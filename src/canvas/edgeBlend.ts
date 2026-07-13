import { getDownsampledImageData } from "@/canvas/pixelSampling";
import type { RGB } from "@/canvas/colorExtraction";

const ALPHA_SKIP_THRESHOLD = 16;

/** Averages the outer ring of pixels of a downsampled copy of `img` into one ambient edge color. */
export function getEdgeAverageColor(img: HTMLImageElement, sampleDim = 32): RGB {
  const { data, width, height } = getDownsampledImageData(img, sampleDim);

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const accumulate = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const a = data[i + 3];
    if (a < ALPHA_SKIP_THRESHOLD) return;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  };

  for (let x = 0; x < width; x++) {
    accumulate(x, 0);
    accumulate(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    accumulate(0, y);
    accumulate(width - 1, y);
  }

  if (count === 0) return { r: 128, g: 128, b: 128 };
  return { r: r / count, g: g / count, b: b / count };
}

export const EDGE_BLEND = {
  marginRatio: 0.15,
  marginMin: 24,
  marginMax: 220,
  blurRatio: 0.5,
  alpha: 0.6,
};

/** Auto-formula used only to seed a starting `edgeBlendMargin` value at upload time — the margin is a user-adjustable, independently stored value afterward. */
export function resolveDefaultMargin(w: number, h: number): number {
  const raw = Math.min(w, h) * EDGE_BLEND.marginRatio;
  return Math.min(EDGE_BLEND.marginMax, Math.max(EDGE_BLEND.marginMin, raw));
}

/** Draws a soft blurred glow behind an image's box, using its own sampled edge color and an explicit margin size. */
export function drawEdgeGlow(
  ctx: CanvasRenderingContext2D,
  color: RGB,
  x: number,
  y: number,
  w: number,
  h: number,
  margin: number,
) {
  const blur = margin * EDGE_BLEND.blurRatio;

  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${EDGE_BLEND.alpha})`;
  ctx.fillRect(x - margin, y - margin, w + margin * 2, h + margin * 2);
  ctx.restore();
}

/** CSS box-shadow string approximating drawEdgeGlow for the DOM preview, given the same explicit margin. */
export function getEdgeGlowBoxShadow(color: RGB, margin: number): string {
  const blur = margin * EDGE_BLEND.blurRatio;
  return `0 0 ${blur}px ${margin * 0.5}px rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${EDGE_BLEND.alpha})`;
}
