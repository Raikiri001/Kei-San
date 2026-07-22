/** The real IEC 61966-2-1 sRGB transfer function (encode/decode), not the common
 * `pow(x, 2.2)` shortcut — needed by any effect that must compute in true linear
 * light (Exposure, White Balance) rather than directly on the encoded signal (which
 * is what Levels/Curves/Contrast/Hue-Saturation correctly do instead, matching how
 * Photoshop's own non-raw adjustments work in the document's own gamma-encoded
 * space). `max(c, 0.0)` before each `pow` guards against negative inputs (e.g. after
 * Exposure's `offset` term) producing NaN, since both branches of the branchless
 * `mix` are evaluated unconditionally. */
export const SRGB_GLSL_HELPERS = `
vec3 srgbToLinear(vec3 c) {
  vec3 low = c / 12.92;
  vec3 high = pow(max((c + 0.055) / 1.055, 0.0), vec3(2.4));
  return mix(high, low, step(c, vec3(0.04045)));
}

vec3 linearToSrgb(vec3 c) {
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055;
  return mix(high, low, step(c, vec3(0.0031308)));
}
`;
