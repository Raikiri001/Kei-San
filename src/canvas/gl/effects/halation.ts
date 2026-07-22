import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { runPass } from "@/canvas/gl/runPass";
import { runBloomPipeline, otherPingPongTarget } from "@/canvas/gl/effects/bloomShared";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { HalationEffect } from "@/store/types";

function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Real photographic halation — light bouncing off a film's base layer and
// re-exposing the emulsion from behind, characteristically red/orange without full
// anti-halation backing. Same isotropic 5x5-tap blur technique bloom.ts's own
// middle pass already uses (a glow doesn't need arbitrary-radius correctness),
// plus a warm tint multiply before bloomShared's own additive composite.
const BLUR_TINT_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_radius;
uniform vec3 u_tintColor;
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
  vec4 blurred = sum / totalWeight;
  fragColor = vec4(blurred.rgb * u_tintColor, blurred.a);
}
`;

let blurTintProgram: CompiledProgram | null = null;
function getBlurTintProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!blurTintProgram) blurTintProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, BLUR_TINT_FRAGMENT_SHADER);
  return blurTintProgram;
}

export const halationEffect: GLEffectModule<HalationEffect> = {
  type: "halation",
  renderMultiPass(gl, source, ping, pong, params) {
    const dest = otherPingPongTarget(source, ping, pong);
    const tint = hexToRgb01(params.tintColor);
    runBloomPipeline(gl, source, dest, params.threshold, params.intensity, (srcTex, destFbo, w, h) => {
      runPass(gl, getBlurTintProgram(gl), [{ name: "u_texture", texture: srcTex }], destFbo, w, h, {
        u_resolution: [w, h],
        u_radius: params.radius,
        u_tintColor: tint,
      });
    });
    return dest;
  },
};
