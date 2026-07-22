import { buildGradientLUTs } from "@/canvas/gl/effects/gradientMap";
import { CURVE_LUT_SIZE } from "@/components/EffectsDrawer/curveMath";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ThermalEffect } from "@/store/types";

// The real, published "Ironbow" false-color palette used in FLIR thermal cameras —
// black -> deep purple -> magenta -> red -> orange -> yellow -> white. A curated,
// fixed look (not user-editable stops), computed once at module load since the
// palette itself never changes.
const IRONBOW_STOPS = [
  { position: 0.0, color: "#000000" },
  { position: 0.2, color: "#2b0f5e" },
  { position: 0.4, color: "#7a1c74" },
  { position: 0.55, color: "#c8256b" },
  { position: 0.7, color: "#e8482a" },
  { position: 0.85, color: "#f9a520" },
  { position: 0.95, color: "#fef2a0" },
  { position: 1.0, color: "#ffffff" },
];
const IRONBOW_LUT = buildGradientLUTs(IRONBOW_STOPS);

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_blackPoint;
uniform float u_whitePoint;
uniform float u_paletteR[${CURVE_LUT_SIZE}];
uniform float u_paletteG[${CURVE_LUT_SIZE}];
uniform float u_paletteB[${CURVE_LUT_SIZE}];
in vec2 v_uv;
out vec4 fragColor;

float samplePalette(float arr[${CURVE_LUT_SIZE}], float x) {
  float t = clamp(x, 0.0, 1.0) * ${(CURVE_LUT_SIZE - 1).toFixed(1)};
  int i0 = int(floor(t));
  int i1 = i0 + 1 < ${CURVE_LUT_SIZE} ? i0 + 1 : ${CURVE_LUT_SIZE - 1};
  float f = t - float(i0);
  return mix(arr[i0], arr[i1], f);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  float lum = dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
  float t = clamp((lum - u_blackPoint) / max(u_whitePoint - u_blackPoint, 0.001), 0.0, 1.0);
  vec3 outRgb = vec3(samplePalette(u_paletteR, t), samplePalette(u_paletteG, t), samplePalette(u_paletteB, t));
  fragColor = vec4(outRgb, s.a);
}
`;

export const thermalEffect: GLEffectModule<ThermalEffect> = {
  type: "thermal",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return {
      u_blackPoint: params.blackPoint,
      u_whitePoint: params.whitePoint,
      u_paletteR: IRONBOW_LUT.r,
      u_paletteG: IRONBOW_LUT.g,
      u_paletteB: IRONBOW_LUT.b,
    };
  },
};
