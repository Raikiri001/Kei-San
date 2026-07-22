import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { PerspectiveEffect } from "@/store/types";

// A genuine projective (homography) transform — real Photoshop-style Free Transform
// corner-pinning, not a bilinear "keystone" approximation (which subtly bows lines
// that should stay straight). x(u,v) = (a*u+b*v+c)/(g*u+h*v+1), y likewise.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_a;
uniform float u_b;
uniform float u_c;
uniform float u_d;
uniform float u_e;
uniform float u_f;
uniform float u_g;
uniform float u_h;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  float denom = u_g * v_uv.x + u_h * v_uv.y + 1.0;
  vec2 sampledUv = vec2((u_a * v_uv.x + u_b * v_uv.y + u_c) / denom, (u_d * v_uv.x + u_e * v_uv.y + u_f) / denom);
  fragColor = texture(u_texture, sampledUv);
}
`;

interface HomographyCoefficients {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
}

/** The classic closed-form unit-square-to-quadrilateral homography solve (Heckbert,
 * *Fundamentals of Texture Mapping*, 1989): given 4 destination corners for the unit
 * square's own corners (0,0),(1,0),(1,1),(0,1), find the 8 coefficients of the
 * projective map. Falls back to the plain affine (parallelogram) formula when the
 * quad degenerates to one (`dx3`/`dy3` both ~0) — which is exactly what the untouched
 * default `(0,0),(1,0),(1,1),(0,1)` is, so this fallback is what makes that default a
 * true no-op instead of a 0/0 division. */
function computeHomography(corners: { x: number; y: number }[]): HomographyCoefficients {
  const [p0, p1, p2, p3] = corners;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;

  let g = 0;
  let h = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) > 1e-9) {
      g = (dx3 * dy2 - dx2 * dy3) / det;
      h = (dx1 * dy3 - dx3 * dy1) / det;
    }
  }

  return {
    a: p1.x - p0.x + g * p1.x,
    b: p3.x - p0.x + h * p3.x,
    c: p0.x,
    d: p1.y - p0.y + g * p1.y,
    e: p3.y - p0.y + h * p3.y,
    f: p0.y,
    g,
    h,
  };
}

export const perspectiveEffect: GLEffectModule<PerspectiveEffect> = {
  type: "perspective",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    const coeffs = computeHomography(params.corners);
    return {
      u_a: coeffs.a,
      u_b: coeffs.b,
      u_c: coeffs.c,
      u_d: coeffs.d,
      u_e: coeffs.e,
      u_f: coeffs.f,
      u_g: coeffs.g,
      u_h: coeffs.h,
    };
  },
};
