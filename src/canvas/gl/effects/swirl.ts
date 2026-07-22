import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { SwirlEffect } from "@/store/types";

// Classic Photoshop Twirl — pixels rotate around a center by an angle that falls off
// with distance, matching real rotational-fluid distortion. Rotates in true pixel
// space (not raw UV) so it stays isotropic regardless of canvas aspect — same
// aspect-correction technique already used in radialBlur.ts.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_angle;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 pixelOffset = (v_uv - u_center) * u_resolution;
  float dist = length(pixelOffset);
  float rotAngle = 0.0;
  if (u_radius > 0.0001 && dist < u_radius) {
    float t = 1.0 - dist / u_radius;
    rotAngle = radians(u_angle) * t * t;
  }
  float c = cos(rotAngle);
  float s = sin(rotAngle);
  vec2 rotated = vec2(pixelOffset.x * c - pixelOffset.y * s, pixelOffset.x * s + pixelOffset.y * c);
  vec2 sampledUv = u_center + rotated / u_resolution;
  fragColor = texture(u_texture, sampledUv);
}
`;

export const swirlEffect: GLEffectModule<SwirlEffect> = {
  type: "swirl",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_center: [params.centerX, params.centerY],
      u_radius: params.radius,
      u_angle: params.angle,
    };
  },
};
