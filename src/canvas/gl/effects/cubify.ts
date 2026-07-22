import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { CubifyEffect } from "@/store/types";

// Photoshop Crystallize's actual algorithm — jittered-grid Voronoi via the standard
// real-time 3x3-neighbor-cell search, single-tap-per-cell sampling (matching
// halftone.ts/pixelate.ts's own single-tap-at-representative-point convention rather
// than a multi-pass per-cell average).
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_cellSize;
uniform float u_jitter;
in vec2 v_uv;
out vec4 fragColor;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  vec2 px = v_uv * u_resolution;
  vec2 cellSize = vec2(max(u_cellSize, 1.0));
  vec2 baseCell = floor(px / cellSize);

  float minDist = 1e9;
  vec2 nearestCenterPx = (baseCell + 0.5) * cellSize;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = baseCell + vec2(float(x), float(y));
      vec2 jitterOffset = (hash2(neighbor) - 0.5) * u_jitter;
      vec2 centerPx = (neighbor + 0.5 + jitterOffset) * cellSize;
      float d = distance(px, centerPx);
      if (d < minDist) {
        minDist = d;
        nearestCenterPx = centerPx;
      }
    }
  }

  fragColor = texture(u_texture, nearestCenterPx / u_resolution);
}
`;

export const cubifyEffect: GLEffectModule<CubifyEffect> = {
  type: "cubify",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_cellSize: params.cellSize,
      u_jitter: params.jitter,
    };
  },
};
