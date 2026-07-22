import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { runPass } from "@/canvas/gl/runPass";
import type { PingPongTarget } from "@/canvas/gl/pingPong";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ZoomBlurEffect } from "@/store/types";

// Same recursive-doubling technique as Radial Blur/Motion Trails, this time scaling
// toward/away from a center each step instead of rotating. The critical difference:
// translation and rotation compose ADDITIVELY (shift by a then b = shift by a+b;
// rotate by a then b = rotate by a+b), which is exactly why doubling the raw step
// value each pass gives exact, evenly-spaced coverage. Scale composes
// MULTIPLICATIVELY (scale by k1 then k2 = scale by k1*k2, not k1+k2) — so doubling
// must happen in LOG-SCALE space (where multiplication becomes addition) to get the
// same exact, evenly-spaced coverage; doubling the raw scale-minus-one fraction
// instead (as an earlier version of this file did) compounds unevenly and leaves
// real gaps, visible as concentric ring artifacts on detailed source images. 4095
// discrete log-spaced zoom steps across 12 passes.
const DOUBLING_PASSES = 12;

const DOUBLE_STEP_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_center;
uniform float u_scale;
in vec2 v_uv;
out vec4 fragColor;

// Samples progressively closer to center as scale grows past 1 — what "zooming
// in during exposure" actually looks like: content at the sampled (pre-zoom)
// position is what would end up at uv after the zoom, so a bigger scale samples a
// point nearer the center.
vec2 scaleToward(vec2 uv, vec2 center, float scale) {
  return center + (uv - center) / scale;
}

void main() {
  vec4 current = texture(u_texture, v_uv);
  vec4 shifted = texture(u_texture, scaleToward(v_uv, u_center, u_scale));
  // A true running average (not max()) — this is a blur, not a glow trail.
  fragColor = mix(current, shifted, 0.5);
}
`;

let doubleStepProgram: CompiledProgram | null = null;
function getDoubleStepProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!doubleStepProgram) doubleStepProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, DOUBLE_STEP_FRAGMENT_SHADER);
  return doubleStepProgram;
}

/**
 * Zoom Blur — Photoshop's classic Radial Blur "Zoom" method, radial streaks toward/
 * away from a center simulating a zoom during exposure. Recursive-doubling in
 * LOG-SCALE space (see this module's own note above for why): the total requested
 * zoom range [1, 1+strength] has log-width `ln(1+strength)`, and doubling that
 * log-width each pass (matching exactly how Motion Trails doubles a raw pixel
 * offset) means the product of every pass's per-step scale factor telescopes out to
 * exactly `1+strength` — 4095 discrete, evenly-log-spaced zoom steps with zero gaps.
 */
export const zoomBlurEffect: GLEffectModule<ZoomBlurEffect> = {
  type: "zoomBlur",
  renderMultiPass(gl, source, ping, pong, params) {
    const w = source.width;
    const h = source.height;
    const totalSteps = 2 ** DOUBLING_PASSES - 1;
    const center: [number, number] = [params.centerX, params.centerY];
    const totalLogScale = Math.log(1 + params.strength / 100);
    const stepScale = (i: number) => Math.exp((totalLogScale * 2 ** i) / totalSteps);

    // First pass reads the framework-owned `source` (must stay untouched for the
    // later composite pass) and writes into `ping` — every pass after this only
    // ever alternates between `ping`/`pong`, never touching `source` again.
    runPass(gl, getDoubleStepProgram(gl), [{ name: "u_texture", texture: source.texture }], ping.fbo, w, h, {
      u_center: center,
      u_scale: stepScale(0),
    });

    let current: PingPongTarget = ping;
    let next: PingPongTarget = pong;
    for (let i = 1; i < DOUBLING_PASSES; i++) {
      runPass(gl, getDoubleStepProgram(gl), [{ name: "u_texture", texture: current.texture }], next.fbo, w, h, {
        u_center: center,
        u_scale: stepScale(i),
      });
      [current, next] = [next, current];
    }

    return current;
  },
};
