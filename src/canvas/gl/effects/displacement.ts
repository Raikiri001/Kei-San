import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { DisplacementEffect } from "@/store/types";

// Film-gate-weave simulation — a genuinely new primitive for this codebase:
// coherent value-noise (bilinear-interpolated hash grid, the standard technique,
// distinct from every other effect's flat white-noise hash) sampled at low spatial
// frequency, producing a smooth large-scale organic warp rather than per-pixel
// jitter. Matches this app's "no animation dimension, one static frame" convention
// (ripple.ts/reededGlass.ts) — one static instant of gate-weave misalignment.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_amount;
uniform float u_scale;
in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 p = v_uv * max(u_scale, 0.001);
  vec2 offset = vec2(valueNoise(p), valueNoise(p + vec2(19.7, 5.3))) - 0.5;
  vec2 sampledUv = v_uv + offset * u_amount / u_resolution;
  fragColor = texture(u_texture, clamp(sampledUv, 0.0, 1.0));
}
`;

export const displacementEffect: GLEffectModule<DisplacementEffect> = {
  type: "displacement",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return { u_resolution: [viewport.w, viewport.h], u_amount: params.amount, u_scale: params.scale };
  },
};
