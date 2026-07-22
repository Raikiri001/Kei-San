import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { runPass } from "@/canvas/gl/runPass";
import type { BlendMode, LayerBlend, LayerMask } from "@/store/types";

const BLEND_MODE_INDEX: Record<BlendMode, number> = {
  normal: 0,
  lighten: 1,
  darken: 2,
  multiply: 3,
  screen: 4,
  overlay: 5,
  add: 6,
  subtract: 7,
  difference: 8,
  exclusion: 9,
};

/**
 * The universal per-layer compositing pass: blends a layer's own raw transform output
 * ("transformed") back over whatever came before it ("before"), restricted to an
 * optional soft-edged radial mask, via a blend mode + opacity — compiled once and
 * reused for every layer regardless of effect type (see glRenderer.ts's per-layer
 * loop), same "compile once, forever" doctrine as every other program here. A
 * disabled mask + "normal" blend + opacity 1 (every layer's default) reduces to a
 * pure passthrough of `transformed`, so this never changes any effect's look until a
 * user actually opens its Mask/Blend controls.
 */
const COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_before;
uniform sampler2D u_transformed;
uniform vec2 u_resolution;
uniform int u_maskEnabled;
uniform int u_maskInvert;
uniform int u_maskDebug;
uniform int u_blendMode;
uniform vec2 u_maskCenter;
uniform float u_maskRadius;
uniform float u_maskFalloff;
uniform float u_maskAspect;
uniform float u_maskRotation;
uniform float u_opacity;
in vec2 v_uv;
out vec4 fragColor;

float maskWeight(vec2 uv) {
  if (u_maskEnabled == 0) return 1.0;
  vec2 d = uv * u_resolution - u_maskCenter * u_resolution;
  float rad = radians(u_maskRotation);
  float c = cos(rad);
  float s = sin(rad);
  vec2 rd = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);
  rd.y /= max(u_maskAspect, 0.0001);
  float radiusPx = u_maskRadius * min(u_resolution.x, u_resolution.y);
  float w = 1.0 - smoothstep(radiusPx * (1.0 - u_maskFalloff), max(radiusPx, 0.0001), length(rd));
  return u_maskInvert == 1 ? 1.0 - w : w;
}

vec3 blendColors(vec3 base, vec3 top) {
  if (u_blendMode == 1) return max(base, top);
  if (u_blendMode == 2) return min(base, top);
  if (u_blendMode == 3) return base * top;
  if (u_blendMode == 4) return 1.0 - (1.0 - base) * (1.0 - top);
  if (u_blendMode == 5) {
    vec3 lo = 2.0 * base * top;
    vec3 hi = 1.0 - 2.0 * (1.0 - base) * (1.0 - top);
    return mix(lo, hi, step(0.5, base));
  }
  if (u_blendMode == 6) return min(base + top, 1.0);
  if (u_blendMode == 7) return max(base - top, 0.0);
  if (u_blendMode == 8) return abs(base - top);
  if (u_blendMode == 9) return base + top - 2.0 * base * top;
  return top;
}

void main() {
  vec4 before = texture(u_before, v_uv);
  vec4 transformed = texture(u_transformed, v_uv);
  float m = maskWeight(v_uv);
  if (u_maskDebug == 1) {
    fragColor = vec4(vec3(m), 1.0);
    return;
  }
  float w = m * u_opacity;
  vec3 blended = blendColors(before.rgb, transformed.rgb);
  fragColor = vec4(mix(before.rgb, blended, w), mix(before.a, transformed.a, w));
}
`;

let compositeProgram: CompiledProgram | null = null;

function getCompositeProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!compositeProgram) compositeProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, COMPOSITE_FRAGMENT_SHADER);
  return compositeProgram;
}

/** Runs the universal composite pass, writing into `destFbo`. `before`/`transformed`
 * only need a `.texture` — a plain `{ texture }` object works too (e.g. a Layer Mix's
 * two branch results, which live in their own private triple buffers with no FBO the
 * caller needs here), not just a full `PingPongTarget`. */
export function runCompositePass(
  gl: WebGL2RenderingContext,
  before: { texture: WebGLTexture },
  transformed: { texture: WebGLTexture },
  destFbo: WebGLFramebuffer,
  width: number,
  height: number,
  blend: LayerBlend,
  mask: LayerMask,
): void {
  const compiled = getCompositeProgram(gl);
  runPass(
    gl,
    compiled,
    [
      { name: "u_before", texture: before.texture },
      { name: "u_transformed", texture: transformed.texture },
    ],
    destFbo,
    width,
    height,
    {
      u_resolution: [width, height],
      u_maskEnabled: mask.enabled ? 1 : 0,
      u_maskInvert: mask.invert ? 1 : 0,
      u_maskDebug: mask.debug ? 1 : 0,
      u_blendMode: BLEND_MODE_INDEX[blend.blendMode],
      u_maskCenter: [mask.centerX, mask.centerY],
      u_maskRadius: mask.radius,
      u_maskFalloff: mask.falloff,
      u_maskAspect: mask.aspectStretch,
      u_maskRotation: mask.rotation,
      u_opacity: blend.opacity,
    },
  );
}
