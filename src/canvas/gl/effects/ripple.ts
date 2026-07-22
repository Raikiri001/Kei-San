import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { RippleEffect } from "@/store/types";

// Concentric-wave displacement from a center point (Photoshop's radial Ripple/Pond
// ripple) — no animation dimension in this app, so this renders one static frame.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_amplitude;
uniform float u_wavelength;
in vec2 v_uv;
out vec4 fragColor;

const float TAU = 6.28318530718;

void main() {
  vec2 pixelOffset = (v_uv - u_center) * u_resolution;
  float dist = length(pixelOffset);
  vec2 sampledUv = v_uv;
  if (u_wavelength > 0.0001) {
    float displacement = u_amplitude * sin(dist / u_wavelength * TAU);
    vec2 dir = dist > 0.0001 ? pixelOffset / dist : vec2(0.0);
    sampledUv = v_uv - dir * displacement / u_resolution;
  }
  fragColor = texture(u_texture, sampledUv);
}
`;

export const rippleEffect: GLEffectModule<RippleEffect> = {
  type: "ripple",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_center: [params.centerX, params.centerY],
      u_amplitude: params.amplitude,
      u_wavelength: params.wavelength,
    };
  },
};
