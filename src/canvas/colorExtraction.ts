import { getDownsampledImageData } from "@/canvas/pixelSampling";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorSuggestions {
  /** Dark -> light, same hue/saturation as the dominant color. */
  monochromatic: string[];
  /** Literal (255-r, 255-g, 255-b) inverse of the dominant color. */
  complementary: string;
  /** Dominant hue shifted -30deg and +30deg. */
  analogous: [string, string];
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return { h: h * 60, s, l };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const hn = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const hueToRgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const hk = hn / 360;
  return {
    r: Math.round(hueToRgb(hk + 1 / 3) * 255),
    g: Math.round(hueToRgb(hk) * 255),
    b: Math.round(hueToRgb(hk - 1 / 3) * 255),
  };
}

const ALPHA_SKIP_THRESHOLD = 16;

/**
 * Simple popularity/histogram color quantization: bucket pixels by rounding each
 * channel to the nearest `bucketSize`, tracking a running RGB sum per bucket so the
 * winning bucket returns its actual average color rather than a blocky rounded one.
 * Pixels with low alpha are skipped so transparent PNG padding doesn't skew the result.
 */
export function getDominantColor(img: HTMLImageElement, bucketSize = 32, sampleDim = 32): RGB {
  const { data } = getDownsampledImageData(img, sampleDim);

  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < ALPHA_SKIP_THRESHOLD) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${Math.round(r / bucketSize)}-${Math.round(g / bucketSize)}-${Math.round(b / bucketSize)}`;

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  let winner: { r: number; g: number; b: number; count: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!winner || bucket.count > winner.count) winner = bucket;
  }

  if (!winner) return { r: 128, g: 128, b: 128 };
  return { r: winner.r / winner.count, g: winner.g / winner.count, b: winner.b / winner.count };
}

export function getColorSuggestions(img: HTMLImageElement): ColorSuggestions {
  const dominant = getDominantColor(img);
  const { h, s, l } = rgbToHsl(dominant);

  const monochromatic: string[] = [
    rgbToHex(hslToRgb(h, s, Math.max(0, l * 0.55))),
    rgbToHex(dominant),
    rgbToHex(hslToRgb(h, s, Math.min(1, l + (1 - l) * 0.5))),
  ];

  const complementary = rgbToHex({ r: 255 - dominant.r, g: 255 - dominant.g, b: 255 - dominant.b });

  const analogous: [string, string] = [
    rgbToHex(hslToRgb(h - 30, s, l)),
    rgbToHex(hslToRgb(h + 30, s, l)),
  ];

  return { monochromatic, complementary, analogous };
}
