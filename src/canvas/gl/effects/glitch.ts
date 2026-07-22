import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { GlitchEffect } from "@/store/types";

// Datamosh-style band displacement: the image is divided into `u_bandCount` horizontal
// bands (their boundaries perturbed by `u_bandJitter`, so bands read as torn/uneven
// rather than a mechanically even grid), and a deterministic hash of each band's index
// (not per-frame-random) decides both whether that band glitches at all (`u_density`
// controls what fraction do — was a fixed ~40% baked into the hash gate, now a real
// control) and how far it shifts — deterministic between the live preview and export
// renders, same reasoning as dither.ts's Bayer matrix and xerox.ts's grain hash.
// `u_seed` folds into every hash call, so the whole pattern is user-reproducible
// instead of the fixed, unexposed hash this effect used to be stuck with.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_bandCount;
uniform float u_intensity;
uniform float u_colorShift;
uniform float u_density;
uniform float u_bandJitter;
uniform float u_seed;
in vec2 v_uv;
out vec4 fragColor;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  float rawBand = v_uv.y * u_bandCount;
  // Perturbing the value BEFORE quantizing shifts each band's own boundary locally
  // (by up to half a band-width) without touching how any band's own content shifts —
  // a cheap domain-warp that reads as torn/uneven bands instead of computing genuinely
  // irregular band geometry.
  float boundaryJitter = (hash(floor(rawBand) * 45.164 + u_seed) - 0.5) * u_bandJitter;
  float band = floor(rawBand + boundaryJitter);

  // "active" is a reserved word in GLSL ES 3.00 — this is that same 0/1 gate.
  float bandActive = step(1.0 - u_density, hash(band * 78.233 + u_seed));
  float offset = (hash(band * 12.9898 + u_seed) - 0.5) * 2.0 * (u_intensity / u_resolution.x) * bandActive;
  float shift = (u_colorShift / u_resolution.x) * bandActive;

  vec2 uv = vec2(v_uv.x + offset, v_uv.y);
  float r = texture(u_texture, uv + vec2(shift, 0.0)).r;
  vec2 centerSample = texture(u_texture, uv).ga;
  float b = texture(u_texture, uv - vec2(shift, 0.0)).b;
  fragColor = vec4(r, centerSample.x, b, centerSample.y);
}
`;

export const glitchEffect: GLEffectModule<GlitchEffect> = {
  type: "glitch",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_bandCount: params.bandCount,
      u_intensity: params.intensity,
      u_colorShift: params.colorShift,
      u_density: params.density,
      u_bandJitter: params.bandJitter,
      u_seed: params.seed,
    };
  },
};
