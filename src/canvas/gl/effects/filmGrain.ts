import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { FilmGrainEffect } from "@/store/types";

// Standalone luminance-dependent grain — the one genuinely new grain technique
// this phase adds: visibility fades in highlights and is strongest in shadows/
// midtones, matching real emulsion response (every existing grain — textureShared,
// vhs.ts, xerox.ts — is flat/brightness-independent, a deliberate contrast here).
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_amount;
uniform float u_size;
in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
  float visibility = 1.0 - smoothstep(0.6, 1.0, lum);

  vec2 grainUv = floor(v_uv * u_resolution / max(u_size, 1.0));
  float n = hash(grainUv);

  vec3 result = s.rgb + (n - 0.5) * u_amount * visibility;
  fragColor = vec4(clamp(result, 0.0, 1.0), s.a);
}
`;

export const filmGrainEffect: GLEffectModule<FilmGrainEffect> = {
  type: "filmGrain",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return { u_resolution: [viewport.w, viewport.h], u_amount: params.amount, u_size: params.size };
  },
};
