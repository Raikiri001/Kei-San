import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { PinchEffect } from "@/store/types";

// Photoshop's Pinch/Punch — a radial power-law warp anchored so the effect radius's
// edge always maps to itself: newNormDist = pow(normDist, bulgePower). bulgePower <
// 1 (positive strength) samples farther from center than the output position,
// dragging outer content inward — a genuine pinch. bulgePower > 1 (negative
// strength) samples closer to center, magnifying the middle — a punch/bulge.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_bulgePower;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 pixelOffset = (v_uv - u_center) * u_resolution;
  float dist = length(pixelOffset);
  vec2 sampledUv = v_uv;
  if (u_radius > 0.0001 && dist < u_radius) {
    float normDist = dist / u_radius;
    float newNormDist = pow(max(normDist, 0.0001), u_bulgePower);
    vec2 dir = dist > 0.0001 ? pixelOffset / dist : vec2(0.0);
    vec2 newOffset = dir * newNormDist * u_radius;
    sampledUv = u_center + newOffset / u_resolution;
  }
  fragColor = texture(u_texture, sampledUv);
}
`;

export const pinchEffect: GLEffectModule<PinchEffect> = {
  type: "pinch",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_center: [params.centerX, params.centerY],
      u_radius: params.radius,
      u_bulgePower: Math.exp(-params.strength / 50),
    };
  },
};
