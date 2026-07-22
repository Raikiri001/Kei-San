import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { DitherEffect } from "@/store/types";

// Ordered (Bayer 4x4) dithering — a fixed threshold matrix indexed by screen position
// (not per-frame-random), so it's automatically identical between the live preview
// and export renders at a given resolution with no seeded-PRNG needed.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_levels;
in vec2 v_uv;
out vec4 fragColor;

const float BAYER[16] = float[](
   0.0,  8.0,  2.0, 10.0,
  12.0,  4.0, 14.0,  6.0,
   3.0, 11.0,  1.0,  9.0,
  15.0,  7.0, 13.0,  5.0
);

void main() {
  vec4 s = texture(u_texture, v_uv);
  ivec2 p = ivec2(gl_FragCoord.xy) % 4;
  float threshold = (BAYER[p.y * 4 + p.x] + 0.5) / 16.0 - 0.5;
  vec3 c = clamp(s.rgb + threshold / u_levels, 0.0, 1.0);
  c = floor(c * u_levels) / max(1.0, u_levels - 1.0);
  fragColor = vec4(clamp(c, 0.0, 1.0), s.a);
}
`;

export const ditherEffect: GLEffectModule<DitherEffect> = {
  type: "dither",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return { u_levels: params.levels };
  },
};
