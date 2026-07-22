import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { runPass } from "@/canvas/gl/runPass";
import { runBloomPipeline, otherPingPongTarget } from "@/canvas/gl/effects/bloomShared";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { BloomEffect } from "@/store/types";

// The isotropic blur applied to the thresholded-bright buffer between bloomShared's
// threshold and composite passes — same 5x5 gaussian-weighted-tap technique as the
// standalone Gaussian Blur effect, fixed at a moderate radius (bloom halos don't need
// a user-adjustable spread the way a standalone blur does).
const BLOOM_BLUR_RADIUS = 10;
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

let blurProgram: CompiledProgram | null = null;
function getBlurProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!blurProgram) blurProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, BLUR_FRAGMENT_SHADER);
  return blurProgram;
}

/**
 * Bloom — the one effect that genuinely needs more than one shader pass (threshold
 * bright pixels -> blur them isotropically -> add them back over the original), so it
 * uses `renderMultiPass` instead of the single fragmentShader/uniformsFromParams path
 * every single-pass effect module uses. Renamed from this codebase's original
 * "starGlow" (Phase 1) once the true multi-ray Star Glow effect (starGlow.ts) was
 * built as its own distinct card — this is the plain non-directional bloom.
 */
export const bloomEffect: GLEffectModule<BloomEffect> = {
  type: "bloom",
  renderMultiPass(gl, source, ping, pong, params) {
    const dest = otherPingPongTarget(source, ping, pong);
    runBloomPipeline(gl, source, dest, params.threshold, params.intensity, (srcTex, destFbo, w, h) => {
      runPass(gl, getBlurProgram(gl), [{ name: "u_texture", texture: srcTex }], destFbo, w, h, {
        u_resolution: [w, h],
        u_radius: BLOOM_BLUR_RADIUS,
      });
    });
    return dest;
  },
};
