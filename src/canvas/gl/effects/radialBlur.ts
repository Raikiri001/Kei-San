import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { runPass } from "@/canvas/gl/runPass";
import type { PingPongTarget } from "@/canvas/gl/pingPong";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { RadialBlurEffect } from "@/store/types";

// Covers the full requested rotational sweep as 2^12-1 = 4095 continuous angular
// steps using only 12 GPU passes — the exact same recursive-doubling technique
// motionTrails.ts uses for gap-free directional dilation, just rotating each step
// instead of translating (rotating by theta twice = rotating by 2*theta composes
// exactly under doubling, same as repeated translation does — this is mathematically
// exact regardless of pass count, but more passes means the finest angular step stays
// sub-pixel at larger source resolutions/angles too, so this has some headroom above
// Motion Trails' own 10-pass count).
const DOUBLING_PASSES = 12;

const DOUBLE_STEP_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_angle;
in vec2 v_uv;
out vec4 fragColor;

// Rotates in true pixel space (not raw 0-1 UV) so the rotation stays isotropic
// regardless of the canvas's aspect ratio.
vec2 rotateAround(vec2 uv, vec2 center, vec2 resolution, float angleRadians) {
  vec2 pixelPos = (uv - center) * resolution;
  float c = cos(angleRadians);
  float s = sin(angleRadians);
  vec2 rotated = vec2(pixelPos.x * c - pixelPos.y * s, pixelPos.x * s + pixelPos.y * c);
  return center + rotated / resolution;
}

void main() {
  vec4 current = texture(u_texture, v_uv);
  vec2 shiftedUv = rotateAround(v_uv, u_center, u_resolution, u_angle);
  vec4 shifted = texture(u_texture, shiftedUv);
  // A true running average (not max()) — this is a blur, not a glow trail: two
  // buffers that already each average 2^i samples combine into the exact average
  // of the combined 2^(i+1) samples.
  fragColor = mix(current, shifted, 0.5);
}
`;

let doubleStepProgram: CompiledProgram | null = null;
function getDoubleStepProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!doubleStepProgram) doubleStepProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, DOUBLE_STEP_FRAGMENT_SHADER);
  return doubleStepProgram;
}

/**
 * Radial Blur (Spin) — Photoshop's classic rotational motion blur around a center
 * point. Recursive-doubling exactly like Motion Trails: each pass rotates by an
 * angle that doubles (theta, 2*theta, 4*theta...), covering 1023 discrete angular
 * steps across the full requested sweep with zero gaps, using only 10 passes.
 */
export const radialBlurEffect: GLEffectModule<RadialBlurEffect> = {
  type: "radialBlur",
  renderMultiPass(gl, source, ping, pong, params) {
    const w = source.width;
    const h = source.height;
    const totalSteps = 2 ** DOUBLING_PASSES - 1;
    const center: [number, number] = [params.centerX, params.centerY];
    const stepAngleRadians = (i: number) => params.angle * (2 ** i / totalSteps) * (Math.PI / 180);

    // First pass reads the framework-owned `source` (must stay untouched for the
    // later composite pass) and writes into `ping` — every pass after this only
    // ever alternates between `ping`/`pong`, never touching `source` again.
    runPass(gl, getDoubleStepProgram(gl), [{ name: "u_texture", texture: source.texture }], ping.fbo, w, h, {
      u_resolution: [w, h],
      u_center: center,
      u_angle: stepAngleRadians(0),
    });

    let current: PingPongTarget = ping;
    let next: PingPongTarget = pong;
    for (let i = 1; i < DOUBLING_PASSES; i++) {
      runPass(gl, getDoubleStepProgram(gl), [{ name: "u_texture", texture: current.texture }], next.fbo, w, h, {
        u_resolution: [w, h],
        u_center: center,
        u_angle: stepAngleRadians(i),
      });
      [current, next] = [next, current];
    }

    return current;
  },
};
