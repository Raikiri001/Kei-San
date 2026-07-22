import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { runPass } from "@/canvas/gl/runPass";
import type { PingPongTarget } from "@/canvas/gl/pingPong";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { MotionTrailsEffect } from "@/store/types";

const DIRECTION_SCALE = 60;
const WAVE_AMPLITUDE_SCALE = 40;
// Covers the trail's full requested reach as 2^10-1 = 1023 continuous integer
// offsets using only 10 GPU passes — see runMotionTrails' doc comment for why this
// is an exact, gap-free technique rather than an approximation.
const DOUBLING_PASSES = 10;
// Fixed internal scale so the user-facing 0-1 "dimming" slider produces a sensible
// falloff regardless of DOUBLING_PASSES/step-count internals — see the decay math
// below.
const DIMMING_SCALE = 25;

// Same 5x5 gaussian-weighted-tap technique as Bloom's own pre-composite blur — run
// before thresholding (not after) so adjacent small bright spots (e.g. many separate
// rock highlights in a busy photo) fuse into fewer, larger blobs first, giving each
// trail fewer/thicker cohesive streaks instead of one thin streak per tiny highlight.
const BLUR_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_radius;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 texel = 1.0 / u_resolution;
  vec4 sum = vec4(0.0);
  float totalWeight = 0.0;
  for (int i = -2; i <= 2; i++) {
    for (int j = -2; j <= 2; j++) {
      vec2 offset = vec2(float(i), float(j)) * (u_radius * 0.5) * texel;
      float weight = exp(-float(i * i + j * j) / 8.0);
      sum += texture(u_texture, v_uv + offset) * weight;
      totalWeight += weight;
    }
  }
  fragColor = sum / totalWeight;
}
`;

const THRESHOLD_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform float u_threshold;
uniform float u_knee;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 s = texture(u_texture, v_uv);
  float lum = dot(s.rgb, vec3(0.299, 0.587, 0.114));
  float kneeAmt = max(u_knee, 0.001);
  float mask = smoothstep(u_threshold - kneeAmt, u_threshold + kneeAmt, lum);
  fragColor = vec4(s.rgb * mask, mask);
}
`;

// One "doubling" step: combines the current buffer with a copy of itself shifted by
// this pass's step vector (dimmed by this pass's decay), via max(). Because the
// input to pass i already holds every integer offset from 0 to 2^i-1 (built up by
// all earlier passes), shifting it by exactly 2^i and max-combining fills every
// offset up to 2^(i+1)-1 with NO gaps — this is exact dilation, not approximate
// sampling, so it can't leave "ghost copies" behind the way sampling N discrete
// points along the raw sharp source always eventually does at long range.
const DOUBLE_STEP_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_step;
uniform float u_decay;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 current = texture(u_texture, v_uv);
  vec4 shifted = texture(u_texture, v_uv - u_step / u_resolution) * u_decay;
  fragColor = max(current, shifted);
}
`;

const COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_source;
uniform sampler2D u_trail;
uniform float u_intensity;
uniform float u_sourceDim;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 source = texture(u_source, v_uv);
  vec4 trail = texture(u_trail, v_uv);
  vec3 dimmedSource = source.rgb * u_sourceDim;
  vec3 result = max(dimmedSource, trail.rgb * u_intensity);
  fragColor = vec4(result, source.a);
}
`;

let blurProgram: CompiledProgram | null = null;
let thresholdProgram: CompiledProgram | null = null;
let doubleStepProgram: CompiledProgram | null = null;
let compositeProgram: CompiledProgram | null = null;

function getBlurProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!blurProgram) blurProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, BLUR_FRAGMENT_SHADER);
  return blurProgram;
}
function getThresholdProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!thresholdProgram) thresholdProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, THRESHOLD_FRAGMENT_SHADER);
  return thresholdProgram;
}
function getDoubleStepProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!doubleStepProgram) doubleStepProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, DOUBLE_STEP_FRAGMENT_SHADER);
  return doubleStepProgram;
}
function getCompositeProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!compositeProgram) compositeProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, COMPOSITE_FRAGMENT_SHADER);
  return compositeProgram;
}

/**
 * Motion Trails — a recursive-doubling directional dilation, the same class of
 * technique real GPU bloom/glow/long-streak effects use for cheap, exact long-range
 * smearing (sometimes called log-depth or exponential dilation): optionally pre-blur,
 * threshold the bright/edge pixels, then repeatedly combine the accumulated buffer
 * with a copy of itself shifted by an exponentially growing step (1, 2, 4, 8... units
 * of the total requested reach) via max(), each copy dimmed relative to how far it's
 * shifted. The pre-blur step matters for busy source images: a photo with many small
 * separate bright spots (rock highlights, foliage) otherwise produces one thin streak
 * per spot, reading as a comb/woven texture rather than one cohesive glow — blurring
 * first fuses nearby spots into fewer, larger streak sources.
 * After 10 passes every one of 1023 discrete integer offsets along the trail is
 * covered continuously — unlike sampling a fixed number of points against the raw
 * sharp source (which always eventually shows gaps/"ghost copies" at long range no
 * matter how many samples you throw at it, since that's a classic
 * undersampling/aliasing problem, not something more samples alone can fully solve),
 * this is mathematically exact and only costs 10 cheap full-screen passes.
 * `direction` is a literal 2-axis vector (see MotionTrailsEffect's doc comment,
 * scaled up by DIRECTION_SCALE into real px), and the perpendicular sine wave
 * (`shake`/`shakeSpeed`) is added per pass based on how far along the trail that
 * pass's step reaches, giving a smoothly curving streak instead of a straight one.
 */
export const motionTrailsEffect: GLEffectModule<MotionTrailsEffect> = {
  type: "motionTrails",
  renderMultiPass(gl, source, ping, pong, params) {
    const w = source.width;
    const h = source.height;

    // pong is free scratch space at this point (the doubling loop below only starts
    // reading/writing it after threshold has already consumed whatever's here into
    // ping), so a pre-blur pass can use it without an extra buffer.
    let thresholdSource = source.texture;
    if (params.preBlur > 0.001) {
      runPass(gl, getBlurProgram(gl), [{ name: "u_texture", texture: source.texture }], pong.fbo, w, h, {
        u_resolution: [w, h],
        u_radius: params.preBlur,
      });
      thresholdSource = pong.texture;
    }

    runPass(gl, getThresholdProgram(gl), [{ name: "u_texture", texture: thresholdSource }], ping.fbo, w, h, {
      u_threshold: params.threshold,
      u_knee: params.knee,
    });

    let current: PingPongTarget = ping;
    let next: PingPongTarget = pong;

    const direction: [number, number] = [params.directionX * DIRECTION_SCALE, params.directionY * DIRECTION_SCALE];
    const dirLen = Math.hypot(direction[0], direction[1]);
    const dirNorm: [number, number] = dirLen > 0.0001 ? [direction[0] / dirLen, direction[1] / dirLen] : [1, 0];
    const perp: [number, number] = [-dirNorm[1], dirNorm[0]];
    const totalSteps = 2 ** DOUBLING_PASSES - 1;

    for (let i = 0; i < DOUBLING_PASSES; i++) {
      const stepFrac = 2 ** i / totalSteps;
      const farFrac = (2 ** (i + 1) - 1) / totalSteps;
      const wave = Math.sin(farFrac * params.shakeSpeed * Math.PI * 2) * params.shake * WAVE_AMPLITUDE_SCALE * farFrac;
      const step: [number, number] = [direction[0] * stepFrac + perp[0] * wave, direction[1] * stepFrac + perp[1] * wave];
      // Decay chosen so the compounded brightness at fractional position `farFrac`
      // along the trail is exactly (1 - dimming) ^ (DIMMING_SCALE * farFrac),
      // regardless of DOUBLING_PASSES — see this module's own reasoning notes.
      const decay = (1 - params.dimming) ** ((2 ** i / totalSteps) * DIMMING_SCALE);

      runPass(gl, getDoubleStepProgram(gl), [{ name: "u_texture", texture: current.texture }], next.fbo, w, h, {
        u_resolution: [w, h],
        u_step: step,
        u_decay: decay,
      });
      [current, next] = [next, current];
    }

    const dest = current === ping ? pong : ping;
    runPass(
      gl,
      getCompositeProgram(gl),
      [
        { name: "u_source", texture: source.texture },
        { name: "u_trail", texture: current.texture },
      ],
      dest.fbo,
      w,
      h,
      { u_intensity: params.intensity, u_sourceDim: params.sourceDim },
    );
    return dest;
  },
};
