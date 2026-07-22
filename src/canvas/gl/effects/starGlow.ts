import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { runPass } from "@/canvas/gl/runPass";
import { runBloomPipeline, otherPingPongTarget } from "@/canvas/gl/effects/bloomShared";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { StarGlowEffect } from "@/store/types";

// The multi-ray directional middle pass applied to the thresholded-bright buffer
// between bloomShared's threshold and composite passes: instead of one streak
// direction (this codebase's original Phase-1 "lightStreaks"), accumulates `rayCount`
// evenly-spaced streaks radiating from `angle` — a real star/diffraction-spike
// pattern. The ray-count loop bound must be a compile-time constant in GLSL ES 3.00,
// so it always runs MAX_RAYS iterations and zeroes out any ray beyond the requested
// `u_rayCount` via a step() mask, rather than varying the loop's own trip count.
const MAX_RAYS = 8;
const TAPS = 10;
const STREAK_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_angleRad;
uniform float u_rayCount;
uniform float u_length;
in vec2 v_uv;
out vec4 fragColor;

const int MAX_RAYS = ${MAX_RAYS};
const int TAPS = ${TAPS};
const float TAU = 6.28318530718;

void main() {
  vec4 total = vec4(0.0);
  float totalWeight = 0.0;
  for (int r = 0; r < MAX_RAYS; r++) {
    float rayActive = step(float(r) + 0.5, u_rayCount);
    if (rayActive < 0.5) continue;
    float rayAngle = u_angleRad + (TAU * float(r)) / max(u_rayCount, 1.0);
    vec2 dir = vec2(cos(rayAngle), sin(rayAngle)) / u_resolution;
    for (int i = 0; i < TAPS; i++) {
      float t = float(i) / float(TAPS - 1);
      float weight = 1.0 - t;
      total += texture(u_texture, v_uv + dir * (t * u_length)) * weight;
      totalWeight += weight;
    }
  }
  fragColor = totalWeight > 0.0 ? total / totalWeight : texture(u_texture, v_uv);
}
`;

let streakProgram: CompiledProgram | null = null;
function getStreakProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!streakProgram) streakProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, STREAK_FRAGMENT_SHADER);
  return streakProgram;
}

/**
 * Star Glow — a bloom variant sharing bloomShared's threshold/composite passes (see
 * bloom.ts for the same pattern) with a multi-ray directional streak blur in between
 * instead of an isotropic one, producing a real star/diffraction-spike look
 * (rayCount 4 = a classic 4-point star, 6 = a 6-point star, etc.) rather than a
 * single streak.
 */
export const starGlowEffect: GLEffectModule<StarGlowEffect> = {
  type: "starGlow",
  renderMultiPass(gl, source, ping, pong, params) {
    const dest = otherPingPongTarget(source, ping, pong);
    runBloomPipeline(gl, source, dest, params.threshold, params.intensity, (srcTex, destFbo, w, h) => {
      runPass(gl, getStreakProgram(gl), [{ name: "u_texture", texture: srcTex }], destFbo, w, h, {
        u_resolution: [w, h],
        u_angleRad: (params.angle * Math.PI) / 180,
        u_rayCount: params.rayCount,
        u_length: params.length,
      });
    });
    return dest;
  },
};
