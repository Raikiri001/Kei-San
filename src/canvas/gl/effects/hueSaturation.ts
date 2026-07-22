import { HSL_GLSL_HELPERS } from "@/canvas/gl/hslHelpers";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { HueSaturationEffect } from "@/store/types";

// An exact RGB<->HSL round-trip (see hslHelpers.ts) — not the "cheap" hue-rotation-
// matrix shortcut, which is only a linear approximation of hue rotation and visibly
// distorts saturation/perceived lightness away from the true hue circle.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_hue;
uniform float u_saturation;
uniform float u_lightness;
in vec2 v_uv;
out vec4 fragColor;

${HSL_GLSL_HELPERS}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec3 hsl = rgbToHsl(s.rgb);
  hsl.x = mod(hsl.x + u_hue / 360.0, 1.0);
  hsl.y = clamp(hsl.y * (1.0 + u_saturation / 100.0), 0.0, 1.0);
  hsl.z = u_lightness >= 0.0 ? mix(hsl.z, 1.0, u_lightness / 100.0) : mix(hsl.z, 0.0, -u_lightness / 100.0);
  fragColor = vec4(hslToRgb(hsl), s.a);
}
`;

export const hueSaturationEffect: GLEffectModule<HueSaturationEffect> = {
  type: "hueSaturation",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return { u_hue: params.hue, u_saturation: params.saturation, u_lightness: params.lightness };
  },
};
