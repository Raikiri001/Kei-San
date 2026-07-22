import { TONE_ZONE_GLSL_HELPERS } from "@/canvas/gl/toneZoneHelpers";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ColorBalanceEffect } from "@/store/types";

// Scales the -100..100 slider range into a visually meaningful additive push —
// tuned so the strongest single-zone push (100) is a strong but not absurd tint.
const PUSH_SCALE = 0.5 / 100;

// Photoshop's actual Color Balance tool — independent Cyan-Red/Magenta-Green/
// Yellow-Blue pushes per tonal zone, blended smoothly by luminance via
// toneZoneWeights (see toneZoneHelpers.ts) instead of hard zone cutoffs.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec3 u_shadowPush;
uniform vec3 u_midtonePush;
uniform vec3 u_highlightPush;
in vec2 v_uv;
out vec4 fragColor;

${TONE_ZONE_GLSL_HELPERS}

void main() {
  vec4 s = texture(u_texture, v_uv);
  float lum = dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 w = toneZoneWeights(lum);
  vec3 tint = w.x * u_shadowPush + w.y * u_midtonePush + w.z * u_highlightPush;
  fragColor = vec4(clamp(s.rgb + tint, 0.0, 1.0), s.a);
}
`;

export const colorBalanceEffect: GLEffectModule<ColorBalanceEffect> = {
  type: "colorBalance",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return {
      u_shadowPush: [params.shadowCyanRed * PUSH_SCALE, params.shadowMagentaGreen * PUSH_SCALE, params.shadowYellowBlue * PUSH_SCALE],
      u_midtonePush: [params.midtoneCyanRed * PUSH_SCALE, params.midtoneMagentaGreen * PUSH_SCALE, params.midtoneYellowBlue * PUSH_SCALE],
      u_highlightPush: [params.highlightCyanRed * PUSH_SCALE, params.highlightMagentaGreen * PUSH_SCALE, params.highlightYellowBlue * PUSH_SCALE],
    };
  },
};
