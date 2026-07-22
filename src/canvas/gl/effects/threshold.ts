import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ThresholdEffect } from "@/store/types";

// The real Photoshop Threshold filter — a hard luminance cutoff to pure black/white
// — plus one disclosed, off-by-default enhancement (softness) the classic filter
// doesn't have. softness: 0 reproduces the authentic hard cutoff exactly.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_threshold;
uniform float u_softness;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 s = texture(u_texture, v_uv);
  float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
  float halfWidth = max(u_softness, 0.0005);
  float v = smoothstep(u_threshold - halfWidth, u_threshold + halfWidth, lum);
  fragColor = vec4(vec3(v), s.a);
}
`;

export const thresholdEffect: GLEffectModule<ThresholdEffect> = {
  type: "threshold",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return { u_threshold: params.threshold, u_softness: params.softness };
  },
};
