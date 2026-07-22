import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { runPass } from "@/canvas/gl/runPass";
import { runGaussianBlurPass } from "@/canvas/gl/gaussianBlurShared";
import { createPingPongPair, resizePingPongPair, type PingPongPair } from "@/canvas/gl/pingPong";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { DepthOfFieldEffect } from "@/store/types";

// Blends across a 3-level blur chain (sharp -> blurred once -> blurred twice) by a
// per-pixel focus amount `t` — the real technique real-time engines use for a
// genuine variable-radius blur without needing an expensive per-pixel variable-tap
// blur. `shape` picks which of Photoshop Blur Gallery's two real focus-shape models
// computes `t`: Iris (radial distance from a point) or Tilt-Shift (distance from a
// band/line at `u_angle`), both a smooth falloff over [focusSize, focusSize+feather].
const COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_level0;
uniform sampler2D u_level1;
uniform sampler2D u_level2;
uniform vec2 u_resolution;
uniform int u_shape;
uniform vec2 u_center;
uniform float u_focusSize;
uniform float u_feather;
uniform float u_angle;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 pixelOffset = (v_uv - u_center) * u_resolution;
  // Normalized by min(width,height) — the same convention CircleRegionEditor's own
  // radiusX/radiusY (and LayerMask.radius) already use, so the live-preview editor's
  // circle always matches the actual rendered result regardless of image aspect.
  float minDim = min(u_resolution.x, u_resolution.y);
  float dist;
  if (u_shape == 0) {
    dist = length(pixelOffset) / minDim;
  } else {
    float angleRad = radians(u_angle);
    vec2 normal = vec2(-sin(angleRad), cos(angleRad));
    dist = abs(dot(pixelOffset, normal)) / minDim;
  }
  float t = smoothstep(u_focusSize, u_focusSize + max(u_feather, 0.001), dist) * 2.0;

  vec4 level0 = texture(u_level0, v_uv);
  vec4 level1 = texture(u_level1, v_uv);
  vec4 level2 = texture(u_level2, v_uv);
  vec3 result = t <= 1.0 ? mix(level0.rgb, level1.rgb, t) : mix(level1.rgb, level2.rgb, t - 1.0);
  fragColor = vec4(result, level0.a);
}
`;

let compositeProgram: CompiledProgram | null = null;
let scratchPair: PingPongPair | null = null;

function getCompositeProgram(gl: WebGL2RenderingContext): CompiledProgram {
  if (!compositeProgram) compositeProgram = compileProgram(gl, VERTEX_SHADER_SOURCE, COMPOSITE_FRAGMENT_SHADER);
  return compositeProgram;
}

/** A private scratch pair this effect owns, holding the two finished blur levels —
 * the given `source`/`ping`/`pong` triple already gets fully claimed by level0
 * (source, must stay untouched for the composite), `ping` (the separable blur's own
 * ephemeral horizontal-pass temp, reused for both levels), and `pong` (the final
 * composite destination), leaving no free buffer to also hold both retained blur
 * levels. Same precedent as bloomShared.ts's own private pair. */
function getScratchPair(gl: WebGL2RenderingContext, w: number, h: number): PingPongPair {
  scratchPair = scratchPair ? resizePingPongPair(gl, scratchPair, w, h) : createPingPongPair(gl, w, h);
  return scratchPair;
}

export const depthOfFieldEffect: GLEffectModule<DepthOfFieldEffect> = {
  type: "depthOfField",
  renderMultiPass(gl, source, ping, pong, params) {
    const w = source.width;
    const h = source.height;
    const scratch = getScratchPair(gl, w, h);

    // ping is reused as the separable blur's ephemeral horizontal-pass temp for
    // BOTH levels — safe because each reuse only happens after the prior temp
    // content has already been consumed by that level's own vertical pass.
    runGaussianBlurPass(gl, source.texture, ping.fbo, w, h, params.blurRadius, [1, 0]);
    runGaussianBlurPass(gl, ping.texture, scratch.a.fbo, w, h, params.blurRadius, [0, 1]);
    runGaussianBlurPass(gl, scratch.a.texture, ping.fbo, w, h, params.blurRadius, [1, 0]);
    runGaussianBlurPass(gl, ping.texture, scratch.b.fbo, w, h, params.blurRadius, [0, 1]);

    runPass(
      gl,
      getCompositeProgram(gl),
      [
        { name: "u_level0", texture: source.texture },
        { name: "u_level1", texture: scratch.a.texture },
        { name: "u_level2", texture: scratch.b.texture },
      ],
      pong.fbo,
      w,
      h,
      {
        u_resolution: [w, h],
        u_shape: params.shape === "tiltShift" ? 1 : 0,
        u_center: [params.centerX, params.centerY],
        u_focusSize: params.focusSize,
        u_feather: params.feather,
        u_angle: params.angle,
      },
    );
    return pong;
  },
};
