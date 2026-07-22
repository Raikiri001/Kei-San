import { PAPER_TEXTURE_GLSL } from "@/canvas/gl/effects/textureShared";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { MixedMediaEffect } from "@/store/types";

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_grainAmount;
uniform float u_vignette;
in vec2 v_uv;
out vec4 fragColor;

${PAPER_TEXTURE_GLSL}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec3 result = applyPaperTexture(
    s.rgb, v_uv, u_resolution,
    u_grainAmount, 2.5, u_vignette,
    vec3(0.95, 0.92, 0.85), 0.2,
    1.05, 0.9, 0.0
  );
  fragColor = vec4(result, s.a);
}
`;

export const mixedMediaEffect: GLEffectModule<MixedMediaEffect> = {
  type: "mixedMedia",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return { u_resolution: [viewport.w, viewport.h], u_grainAmount: params.grainAmount, u_vignette: params.vignette };
  },
};
