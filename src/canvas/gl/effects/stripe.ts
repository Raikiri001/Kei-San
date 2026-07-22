import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { StripeEffect } from "@/store/types";

// Real inkjet/thermal print-head banding — each print pass leaves a slightly
// different ink density, producing repeating horizontal bands whose intensity
// varies irregularly pass-to-pass (a perfectly uniform sine would look too clean).
// A per-band deterministic hash (same convention as glitch.ts's own per-band gate)
// modulates the banding density.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_bandWidth;
uniform float u_intensity;
uniform float u_irregularity;
in vec2 v_uv;
out vec4 fragColor;

const float TAU = 6.28318530718;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  float py = v_uv.y * u_resolution.y;
  float band = floor(py / u_bandWidth);
  float bandDensity = mix(1.0, hash(band * 12.9898), u_irregularity);
  float wave = 0.5 + 0.5 * sin(py / u_bandWidth * TAU);
  float factor = 1.0 - u_intensity * bandDensity * wave;
  fragColor = vec4(s.rgb * factor, s.a);
}
`;

export const stripeEffect: GLEffectModule<StripeEffect> = {
  type: "stripe",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_bandWidth: params.bandWidth,
      u_intensity: params.intensity,
      u_irregularity: params.irregularity,
    };
  },
};
