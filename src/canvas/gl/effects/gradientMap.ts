import { CURVE_LUT_SIZE } from "@/components/EffectsDrawer/curveMath";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { GradientMapEffect } from "@/store/types";

interface ColorStop {
  position: number;
  color: string;
}

function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Builds 3 parallel float LUTs (R/G/B) by linearly interpolating between sorted
 * color stops — the same "flat array + linear-interp sampleCurve" shader pattern
 * curves.ts established, just fed by color stops instead of a drawn tone curve.
 * Shared by Gradient Map (user-editable stops) and Thermal (a fixed curated
 * palette) — both just need "a luminance position" turned into "a gradient color". */
export function buildGradientLUTs(stops: ColorStop[], size = CURVE_LUT_SIZE): { r: Float32Array; g: Float32Array; b: Float32Array } {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const r = new Float32Array(size);
  const g = new Float32Array(size);
  const b = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    let color: [number, number, number] = hexToRgb01(sorted[sorted.length - 1].color);
    if (t <= sorted[0].position) {
      color = hexToRgb01(sorted[0].color);
    } else if (t < sorted[sorted.length - 1].position) {
      for (let j = 0; j < sorted.length - 1; j++) {
        const a = sorted[j];
        const bStop = sorted[j + 1];
        if (t >= a.position && t <= bStop.position) {
          const span = bStop.position - a.position;
          const f = span > 0 ? (t - a.position) / span : 0;
          const [ar, ag, ab] = hexToRgb01(a.color);
          const [br, bg, bb] = hexToRgb01(bStop.color);
          color = [ar + (br - ar) * f, ag + (bg - ag) * f, ab + (bb - ab) * f];
          break;
        }
      }
    }
    r[i] = color[0];
    g[i] = color[1];
    b[i] = color[2];
  }
  return { r, g, b };
}

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_gradientR[${CURVE_LUT_SIZE}];
uniform float u_gradientG[${CURVE_LUT_SIZE}];
uniform float u_gradientB[${CURVE_LUT_SIZE}];
in vec2 v_uv;
out vec4 fragColor;

float sampleGradientChannel(float arr[${CURVE_LUT_SIZE}], float x) {
  float t = clamp(x, 0.0, 1.0) * ${(CURVE_LUT_SIZE - 1).toFixed(1)};
  int i0 = int(floor(t));
  int i1 = i0 + 1 < ${CURVE_LUT_SIZE} ? i0 + 1 : ${CURVE_LUT_SIZE - 1};
  float f = t - float(i0);
  return mix(arr[i0], arr[i1], f);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  float lum = dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 outRgb = vec3(
    sampleGradientChannel(u_gradientR, lum),
    sampleGradientChannel(u_gradientG, lum),
    sampleGradientChannel(u_gradientB, lum)
  );
  fragColor = vec4(outRgb, s.a);
}
`;

export const gradientMapEffect: GLEffectModule<GradientMapEffect> = {
  type: "gradientMap",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    const lut = buildGradientLUTs(params.stops);
    return { u_gradientR: lut.r, u_gradientG: lut.g, u_gradientB: lut.b };
  },
};
