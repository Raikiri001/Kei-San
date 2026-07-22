import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { EmbossEffect } from "@/store/types";

// The real directional-derivative emboss technique Photoshop's own Emboss filter is
// built on (Angle/Height/Amount) — sample twice along the light direction, the
// difference approximates a directional derivative, add a neutral-gray bias so flat
// areas go gray and edges catch light/shadow. Blended against the source by
// `amount` so amount:0 is a true no-op, unlike Photoshop's own Emboss.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_angle;
uniform float u_height;
uniform float u_amount;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec2 dir = vec2(cos(radians(u_angle)), sin(radians(u_angle)));
  vec2 offset = dir * u_height * texel;
  vec4 source = texture(u_texture, v_uv);
  vec3 s1 = texture(u_texture, v_uv - offset).rgb;
  vec3 s2 = texture(u_texture, v_uv + offset).rgb;
  float gray = dot(s2 - s1, vec3(0.333)) + 0.5;
  vec3 result = mix(source.rgb, vec3(gray), clamp(u_amount / 100.0, 0.0, 1.0));
  fragColor = vec4(result, source.a);
}
`;

export const embossEffect: GLEffectModule<EmbossEffect> = {
  type: "emboss",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_angle: params.angle,
      u_height: params.height,
      u_amount: params.amount,
    };
  },
};
