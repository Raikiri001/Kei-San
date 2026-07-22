import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ContrastEffect } from "@/store/types";

// Steepness scale for the sigmoidal-contrast curve — 20 matches the practical strong
// end of ImageMagick/GraphicsMagick's own `-sigmoidal-contrast` range.
const CONTRAST_ALPHA_SCALE = 20;

// Brightness/Contrast, matching Photoshop's own combined dialog. Brightness is a
// headroom-safe lerp toward white/black (never clips, unlike naive `c + b`). Contrast
// is the real, published sigmoidal-contrast algorithm (ImageMagick/GraphicsMagick) —
// an S-curve pivoting on mid-gray that increases contrast smoothly with no harsh
// clipping; negative values use the closed-form algebraic inverse of that same
// sigmoid (derived by solving g(u)=y for u), so *reducing* contrast is the exact
// mathematical reverse of increasing it, not a separate ad-hoc "flatten" formula.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contrast;
in vec2 v_uv;
out vec4 fragColor;

vec3 applyBrightness(vec3 c, float brightness) {
  float b = brightness / 100.0;
  if (b >= 0.0) return mix(c, vec3(1.0), b);
  return mix(c, vec3(0.0), -b);
}

vec3 applyContrast(vec3 c, float contrast) {
  if (abs(contrast) < 0.001) return c;
  float alpha = abs(contrast) / 100.0 * ${CONTRAST_ALPHA_SCALE.toFixed(1)};
  float beta = 0.5;
  float f0 = 1.0 / (1.0 + exp(alpha * beta));
  float f1 = 1.0 / (1.0 + exp(-alpha * (1.0 - beta)));
  if (contrast > 0.0) {
    vec3 f = 1.0 / (1.0 + exp(-alpha * (c - beta)));
    return clamp((f - f0) / (f1 - f0), 0.0, 1.0);
  }
  vec3 bigF = clamp(c * f1 + (1.0 - c) * f0, 1e-6, 1.0 - 1e-6);
  return clamp(beta + log(bigF / (1.0 - bigF)) / alpha, 0.0, 1.0);
}

void main() {
  vec4 s = texture(u_texture, v_uv);
  vec3 c = applyBrightness(s.rgb, u_brightness);
  c = applyContrast(c, u_contrast);
  fragColor = vec4(c, s.a);
}
`;

export const contrastEffect: GLEffectModule<ContrastEffect> = {
  type: "contrast",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params) {
    return { u_brightness: params.brightness, u_contrast: params.contrast };
  },
};
