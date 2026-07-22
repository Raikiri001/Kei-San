import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { LevelsEffect } from "@/store/types";

// The real, documented Photoshop Levels transform (0-255 input/output points + a
// midtone gamma), operating directly on the encoded signal — matching how Photoshop's
// own Levels dialog works (no linear-light conversion here; that's Exposure's job).
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_inputBlack;
uniform float u_inputWhite;
uniform float u_gamma;
uniform float u_outputBlack;
uniform float u_outputWhite;
in vec2 v_uv;
out vec4 fragColor;

vec3 applyLevels(vec3 c) {
  vec3 norm = clamp((c * 255.0 - u_inputBlack) / max(u_inputWhite - u_inputBlack, 1.0), 0.0, 1.0);
  vec3 g = pow(norm, vec3(1.0 / u_gamma));
  return g * (u_outputWhite - u_outputBlack) / 255.0 + u_outputBlack / 255.0;
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  fragColor = vec4(applyLevels(s.rgb), s.a);
}
`;

export const levelsEffect: GLEffectModule<LevelsEffect> = {
  type: "levels",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return {
      u_inputBlack: params.inputBlack,
      u_inputWhite: params.inputWhite,
      u_gamma: params.gamma,
      u_outputBlack: params.outputBlack,
      u_outputWhite: params.outputWhite,
    };
  },
};
