import { HSL_GLSL_HELPERS } from "@/canvas/gl/hslHelpers";
import { curveToLUT, CURVE_LUT_SIZE } from "@/components/EffectsDrawer/curveMath";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { HueCurvesEffect } from "@/store/types";

// Lightroom/Camera Raw's real underlying mechanism for its HSL color-mixer panel —
// three curves indexed by the pixel's OWN hue rather than by tone, reusing
// CurveField/curveToLUT exactly as-is with the stored 0-1 y-axis reinterpreted here
// as a signed shift (-1..1) or a 0-2x multiplier. All three curves sample the
// pixel's *original* hue before any of the three are applied.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_hueToHue[${CURVE_LUT_SIZE}];
uniform float u_hueToSaturation[${CURVE_LUT_SIZE}];
uniform float u_hueToLightness[${CURVE_LUT_SIZE}];
in vec2 v_uv;
out vec4 fragColor;

${HSL_GLSL_HELPERS}

float sampleCurve(float arr[${CURVE_LUT_SIZE}], float x) {
  float t = clamp(x, 0.0, 1.0) * ${(CURVE_LUT_SIZE - 1).toFixed(1)};
  int i0 = int(floor(t));
  int i1 = i0 + 1 < ${CURVE_LUT_SIZE} ? i0 + 1 : ${CURVE_LUT_SIZE - 1};
  float f = t - float(i0);
  return mix(arr[i0], arr[i1], f);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec3 hsl = rgbToHsl(s.rgb);
  float originalHue = hsl.x;
  float hueShift = (sampleCurve(u_hueToHue, originalHue) - 0.5) * 2.0;
  float satMult = sampleCurve(u_hueToSaturation, originalHue) * 2.0;
  float lightMult = sampleCurve(u_hueToLightness, originalHue) * 2.0;
  hsl.x = mod(hsl.x + hueShift, 1.0);
  hsl.y = clamp(hsl.y * satMult, 0.0, 1.0);
  hsl.z = clamp(hsl.z * lightMult, 0.0, 1.0);
  fragColor = vec4(hslToRgb(hsl), s.a);
}
`;

export const hueCurvesEffect: GLEffectModule<HueCurvesEffect> = {
  type: "hueCurves",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return {
      u_hueToHue: new Float32Array(curveToLUT(params.hueToHue, CURVE_LUT_SIZE)),
      u_hueToSaturation: new Float32Array(curveToLUT(params.hueToSaturation, CURVE_LUT_SIZE)),
      u_hueToLightness: new Float32Array(curveToLUT(params.hueToLightness, CURVE_LUT_SIZE)),
    };
  },
};
