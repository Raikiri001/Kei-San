import { SRGB_GLSL_HELPERS } from "@/canvas/gl/srgbHelpers";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ExposureEffect } from "@/store/types";

// Photoshop's actual 3-control Exposure dialog (Exposure/Offset/Gamma Correction),
// computed in true linear light — the documented reason Exposure reads as
// photographic stops of light where a naive "multiply the encoded pixel" version
// would visibly wash out midtones wrong. Every other color-grading effect in this
// app (Levels, Curves, Contrast, Hue/Saturation) deliberately operates on the encoded
// signal instead, matching how Photoshop's own non-Exposure adjustments work.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_exposure;
uniform float u_offset;
uniform float u_gammaCorrection;
in vec2 v_uv;
out vec4 fragColor;

${SRGB_GLSL_HELPERS}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec3 linear = srgbToLinear(s.rgb);
  linear = max(linear * pow(2.0, u_exposure) + u_offset, 0.0);
  linear = pow(linear, vec3(1.0 / u_gammaCorrection));
  fragColor = vec4(linearToSrgb(linear), s.a);
}
`;

export const exposureEffect: GLEffectModule<ExposureEffect> = {
  type: "exposure",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return { u_exposure: params.exposure, u_offset: params.offset, u_gammaCorrection: params.gammaCorrection };
  },
};
