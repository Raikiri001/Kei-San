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

/** Parses a #rgb or #rrggbb hex string into RGB, or null if it isn't valid. */
export function hexToRgb(hex: string): RGB | null {
  const trimmed = hex.trim().replace(/^#/, "");
  const normalized =
    trimmed.length === 3
      ? trimmed
          .split("")
          .map((c) => c + c)
          .join("")
      : trimmed;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
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

/** Composes a #rrggbb hex string with an alpha (0-1) into a CSS rgba() string. */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

/** HSV (aka HSB): h in [0,360), s/v in [0,1] — the "drag toward white/black" square
 * picker's native color space, distinct from the HSL used elsewhere for the
 * suggestion-swatch math (HSL's lightness axis behaves differently: at l=0.5 it's
 * the pure hue regardless of saturation, whereas HSV's v axis is what actually
 * darkens straight toward black the way the picker board's vertical drag expects). */
export function rgbToHsv({ r, g, b }: RGB): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;

  if (d === 0) return { h: 0, s, v };
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / d) % 6;
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, v };
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  const hn = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hn < 60) [rp, gp, bp] = [c, x, 0];
  else if (hn < 120) [rp, gp, bp] = [x, c, 0];
  else if (hn < 180) [rp, gp, bp] = [0, c, x];
  else if (hn < 240) [rp, gp, bp] = [0, x, c];
  else if (hn < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: Math.round((rp + m) * 255), g: Math.round((gp + m) * 255), b: Math.round((bp + m) * 255) };
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
