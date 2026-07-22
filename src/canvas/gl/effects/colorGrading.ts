import { HSL_GLSL_HELPERS } from "@/canvas/gl/hslHelpers";
import { TONE_ZONE_GLSL_HELPERS } from "@/canvas/gl/toneZoneHelpers";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ColorGradingEffect } from "@/store/types";

// The modern 3-way color-wheel tool (Lightroom Classic's Color Grading panel /
// DaVinci Resolve's color wheels) — each zone's hue+saturation pick becomes a signed
// tint color (zero when saturation is 0, regardless of hue) plus its own luminance
// offset, blended across zones via toneZoneWeights. Distinct from Color Balance by
// using the hue-wheel input model instead of CMY-axis sliders.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec3 u_shadowHsl;
uniform vec3 u_midtoneHsl;
uniform vec3 u_highlightHsl;
in vec2 v_uv;
out vec4 fragColor;

${HSL_GLSL_HELPERS}
${TONE_ZONE_GLSL_HELPERS}

vec3 zoneTint(vec3 hueSatLum) {
  vec3 tintColor = hslToRgb(vec3(hueSatLum.x, hueSatLum.y, 0.5)) - 0.5;
  return tintColor + hueSatLum.z;
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  float lum = dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 w = toneZoneWeights(lum);
  vec3 tint = w.x * zoneTint(u_shadowHsl) + w.y * zoneTint(u_midtoneHsl) + w.z * zoneTint(u_highlightHsl);
  fragColor = vec4(clamp(s.rgb + tint, 0.0, 1.0), s.a);
}
`;

export const colorGradingEffect: GLEffectModule<ColorGradingEffect> = {
  type: "colorGrading",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return {
      u_shadowHsl: [params.shadowHue / 360, params.shadowSaturation / 100, params.shadowLuminance / 100],
      u_midtoneHsl: [params.midtoneHue / 360, params.midtoneSaturation / 100, params.midtoneLuminance / 100],
      u_highlightHsl: [params.highlightHue / 360, params.highlightSaturation / 100, params.highlightLuminance / 100],
    };
  },
};
