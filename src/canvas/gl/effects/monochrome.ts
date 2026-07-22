import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { MonochromeEffect } from "@/store/types";

function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Photoshop's Black & White adjustment's actual mechanism — per-channel weighted
// contribution (not a fixed grayscale formula), so a red/yellow/green-filter-style
// darkroom B&W look is possible, plus an optional tint. Weights are deliberately not
// renormalized to sum to 100 — matching genuine Photoshop behavior, where the total
// brightening/darkening from an off-100 sum is expected, real behavior.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec3 u_weights;
uniform vec3 u_tint;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 s = texture(u_texture, v_uv);
  float gray = clamp(dot(s.rgb, u_weights), 0.0, 1.0);
  fragColor = vec4(gray * u_tint, s.a);
}
`;

export const monochromeEffect: GLEffectModule<MonochromeEffect> = {
  type: "monochrome",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return {
      u_weights: [params.redWeight / 100, params.greenWeight / 100, params.blueWeight / 100],
      u_tint: hexToRgb01(params.tint),
    };
  },
};
