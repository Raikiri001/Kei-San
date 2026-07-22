import { SRGB_GLSL_HELPERS } from "@/canvas/gl/srgbHelpers";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { RgbGainEffect } from "@/store/types";

// Broadcast/camera-style per-channel gain — the same "proper vs cheap" distinction as
// Exposure: gain is a physical light-scaling control, so it's applied in true linear
// light, not multiplied directly on the encoded signal.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec3 u_gain;
in vec2 v_uv;
out vec4 fragColor;

${SRGB_GLSL_HELPERS}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec3 linear = srgbToLinear(s.rgb) * u_gain;
  fragColor = vec4(linearToSrgb(max(linear, 0.0)), s.a);
}
`;

export const rgbGainEffect: GLEffectModule<RgbGainEffect> = {
  type: "rgbGain",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return { u_gain: [params.gainR, params.gainG, params.gainB] };
  },
};
