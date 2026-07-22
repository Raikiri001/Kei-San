import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { XeroxEffect } from "@/store/types";

// Greyscale + a steep contrast cutover around u_threshold, plus a fixed per-pixel
// spatial hash (a function of screen position only, not per-frame-random) standing
// in for photocopier scan grain — deterministic between preview and export renders
// at a given resolution, same reasoning as dither.ts's Bayer matrix.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_threshold;
uniform float u_contrast;
in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
  float grain = (hash(gl_FragCoord.xy) - 0.5) * 0.12;
  float halfWidth = 0.5 / max(u_contrast, 0.5);
  float v = smoothstep(u_threshold - halfWidth, u_threshold + halfWidth, lum + grain);
  fragColor = vec4(vec3(v), s.a);
}
`;

export const xeroxEffect: GLEffectModule<XeroxEffect> = {
  type: "xerox",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return { u_threshold: params.threshold, u_contrast: params.contrast };
  },
};
