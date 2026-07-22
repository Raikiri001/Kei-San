import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { createPingPongPair, resizePingPongPair, type PingPongPair, type PingPongTarget } from "@/canvas/gl/pingPong";
import { runPass } from "@/canvas/gl/runPass";

/**
 * Shared scaffolding for every "bloom-style" multi-pass effect (Star Glow, Light
 * Streaks): threshold the bright pixels, run some effect-specific transform on just
 * that thresholded buffer (an isotropic blur for Star Glow, a directional streak blur
 * for Light Streaks), then additively composite the result back over the original.
 * Only the middle transform differs per effect — this factors out the threshold and
 * composite passes (and the scratch textures they need) so each effect module only
 * has to supply its own middle-pass shader/uniforms.
 */

const THRESHOLD_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_threshold;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 s = texture(u_texture, v_uv);
  float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
  float mask = step(u_threshold, lum);
  fragColor = vec4(s.rgb * mask, s.a * mask);
}
`;

const ADDITIVE_COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_base;
uniform sampler2D u_glow;
uniform float u_intensity;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 base = texture(u_base, v_uv);
  vec4 glow = texture(u_glow, v_uv);
  fragColor = vec4(base.rgb + glow.rgb * u_intensity, max(base.a, glow.a * u_intensity));
}
`;

let thresholdProgram: CompiledProgram | null = null;
let compositeProgram: CompiledProgram | null = null;
let scratchPair: PingPongPair | null = null;

function getThresholdProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!thresholdProgram) thresholdProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, THRESHOLD_FRAGMENT_SHADER);
  return thresholdProgram;
}

function getCompositeProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!compositeProgram) compositeProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, ADDITIVE_COMPOSITE_FRAGMENT_SHADER);
  return compositeProgram;
}

/** A private scratch pair owned by the bloom pipeline itself — distinct from the
 * main ping-pong pair in glRenderer.ts, since `source` there always aliases one of
 * that pair's two textures, leaving no free buffer to hold intermediate bloom state. */
function getScratchPair(gl: WebGL2RenderingContext, w: number, h: number): PingPongPair {
  scratchPair = scratchPair ? resizePingPongPair(gl, scratchPair, w, h) : createPingPongPair(gl, w, h);
  return scratchPair;
}

/** Picks whichever of the shared ping-pong pair ISN'T `source` — the one safe place
 * a multi-pass effect can write its final result without clobbering data it (or an
 * earlier pass) is still reading from. */
export function otherPingPongTarget(source: PingPongTarget, ping: PingPongTarget, pong: PingPongTarget): PingPongTarget {
  return source === ping ? pong : ping;
}

/**
 * Runs threshold -> `applyMiddlePass` -> additive composite, writing the final
 * result into `dest` (must not be `source` — see `otherPingPongTarget`).
 * `applyMiddlePass` reads the thresholded-bright buffer and writes its own
 * transformed version into the given destination framebuffer, at the given size.
 */
export function runBloomPipeline(
  gl: WebGL2RenderingContext,
  source: PingPongTarget,
  dest: PingPongTarget,
  threshold: number,
  intensity: number,
  applyMiddlePass: (srcTex: WebGLTexture, destFbo: WebGLFramebuffer, w: number, h: number) => void,
): void {
  const w = source.width;
  const h = source.height;
  const scratch = getScratchPair(gl, w, h);

  runPass(gl, getThresholdProgram(gl), [{ name: "u_texture", texture: source.texture }], scratch.a.fbo, w, h, { u_threshold: threshold });
  applyMiddlePass(scratch.a.texture, scratch.b.fbo, w, h);
  runPass(
    gl,
    getCompositeProgram(gl),
    [
      { name: "u_base", texture: source.texture },
      { name: "u_glow", texture: scratch.b.texture },
    ],
    dest.fbo,
    w,
    h,
    { u_intensity: intensity },
  );
}
