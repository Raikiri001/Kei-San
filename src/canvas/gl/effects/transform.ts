import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { TransformEffect } from "@/store/types";

// A genuine affine transform (translate/scale/rotate/skew) applied to a layer's own
// sampling coordinates, independent of the canvas element's own position. The
// fragment shader applies the INVERSE of the forward transform (translate, then
// rotate, then shear, then scale, conceptually, all around the image center) to walk
// from an output pixel back to where it should sample in the source image — undo
// translate, then undo rotation, then undo shear (via the standard 2x2 shear-matrix
// inverse), then undo scale, in that order.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_translatePx;
uniform vec2 u_scale;
uniform float u_rotation;
uniform float u_skewX;
uniform float u_skewY;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 pixelOffset = (v_uv - vec2(0.5)) * u_resolution - u_translatePx;

  float rotRad = radians(-u_rotation);
  float c = cos(rotRad);
  float s = sin(rotRad);
  vec2 rotated = vec2(pixelOffset.x * c - pixelOffset.y * s, pixelOffset.x * s + pixelOffset.y * c);

  float a = tan(radians(u_skewX));
  float b = tan(radians(u_skewY));
  float det = 1.0 - a * b;
  float safeDet = abs(det) < 0.1 ? (det < 0.0 ? -0.1 : 0.1) : det;
  vec2 unskewed = vec2((rotated.x - a * rotated.y) / safeDet, (-b * rotated.x + rotated.y) / safeDet);

  vec2 safeScale = max(u_scale, vec2(0.05));
  vec2 unscaled = unskewed / safeScale;
  vec2 sampledUv = vec2(0.5) + unscaled / u_resolution;
  fragColor = texture(u_texture, sampledUv);
}
`;

export const transformEffect: GLEffectModule<TransformEffect> = {
  type: "transform",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_translatePx: [params.translateX * viewport.w, params.translateY * viewport.h],
      u_scale: [params.scaleX, params.scaleY],
      u_rotation: params.rotation,
      u_skewX: params.skewX,
      u_skewY: params.skewY,
    };
  },
};
