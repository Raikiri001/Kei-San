import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { MotionBlurEffect } from "@/store/types";

// N-tap accumulation along one direction, single pass — chaining N low-alpha passes
// instead would multiply program-switch/FBO-bind cost per stacked effect, undermining
// the whole point of the GPU pivot (see plan doc's rationale for motion blur/camera
// shake specifically). Tap count is a compile-time constant for portable unrolling.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_angleRad;
uniform float u_distance;
in vec2 v_uv;
out vec4 fragColor;

const int TAPS = 15;

void main() {
  vec2 dir = vec2(cos(u_angleRad), sin(u_angleRad)) / u_resolution;
  vec4 sum = vec4(0.0);
  for (int i = 0; i < TAPS; i++) {
    float t = (float(i) / float(TAPS - 1) - 0.5) * u_distance;
    sum += texture(u_texture, v_uv + dir * t);
  }
  fragColor = sum / float(TAPS);
}
`;

export const motionBlurEffect: GLEffectModule<MotionBlurEffect> = {
  type: "motionBlur",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_angleRad: (params.angle * Math.PI) / 180,
      u_distance: params.distance,
    };
  },
};
