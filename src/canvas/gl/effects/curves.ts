import { curveToLUT, CURVE_LUT_SIZE } from "@/components/EffectsDrawer/curveMath";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { CurvesEffect } from "@/store/types";

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_curveMaster[${CURVE_LUT_SIZE}];
uniform float u_curveR[${CURVE_LUT_SIZE}];
uniform float u_curveG[${CURVE_LUT_SIZE}];
uniform float u_curveB[${CURVE_LUT_SIZE}];
in vec2 v_uv;
out vec4 fragColor;

float sampleCurve(float arr[${CURVE_LUT_SIZE}], float x) {
  float t = clamp(x, 0.0, 1.0) * ${(CURVE_LUT_SIZE - 1).toFixed(1)};
  int i0 = int(floor(t));
  int i1 = i0 + 1 < ${CURVE_LUT_SIZE} ? i0 + 1 : ${CURVE_LUT_SIZE - 1};
  float f = t - float(i0);
  return mix(arr[i0], arr[i1], f);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  float r = sampleCurve(u_curveR, sampleCurve(u_curveMaster, s.r));
  float g = sampleCurve(u_curveG, sampleCurve(u_curveMaster, s.g));
  float b = sampleCurve(u_curveB, sampleCurve(u_curveMaster, s.b));
  fragColor = vec4(r, g, b, s.a);
}
`;

/** Classic tone-curve grading — a master curve applies to every channel first, then
 * each channel's own curve applies on top, matching Photoshop/Lightroom's own Curves
 * panel. Each of the 4 curves is sampled as its own 32-entry LUT (see
 * curveMath.ts) uploaded as a shader array uniform; see shaderProgram.ts's
 * name-normalization fix for why `u_curveMaster[0]`-vs-`u_curveMaster` driver
 * naming is handled there. */
export const curvesEffect: GLEffectModule<CurvesEffect> = {
  type: "curves",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return {
      u_curveMaster: new Float32Array(curveToLUT(params.master, CURVE_LUT_SIZE)),
      u_curveR: new Float32Array(curveToLUT(params.red, CURVE_LUT_SIZE)),
      u_curveG: new Float32Array(curveToLUT(params.green, CURVE_LUT_SIZE)),
      u_curveB: new Float32Array(curveToLUT(params.blue, CURVE_LUT_SIZE)),
    };
  },
};
