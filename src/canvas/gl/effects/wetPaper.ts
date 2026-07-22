import { PAPER_TEXTURE_GLSL } from "@/canvas/gl/effects/textureShared";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { WetPaperEffect } from "@/store/types";

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
    u_grainAmount, 4.0, u_vignette,
    vec3(0.6, 0.65, 0.7), 0.5,
    1.2, 0.6, -0.2
  );
  fragColor = vec4(result, s.a);
}
`;

export const wetPaperEffect: GLEffectModule<WetPaperEffect> = {
  type: "wetPaper",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return { u_resolution: [viewport.w, viewport.h], u_grainAmount: params.grainAmount, u_vignette: params.vignette };
  },
};
