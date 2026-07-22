export interface CurvePoint {
  x: number;
  y: number;
}

export const CURVE_LUT_SIZE = 32;

export const IDENTITY_CURVE: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

/**
 * Samples a smooth monotone cubic Hermite spline (Fritsch-Carlson tangents — the
 * standard technique for interpolating through control points without overshooting
 * between them, unlike a plain Catmull-Rom spline) through `points` at `size` evenly
 * spaced x positions, producing the flat float array a shader's `sampleCurve()` helper
 * linearly interpolates between. `points` must be sorted by x and include x=0 and x=1
 * (CurveField.tsx's own model guarantees this).
 */
export function curveToLUT(points: CurvePoint[], size = CURVE_LUT_SIZE): number[] {
  const pts = [...points].sort((a, b) => a.x - b.x);
  const n = pts.length;
  if (n < 2) return new Array(size).fill(0.5);

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    slopes.push(dx > 0 ? (ys[i + 1] - ys[i]) / dx : 0);
  }

  const tangents: number[] = new Array(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangents[i] = slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  }
  // Fritsch-Carlson limiter — clamps tangents so the spline never overshoots past its
  // own control points between two consecutive knots.
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      tangents[i] = t * a * slopes[i];
      tangents[i + 1] = t * b * slopes[i];
    }
  }

  const lut: number[] = [];
  for (let i = 0; i < size; i++) {
    const x = i / (size - 1);
    let seg = 0;
    while (seg < n - 2 && x > xs[seg + 1]) seg++;
    const h = xs[seg + 1] - xs[seg];
    const t = h > 0 ? (x - xs[seg]) / h : 0;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const y = h00 * ys[seg] + h10 * h * tangents[seg] + h01 * ys[seg + 1] + h11 * h * tangents[seg + 1];
    lut.push(Math.min(1, Math.max(0, y)));
  }
  return lut;
}
