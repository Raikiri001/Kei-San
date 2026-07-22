import { SRGB_GLSL_HELPERS } from "@/canvas/gl/srgbHelpers";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { WhiteBalanceEffect } from "@/store/types";

type Mat3 = [[number, number, number], [number, number, number], [number, number, number]];
type Vec3 = [number, number, number];

// Standard sRGB (D65) <-> CIE XYZ matrices (IEC 61966-2-1) and the Bradford
// chromatic-adaptation matrix (von Kries-style cone-response transform) — the same
// constants any real color-managed pipeline uses, row-major.
const RGB_TO_XYZ: Mat3 = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
];
const XYZ_TO_RGB: Mat3 = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.969266, 1.8760108, 0.041556],
  [0.0556434, -0.2040259, 1.0572252],
];
const BRADFORD: Mat3 = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296],
];
const BRADFORD_INV: Mat3 = [
  [0.9869929, -0.1470543, 0.1599627],
  [0.4323053, 0.5183603, 0.0492912],
  [-0.0085287, 0.0400428, 0.9684867],
];

// Perpendicular (green-magenta) shift applied to the Planckian locus's v coordinate —
// the actual reason Adobe-style tint sliders are labeled green/magenta (v increases
// toward green, decreases toward magenta in the CIE 1960 uv diagram). Scaled so the
// full -100..100 tint range stays a visually reasonable cast.
const TINT_TO_V_SCALE = 0.05;

const NEUTRAL_TEMPERATURE = 6500;

/** Kelvin -> CIE xy chromaticity via Krystek's (1985) closed-form Planckian-locus
 * approximation in CIE 1960 (u,v) space (valid ~1000-15000K, the standard published
 * fit used across color-science references) — the real physically-grounded curve for
 * "color temperature", not the CIE daylight-locus formula (a related but distinct
 * curve for standardizing D-illuminants) and not a "push R/B" approximation. */
function kelvinToXy(kelvinRaw: number, tint: number): [number, number] {
  const t = Math.min(Math.max(kelvinRaw, 1000), 15000);
  const u = (0.860117757 + 1.54118254e-4 * t + 1.28641212e-7 * t * t) / (1 + 8.42420235e-4 * t + 7.08145163e-7 * t * t);
  let v = (0.317398726 + 4.22806245e-5 * t + 4.20481691e-8 * t * t) / (1 - 2.89741816e-5 * t + 1.61456053e-7 * t * t);
  v += (tint / 100) * TINT_TO_V_SCALE;
  const denom = 2 * u - 8 * v + 4;
  return [(3 * u) / denom, (2 * v) / denom];
}

function xyToXYZ(x: number, y: number): Vec3 {
  return [x / y, 1, (1 - x - y) / y];
}

function matVec3(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

function matMul3(a: Mat3, b: Mat3): Mat3 {
  const result: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    }
  }
  return result as Mat3;
}

/** Composes sRGB(linear)->XYZ->LMS->scale-by-gain->LMS->XYZ->sRGB(linear) into one 3x3
 * matrix in TypeScript (cheap — only ever recomputed when temperature/tint change),
 * so the shader itself just does one matrix multiply in linear light. `gain` is the
 * von Kries per-LMS-channel scale (target white's LMS over the reference white's), the
 * actual chromatic-adaptation step: at `temperature: 6500, tint: 0` (this effect's
 * neutral default) target and reference are computed by the exact same call, so
 * gain is exactly [1,1,1] and this reduces to the identity matrix — a true no-op. */
function computeAdaptationMatrix(temperature: number, tint: number): Float32Array {
  const [refX, refY] = kelvinToXy(NEUTRAL_TEMPERATURE, 0);
  const [tgtX, tgtY] = kelvinToXy(temperature, tint);

  const refLMS = matVec3(BRADFORD, xyToXYZ(refX, refY));
  const tgtLMS = matVec3(BRADFORD, xyToXYZ(tgtX, tgtY));

  const gain: Vec3 = [tgtLMS[0] / refLMS[0], tgtLMS[1] / refLMS[1], tgtLMS[2] / refLMS[2]];
  const diagGain: Mat3 = [
    [gain[0], 0, 0],
    [0, gain[1], 0],
    [0, 0, gain[2]],
  ];

  const toLms = matMul3(BRADFORD, RGB_TO_XYZ);
  const scaled = matMul3(diagGain, toLms);
  const backToXyz = matMul3(BRADFORD_INV, scaled);
  const combined = matMul3(XYZ_TO_RGB, backToXyz);

  // Row-major flatten, paired with the shader's `linear * u_catMatrix` (vector-times-
  // matrix, not matrix-times-vector) — GLSL's column-major storage convention means
  // this combination applies the intended matrix without needing an explicit
  // transpose (see shaderProgram.ts's FLOAT_MAT3 upload via uniformMatrix3fv).
  return new Float32Array([
    combined[0][0],
    combined[0][1],
    combined[0][2],
    combined[1][0],
    combined[1][1],
    combined[1][2],
    combined[2][0],
    combined[2][1],
    combined[2][2],
  ]);
}

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform mat3 u_catMatrix;
in vec2 v_uv;
out vec4 fragColor;

${SRGB_GLSL_HELPERS}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec3 linear = srgbToLinear(s.rgb);
  vec3 adapted = max(linear * u_catMatrix, 0.0);
  fragColor = vec4(linearToSrgb(adapted), s.a);
}
`;

export const whiteBalanceEffect: GLEffectModule<WhiteBalanceEffect> = {
  type: "whiteBalance",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return { u_catMatrix: computeAdaptationMatrix(params.temperature, params.tint) };
  },
};
