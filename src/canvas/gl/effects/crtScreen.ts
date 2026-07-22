import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { CrtScreenEffect } from "@/store/types";

// Real CRT display simulation (the physical screen's own optics, not tape/broadcast
// artifacts — that's vhs.ts/ntsc.ts's job): standard barrel-distortion formula for
// the curved glass, ledScreen.ts's own cell-center 3-way vertical RGB sub-mask
// technique for the phosphor/aperture-grille mask (mixed in by intensity rather than
// ledScreen's all-or-nothing masking), vhs.ts's own scanline sine, and a vignette
// tied to the same curvature (a more curved tube also vignettes more at its edges).
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_curvature;
uniform float u_cellSize;
uniform float u_phosphorIntensity;
uniform float u_scanlineIntensity;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 centered = v_uv - 0.5;
  float r2 = dot(centered, centered);
  vec2 distortedUv = 0.5 + centered * (1.0 + u_curvature * r2);
  vec4 s = texture(u_texture, clamp(distortedUv, 0.0, 1.0));

  vec2 outPx = v_uv * u_resolution;
  float local = mod(outPx.x, u_cellSize) / u_cellSize;
  float subIndex = floor(local * 3.0);
  vec3 subMask = subIndex < 0.5 ? vec3(1.0, 0.0, 0.0) : (subIndex < 1.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
  vec3 color = mix(s.rgb, s.rgb * subMask, u_phosphorIntensity);

  float scanline = sin(outPx.y * 3.14159265) * 0.5 + 0.5;
  color *= mix(1.0, scanline, u_scanlineIntensity);

  float dist = length(centered) * 1.4142135;
  float vig = 1.0 - u_curvature * 0.5 * smoothstep(0.3, 1.0, dist);
  color *= vig;

  fragColor = vec4(clamp(color, 0.0, 1.0), s.a);
}
`;

export const crtScreenEffect: GLEffectModule<CrtScreenEffect> = {
  type: "crtScreen",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_curvature: params.curvature,
      u_cellSize: params.cellSize,
      u_phosphorIntensity: params.phosphorIntensity,
      u_scanlineIntensity: params.scanlineIntensity,
    };
  },
};
