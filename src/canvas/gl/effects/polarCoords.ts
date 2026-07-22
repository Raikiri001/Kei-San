import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { PolarCoordsEffect } from "@/store/types";

// Photoshop's actual "Polar Coordinates" filter, both real modes: Rect->Polar wraps
// a normal photo into a circle (a normalized output angle/radius becomes the input
// sample position); Polar->Rect is the inverse (reinterprets output x/y as
// angle/radius, sampling the input at the corresponding cartesian position).
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_rotation;
uniform int u_mode;
in vec2 v_uv;
out vec4 fragColor;

const float TAU = 6.28318530718;

void main() {
  float maxRadius = min(u_resolution.x, u_resolution.y) * 0.5;
  vec2 sampledUv;
  if (u_mode == 0) {
    vec2 pixelOffset = (v_uv - u_center) * u_resolution;
    float angle = atan(pixelOffset.y, pixelOffset.x) + radians(u_rotation);
    float radius = length(pixelOffset);
    float normAngle = mod(angle, TAU) / TAU;
    float normRadius = clamp(radius / maxRadius, 0.0, 1.0);
    sampledUv = vec2(normAngle, normRadius);
  } else {
    float angle = v_uv.x * TAU - radians(u_rotation);
    float radius = v_uv.y * maxRadius;
    vec2 pixelOffset = vec2(cos(angle), sin(angle)) * radius;
    sampledUv = u_center + pixelOffset / u_resolution;
  }
  fragColor = texture(u_texture, sampledUv);
}
`;

export const polarCoordsEffect: GLEffectModule<PolarCoordsEffect> = {
  type: "polarCoords",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_center: [params.centerX, params.centerY],
      u_rotation: params.rotation,
      u_mode: params.mode === "polarToRect" ? 1 : 0,
    };
  },
};
