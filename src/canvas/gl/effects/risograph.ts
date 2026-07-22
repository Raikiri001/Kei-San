import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { RisographEffect } from "@/store/types";

function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// A genuine 2-spot-color print separation, not a cheap 2-color tint. Each ink prints
// through its own halftone screen — reusing halftone.ts's exact per-cell dot-radius
// technique (sample once at the cell's center, derive dot radius from that sample,
// antialias with a fixed ±1px smoothstep band) — at its own classic print angle
// (15°/75°, the same angles halftone.ts hardcodes for its own hatch mode) and its own
// small misregistration offset (real riso prints are never perfectly aligned). Ink B
// multiplies over whatever's already printed (paper or ink A), so an overlap band
// shows a genuine third mixed color — real overprint, not a flat alpha blend.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec3 u_inkColorA;
uniform vec3 u_inkColorB;
uniform float u_splitPoint;
uniform float u_overlap;
uniform float u_dotPitch;
uniform vec2 u_misregisterA;
uniform vec2 u_misregisterB;
uniform float u_grain;
in vec2 v_uv;
out vec4 fragColor;

const float ANGLE_A = 15.0;
const float ANGLE_B = 75.0;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float lumAt(vec2 uv) {
  vec4 s = texture(u_texture, clamp(uv, 0.0, 1.0));
  return dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
}

// coverageRising: true for the highlight ink (more coverage as luminance rises above
// splitPoint), false for the shadow ink (more coverage as luminance falls below it).
float inkDotMask(vec2 px, float pitch, float angleDeg, float splitPoint, float overlap, bool coverageRising) {
  float rad = radians(angleDeg);
  float ca = cos(rad);
  float sa = sin(rad);
  vec2 rotatedPx = vec2(px.x * ca + px.y * sa, -px.x * sa + px.y * ca);
  vec2 rotatedCellCenter = (floor(rotatedPx / pitch) + 0.5) * pitch;
  vec2 worldCellCenterPx = vec2(rotatedCellCenter.x * ca - rotatedCellCenter.y * sa, rotatedCellCenter.x * sa + rotatedCellCenter.y * ca);
  float lum = lumAt(worldCellCenterPx / u_resolution);
  float coverage = coverageRising ? smoothstep(splitPoint - overlap, splitPoint + overlap, lum) : smoothstep(splitPoint + overlap, splitPoint - overlap, lum);
  float radius = (pitch * 0.5 * 0.95) * coverage;
  float dist = length(rotatedPx - rotatedCellCenter);
  return 1.0 - smoothstep(radius - 1.0, radius + 1.0, dist);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec2 px = v_uv * u_resolution;
  float overlapAmt = max(u_overlap, 0.001);

  float dotA = inkDotMask(px + u_misregisterA, u_dotPitch, ANGLE_A, u_splitPoint, overlapAmt, false);
  float dotB = inkDotMask(px + u_misregisterB, u_dotPitch, ANGLE_B, u_splitPoint, overlapAmt, true);

  vec3 result = mix(vec3(1.0), u_inkColorA, dotA);
  result = mix(result, result * u_inkColorB, dotB);

  float n = hash(px);
  result += (n - 0.5) * u_grain;

  fragColor = vec4(clamp(result, 0.0, 1.0), s.a);
}
`;

export const risographEffect: GLEffectModule<RisographEffect> = {
  type: "risograph",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    const misAngleRad = Math.PI / 6;
    const mis = params.misregister;
    return {
      u_resolution: [viewport.w, viewport.h],
      u_inkColorA: hexToRgb01(params.inkColorA),
      u_inkColorB: hexToRgb01(params.inkColorB),
      u_splitPoint: params.splitPoint,
      u_overlap: params.overlap,
      u_dotPitch: params.dotPitch,
      u_misregisterA: [0, 0],
      u_misregisterB: [mis * Math.cos(misAngleRad), mis * Math.sin(misAngleRad)],
      u_grain: params.grain,
    };
  },
};
