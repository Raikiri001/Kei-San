import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { CameraShakeEffect } from "@/store/types";

// N-tap accumulation at a FIXED (not per-frame-random) set of jitter offsets, scaled
// by `u_intensity` — a genuinely random jitter would need a seeded PRNG to stay
// identical between the live preview and export renders (this app's hard dual-
// renderer-parity requirement), which a plain fragment shader has no clean way to
// carry; a fixed Poisson-disk-like spiral (golden-angle distributed, precomputed
// once in JS and hardcoded here) gives the same "blurred handheld jitter" look
// deterministically, with no shared-state problem at all.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
in vec2 v_uv;
out vec4 fragColor;

const int TAPS = 12;
const vec2 JITTER[TAPS] = vec2[](
  vec2(0.20412, 0.00000),
  vec2(-0.26070, 0.23882),
  vec2(0.03990, -0.45469),
  vec2(0.32859, 0.42859),
  vec2(-0.60301, -0.10666),
  vec2(0.57123, -0.36337),
  vec2(-0.19106, 0.71075),
  vec2(-0.36438, -0.70159),
  vec2(0.79056, 0.28871),
  vec2(-0.82244, 0.33949),
  vec2(0.39647, -0.84724),
  vec2(0.29298, 0.93407)
);

void main() {
  vec2 texel = u_intensity / u_resolution;
  vec4 sum = vec4(0.0);
  for (int i = 0; i < TAPS; i++) {
    sum += texture(u_texture, v_uv + JITTER[i] * texel);
  }
  fragColor = sum / float(TAPS);
}
`;

export const cameraShakeEffect: GLEffectModule<CameraShakeEffect> = {
  type: "cameraShake",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return { u_resolution: [viewport.w, viewport.h], u_intensity: params.intensity };
  },
};
