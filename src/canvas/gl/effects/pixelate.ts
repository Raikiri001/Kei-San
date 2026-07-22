import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { PixelateEffect } from "@/store/types";

// Sample-at-cell-center pixelation (same technique as halftone.ts's cell sampling,
// applied here to produce solid blocks instead of dots) plus an optional quantized
// green-tinted "LCD" recolor, Nokia-3310-style.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_pixelSize;
uniform int u_monochrome;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 px = v_uv * u_resolution;
  vec2 cellCenterPx = (floor(px / u_pixelSize) + 0.5) * u_pixelSize;
  vec4 s = texture(u_texture, cellCenterPx / u_resolution);
  if (u_monochrome == 1) {
    float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
    float level = floor(lum * 4.0) / 3.0;
    fragColor = vec4(level * 0.2, level * 0.85 + 0.15, level * 0.3, s.a);
  } else {
    fragColor = s;
  }
}
`;

export const pixelateEffect: GLEffectModule<PixelateEffect> = {
  type: "pixelate",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_pixelSize: params.pixelSize,
      u_monochrome: params.monochrome ? 1 : 0,
    };
  },
};
