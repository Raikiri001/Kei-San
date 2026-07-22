import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { VhsEffect } from "@/store/types";

// Chromatic-aberration color bleed (same 3-tap technique as rgbShift.ts) + horizontal
// scanline darkening + a fixed per-pixel spatial-hash grain (deterministic, same
// reasoning as xerox.ts's grain).
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_scanlineIntensity;
uniform float u_colorBleed;
uniform float u_noise;
in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 bleed = vec2(u_colorBleed / u_resolution.x, 0.0);
  float r = texture(u_texture, v_uv + bleed).r;
  vec2 centerSample = texture(u_texture, v_uv).ga;
  float b = texture(u_texture, v_uv - bleed).b;

  float scanline = sin(v_uv.y * u_resolution.y * 3.14159265) * 0.5 + 0.5;
  float scanFactor = mix(1.0, scanline, u_scanlineIntensity);
  float grain = (hash(gl_FragCoord.xy) - 0.5) * u_noise;

  vec3 color = clamp(vec3(r, centerSample.x, b) * scanFactor + grain, 0.0, 1.0);
  fragColor = vec4(color, centerSample.y);
}
`;

export const vhsEffect: GLEffectModule<VhsEffect> = {
  type: "vhs",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_scanlineIntensity: params.scanlineIntensity,
      u_colorBleed: params.colorBleed,
      u_noise: params.noise,
    };
  },
};
