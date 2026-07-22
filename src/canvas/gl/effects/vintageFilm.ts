import { PAPER_TEXTURE_GLSL } from "@/canvas/gl/effects/textureShared";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { VintageFilmEffect } from "@/store/types";

// An aged/degraded film stock: the shared PaperTextureParams recipe (heavier grain,
// faded cyan/magenta color-shift, stronger vignette) plus thin vertical scratch
// streaks the shared primitive doesn't have — a sparse subset of columns get a thin
// bright/dark streak, using the same per-column deterministic hash-gate convention
// as glitch.ts's own per-band gate.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_grainAmount;
uniform float u_vignette;
uniform float u_scratchDensity;
uniform float u_scratchIntensity;
in vec2 v_uv;
out vec4 fragColor;

${PAPER_TEXTURE_GLSL}

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec3 result = applyPaperTexture(
    s.rgb, v_uv, u_resolution,
    u_grainAmount, 3.0, u_vignette,
    vec3(0.9, 0.85, 1.05), 0.35,
    0.85, 0.6, 0.05
  );

  float col = floor(v_uv.x * u_resolution.x / 8.0);
  float gate = hash(col * 12.9898);
  float hasScratch = step(1.0 - u_scratchDensity, gate);
  float scratchSign = hash(col * 78.233) > 0.5 ? 1.0 : -1.0;
  result += hasScratch * scratchSign * u_scratchIntensity;

  fragColor = vec4(clamp(result, 0.0, 1.0), s.a);
}
`;

export const vintageFilmEffect: GLEffectModule<VintageFilmEffect> = {
  type: "vintageFilm",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_grainAmount: params.grainAmount,
      u_vignette: params.vignette,
      u_scratchDensity: params.scratchDensity,
      u_scratchIntensity: params.scratchIntensity,
    };
  },
};
