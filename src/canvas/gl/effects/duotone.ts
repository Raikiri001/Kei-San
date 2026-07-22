import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { DuotoneEffect } from "@/store/types";

function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// The classic 2-ink print technique — shadowColor and highlightColor linearly
// interpolated by luminance. Gradient Map's simplest 2-stop case, kept as its own
// effect the way real tools separate the classic fixed duotone from an arbitrary
// gradient map.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec3 u_shadowColor;
uniform vec3 u_highlightColor;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 s = texture(u_texture, v_uv);
  float lum = dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
  fragColor = vec4(mix(u_shadowColor, u_highlightColor, lum), s.a);
}
`;

export const duotoneEffect: GLEffectModule<DuotoneEffect> = {
  type: "duotone",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return { u_shadowColor: hexToRgb01(params.shadowColor), u_highlightColor: hexToRgb01(params.highlightColor) };
  },
};
