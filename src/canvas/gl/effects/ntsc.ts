import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { NtscEffect } from "@/store/types";

// A short horizontal N-tap smear (simulating limited analog chroma bandwidth) plus
// alternating-row darkening (simulating interlaced-field flicker).
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_colorBleed;
uniform float u_interlace;
in vec2 v_uv;
out vec4 fragColor;

const int TAPS = 5;

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec3 sum = vec3(0.0);
  for (int i = 0; i < TAPS; i++) {
    float t = (float(i) / float(TAPS - 1) - 0.5) * u_colorBleed;
    sum += texture(u_texture, v_uv + vec2(t * texel.x, 0.0)).rgb;
  }
  vec3 smeared = sum / float(TAPS);
  float a = texture(u_texture, v_uv).a;

  float row = floor(gl_FragCoord.y);
  float interlaceFactor = mod(row, 2.0) < 1.0 ? 1.0 : (1.0 - u_interlace * 0.5);

  fragColor = vec4(smeared * interlaceFactor, a);
}
`;

export const ntscEffect: GLEffectModule<NtscEffect> = {
  type: "ntsc",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return { u_resolution: [viewport.w, viewport.h], u_colorBleed: params.colorBleed, u_interlace: params.interlace };
  },
};
