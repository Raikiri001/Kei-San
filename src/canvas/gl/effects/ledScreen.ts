import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { LedScreenEffect } from "@/store/types";

// Sample-at-cell-center per block (same technique as halftone.ts/pixelate.ts), then
// split each cell into 3 vertical R/G/B sub-pixel thirds and dim near the cell's
// own edges — the close-up "LED matrix screen" look.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_cellSize;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 px = v_uv * u_resolution;
  vec2 cellCenterPx = (floor(px / u_cellSize) + 0.5) * u_cellSize;
  vec4 s = texture(u_texture, cellCenterPx / u_resolution);

  vec2 local = mod(px, u_cellSize) / u_cellSize;
  float subIndex = floor(local.x * 3.0);
  vec3 subMask = subIndex < 0.5 ? vec3(1.0, 0.0, 0.0) : (subIndex < 1.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));

  float edgeDist = min(min(local.x, 1.0 - local.x), min(local.y, 1.0 - local.y));
  float gap = smoothstep(0.0, 0.08, edgeDist);

  fragColor = vec4(s.rgb * subMask * gap, s.a);
}
`;

export const ledScreenEffect: GLEffectModule<LedScreenEffect> = {
  type: "ledScreen",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return { u_resolution: [viewport.w, viewport.h], u_cellSize: params.cellSize };
  },
};
