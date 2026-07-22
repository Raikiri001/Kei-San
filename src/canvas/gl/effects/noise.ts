import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { NoiseEffect } from "@/store/types";

// Standalone per-pixel sensor/signal noise — flat and colored-or-mono, distinct
// from Film Grain's luminance-dependent organic character. Reuses the same spatial
// hash formula as xerox.ts/vhs.ts, sampled independently per channel when colored.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_amount;
uniform bool u_colored;
in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec2 px = gl_FragCoord.xy;
  if (u_colored) {
    vec3 n = vec3(hash(px), hash(px + vec2(37.0, 17.0)), hash(px + vec2(71.0, 53.0)));
    fragColor = vec4(clamp(s.rgb + (n - 0.5) * u_amount, 0.0, 1.0), s.a);
  } else {
    float n = hash(px);
    fragColor = vec4(clamp(s.rgb + (n - 0.5) * u_amount, 0.0, 1.0), s.a);
  }
}
`;

export const noiseEffect: GLEffectModule<NoiseEffect> = {
  type: "noise",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return { u_amount: params.amount, u_colored: params.colored ? 1 : 0 };
  },
};
