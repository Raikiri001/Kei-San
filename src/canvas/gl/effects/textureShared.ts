/**
 * Shared GLSL function embedded into each of the six "paper/texture" effects
 * (Grunge, Vintage Print, Mixed Media, Thin Paper, Wet Paper, Teleshopping) — one
 * grain + vignette + contrast/saturation/brightness + color-wash recipe, so those six
 * effects are mostly just different fixed-constant "presets" over the same
 * primitive rather than six independent reimplementations. Grain is a fixed spatial
 * hash (not per-frame-random), same determinism reasoning as every other noise-using
 * effect in this app (dither.ts, xerox.ts, glitch.ts).
 */
export const PAPER_TEXTURE_GLSL = `
vec3 applyPaperTexture(
  vec3 color,
  vec2 uv,
  vec2 resolution,
  float grainAmount,
  float grainScale,
  float vignetteAmount,
  vec3 tint,
  float tintStrength,
  float contrast,
  float saturation,
  float brightness
) {
  vec2 grainUv = floor(uv * resolution / max(grainScale, 1.0));
  float n = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453);
  color += (n - 0.5) * grainAmount;

  vec2 centered = uv - 0.5;
  float dist = length(centered) * 1.4142135;
  float vig = 1.0 - vignetteAmount * smoothstep(0.3, 1.0, dist);
  color *= vig;

  color = (color - 0.5) * contrast + 0.5;

  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(lum), color, saturation);

  color += brightness;
  color = mix(color, color * tint, tintStrength);

  return clamp(color, 0.0, 1.0);
}
`;
