import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { RgbShiftEffect } from "@/store/types";

// "linear" shifts every pixel by the same vector; "radial" instead shifts each pixel
// along its own direction away from/toward the center, scaled by distance from center
// (real lens chromatic aberration is edge-heavy, not uniform). Either way, each
// channel samples at `baseShift * thatChannel'sAmount` — a signed multiplier, so
// direction and magnitude are both independently reachable per channel instead of the
// old hardcoded "red one way, blue the other, green fixed".
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform int u_mode;
uniform float u_angleRad;
uniform float u_distance;
uniform float u_redAmount;
uniform float u_greenAmount;
uniform float u_blueAmount;
uniform vec2 u_center;
uniform float u_edgeFalloff;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 px = v_uv * u_resolution;
  vec2 dirVec;
  float falloffMul = 1.0;

  if (u_mode == 1) {
    vec2 toCenter = px - u_center * u_resolution;
    float dist = length(toCenter);
    float maxR = length(u_resolution) * 0.5;
    float rNorm = clamp(dist / max(maxR, 1.0), 0.0, 1.0);
    dirVec = dist > 0.0001 ? toCenter / dist : vec2(0.0);
    falloffMul = mix(1.0, rNorm, u_edgeFalloff);
  } else {
    dirVec = vec2(cos(u_angleRad), sin(u_angleRad));
  }

  vec2 baseShift = dirVec * u_distance * falloffMul / u_resolution;
  float r = texture(u_texture, v_uv + baseShift * u_redAmount).r;
  float g = texture(u_texture, v_uv + baseShift * u_greenAmount).g;
  float b = texture(u_texture, v_uv + baseShift * u_blueAmount).b;
  float a = texture(u_texture, v_uv).a;
  fragColor = vec4(r, g, b, a);
}
`;

export const rgbShiftEffect: GLEffectModule<RgbShiftEffect> = {
  type: "rgbShift",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_mode: params.mode === "radial" ? 1 : 0,
      u_angleRad: (params.angle * Math.PI) / 180,
      u_distance: params.distance,
      u_redAmount: params.redAmount,
      u_greenAmount: params.greenAmount,
      u_blueAmount: params.blueAmount,
      u_center: [params.centerX, params.centerY],
      u_edgeFalloff: params.edgeFalloff,
    };
  },
};
