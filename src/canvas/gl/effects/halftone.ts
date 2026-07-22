import { hexToRgb } from "@/canvas/colorExtraction";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { HalftoneEffect } from "@/store/types";

export const DOT_PITCH = 14;

// Single-tap-at-cell-center sampling — the standard GPU halftone technique, and a
// deliberate difference from a CPU version's true per-cell box-average (cheap to do
// per-pixel on the CPU, expensive to do per-fragment on the GPU without a separate
// mip/blur pre-pass). Both the live preview and export renderers run this same
// shader, so they stay pixel-equivalent with each other, which is the actual
// hard requirement.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_dotPitch;
uniform int u_mode;  // 0 = color, 1 = ink
uniform int u_style; // 0 = circle, 1 = line, 2 = hatch
uniform vec3 u_inkColor;
in vec2 v_uv;
out vec4 fragColor;

// Each color channel rendered as its own angled line screen (15°/75°/45° — classic
// print-separation screen angles, chosen to avoid the three patterns beating against
// each other into a moiré) instead of continuous tone: within each line's "ink band"
// (width proportional to how dark that channel is) the channel's own value shows;
// outside the band it's full white (1.0, "bare paper"), matching how a real CMYK
// halftone separation reads. Absorbed from this codebase's original standalone RGB
// Hatch effect as a Halftone "style" option instead of its own separate type.
float hatchLine(vec2 px, float angleDeg, float value, float spacing) {
  float rad = radians(angleDeg);
  float coord = px.x * cos(rad) + px.y * sin(rad);
  float linePos = mod(coord, spacing) / spacing;
  float coverage = 1.0 - value;
  return linePos < coverage ? value : 1.0;
}

void main() {
  vec2 px = v_uv * u_resolution;

  if (u_style == 2) {
    vec4 s = texture(u_texture, v_uv);
    float r = hatchLine(px, 15.0, s.r, u_dotPitch);
    float g = hatchLine(px, 75.0, s.g, u_dotPitch);
    float b = hatchLine(px, 45.0, s.b, u_dotPitch);
    fragColor = vec4(r, g, b, s.a);
    return;
  }

  vec2 cellCenterPx = (floor(px / u_dotPitch) + 0.5) * u_dotPitch;
  vec4 s = texture(u_texture, cellCenterPx / u_resolution);
  float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
  float radius = (u_dotPitch * 0.5 * 0.95) * (1.0 - lum);
  vec2 d = px - cellCenterPx;
  float dist = u_style == 1 ? abs(d.y) : length(d);
  float shape = 1.0 - smoothstep(radius - 1.0, radius + 1.0, dist);
  vec3 fillColor = u_mode == 1 ? u_inkColor : s.rgb;
  fragColor = vec4(fillColor * shape, s.a * shape);
}
`;

export const halftoneEffect: GLEffectModule<HalftoneEffect> = {
  type: "halftone",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    const ink = hexToRgb(params.inkColor) ?? { r: 0, g: 0, b: 0 };
    return {
      u_resolution: [viewport.w, viewport.h],
      u_dotPitch: params.dotPitch,
      u_mode: params.mode === "ink" ? 1 : 0,
      u_style: params.style === "line" ? 1 : params.style === "hatch" ? 2 : 0,
      u_inkColor: [ink.r / 255, ink.g / 255, ink.b / 255],
    };
  },
};
