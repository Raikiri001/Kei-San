import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { InkBleedEffect } from "@/store/types";

// Real edge-aware feathering — ink diffusing into paper fibers at high-contrast
// boundaries, staying sharp elsewhere — distinct from a plain uniform blur. A
// directional-derivative edge magnitude (same two-tap technique emboss.ts already
// uses, combined both axes) gates a blend between the sharp sample and a cheap
// small blur sample (same 5x5-tap single-pass technique bloom.ts's own middle-pass
// blur uses — bleed doesn't need arbitrary-radius correctness). The derivative
// samples a few pixels apart (not 1 texel) — a real photo's natural texture/noise
// already produces a non-trivial single-texel derivative almost everywhere, which
// would swamp a 1-texel edge measurement; sampling a few pixels apart instead
// reflects genuine structural contrast, giving a threshold that actually separates
// real edges from flat-but-textured regions. `amount` sets the blur radius
// directly, so amount: 0 is a true no-op structurally (blurred == sharp),
// regardless of how much edge the image has.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_amount;
uniform float u_softness;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec4 sharp = texture(u_texture, v_uv);

  vec2 d = texel * 3.0;
  vec3 gx = texture(u_texture, v_uv + vec2(d.x, 0.0)).rgb - texture(u_texture, v_uv - vec2(d.x, 0.0)).rgb;
  vec3 gy = texture(u_texture, v_uv + vec2(0.0, d.y)).rgb - texture(u_texture, v_uv - vec2(0.0, d.y)).rgb;
  float edge = length(gx) + length(gy);
  float bleedAmount = smoothstep(u_threshold, u_threshold + max(u_softness, 0.001), edge);

  vec4 sum = vec4(0.0);
  float totalWeight = 0.0;
  for (int i = -2; i <= 2; i++) {
    for (int j = -2; j <= 2; j++) {
      vec2 offset = vec2(float(i), float(j)) * (u_amount * 0.5) * texel;
      float weight = exp(-float(i * i + j * j) / 8.0);
      sum += texture(u_texture, v_uv + offset) * weight;
      totalWeight += weight;
    }
  }
  vec4 blurred = sum / totalWeight;

  fragColor = vec4(mix(sharp.rgb, blurred.rgb, bleedAmount), sharp.a);
}
`;

export const inkBleedEffect: GLEffectModule<InkBleedEffect> = {
  type: "inkBleed",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_threshold: params.threshold,
      u_amount: params.amount,
      u_softness: params.softness,
    };
  },
};
