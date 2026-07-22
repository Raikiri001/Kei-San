import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { VignetteEffect } from "@/store/types";

// Classic photographic edge-darkening/lightening. The CircleRegionEditor ellipse
// (center/radiusX/radiusY/rotation) is the "unaffected" inner boundary, so its own
// radiusX/radiusY ratio doubles as the classic vignette "Roundness" control for free.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform vec2 u_axisX;
uniform vec2 u_axisY;
uniform float u_radiusX;
uniform float u_radiusY;
uniform float u_feather;
uniform float u_amount;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 s = texture(u_texture, v_uv);
  float minDim = min(u_resolution.x, u_resolution.y);
  vec2 pixelOffset = (v_uv - u_center) * u_resolution;
  vec2 local = vec2(dot(pixelOffset, u_axisX) / max(u_radiusX * minDim, 0.0001), dot(pixelOffset, u_axisY) / max(u_radiusY * minDim, 0.0001));
  float dist = length(local);
  float t = smoothstep(1.0, 1.0 + max(u_feather, 0.0001), dist);
  vec3 target = u_amount < 0.0 ? vec3(0.0) : vec3(1.0);
  vec3 result = mix(s.rgb, target, t * abs(u_amount));
  fragColor = vec4(result, s.a);
}
`;

export const vignetteEffect: GLEffectModule<VignetteEffect> = {
  type: "vignette",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    const rotRad = (params.rotation * Math.PI) / 180;
    return {
      u_resolution: [viewport.w, viewport.h],
      u_center: [params.centerX, params.centerY],
      u_axisX: [Math.cos(rotRad), Math.sin(rotRad)],
      u_axisY: [Math.cos(rotRad + Math.PI / 2), Math.sin(rotRad + Math.PI / 2)],
      u_radiusX: params.radiusX,
      u_radiusY: params.radiusY,
      u_feather: params.feather,
      u_amount: params.amount,
    };
  },
};
