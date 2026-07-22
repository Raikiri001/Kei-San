import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ReededGlassEffect } from "@/store/types";

// Vertical (or rotated) fluted-glass refraction. The per-rib horizontal displacement
// is the actual surface derivative of a half-cylinder lens profile h(x)=sqrt(r²-x²)
// (r = 0.5, one normalized rib width): dh/dx = -x/sqrt(r²-x²) — steep right at a
// rib's seam, ~0 at a rib's center — a real, physically-motivated refraction proxy,
// not an ad hoc curve. Clamped (both the sqrt's denominator and the final offset) to
// avoid the derivative blowing up exactly at a rib boundary.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_ribWidth;
uniform float u_strength;
uniform float u_angle;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  float angleRad = radians(u_angle);
  float c = cos(angleRad);
  float s = sin(angleRad);
  vec2 pixelOffset = (v_uv - vec2(0.5)) * u_resolution;
  vec2 rotated = vec2(pixelOffset.x * c + pixelOffset.y * s, -pixelOffset.x * s + pixelOffset.y * c);

  float ribPos = fract(rotated.x / max(u_ribWidth, 1.0)) - 0.5;
  float slope = ribPos / sqrt(max(0.25 - ribPos * ribPos, 0.02));
  float offsetLocal = clamp(slope * u_strength, -u_strength * 3.0, u_strength * 3.0);

  vec2 offsetWorld = vec2(offsetLocal * c, offsetLocal * s);
  vec2 sampledUv = v_uv - offsetWorld / u_resolution;
  fragColor = texture(u_texture, sampledUv);
}
`;

export const reededGlassEffect: GLEffectModule<ReededGlassEffect> = {
  type: "reededGlass",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_ribWidth: params.ribWidth,
      u_strength: params.strength,
      u_angle: params.angle,
    };
  },
};
