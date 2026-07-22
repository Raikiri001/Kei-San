/** An exact RGB<->HSL round-trip (the standard textbook conversion) — not the "cheap"
 * hue-rotation-matrix shortcut, which is only a linear approximation of hue rotation
 * and visibly distorts saturation/perceived lightness away from the true hue circle.
 * Shared by Hue/Saturation and Hue Curves — both need the identical exact conversion,
 * and duplicating this (non-trivial, easy-to-subtly-break) code a second time is a
 * real correctness risk, unlike the small blur kernel this codebase tolerates
 * duplicating per-effect. */
export const HSL_GLSL_HELPERS = `
vec3 rgbToHsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float l = (maxC + minC) * 0.5;
  float d = maxC - minC;
  float h = 0.0;
  float s = 0.0;
  if (d > 1e-5) {
    s = l < 0.5 ? d / (maxC + minC) : d / (2.0 - maxC - minC);
    if (maxC == c.r) {
      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    } else if (maxC == c.g) {
      h = (c.b - c.r) / d + 2.0;
    } else {
      h = (c.r - c.g) / d + 4.0;
    }
    h /= 6.0;
  }
  return vec3(h, s, l);
}

float hueToRgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0 / 2.0) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}

vec3 hslToRgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  if (s < 1e-5) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(hueToRgb(p, q, h + 1.0 / 3.0), hueToRgb(p, q, h), hueToRgb(p, q, h - 1.0 / 3.0));
}
`;
