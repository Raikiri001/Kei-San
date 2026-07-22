import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { FrameDropEffect } from "@/store/types";

// Real MPEG-style macroblock corruption — distinct from glitch.ts's horizontal-band
// shift (this is 2D per-block, matching real video-codec block sizes). A per-block
// deterministic hash gate marks a subset as "corrupted", sampling from a
// hash-jittered offset block instead of their own true source (simulating a decoder
// holding stale block data), with an optional RGB split on corrupted blocks only.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_blockSize;
uniform float u_intensity;
uniform float u_colorShift;
in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 px = v_uv * u_resolution;
  vec2 block = floor(px / u_blockSize);
  float gate = hash(block);
  float corrupted = step(1.0 - u_intensity, gate);

  vec2 jitter = floor((vec2(hash(block + 1.0), hash(block + 2.0)) - 0.5) * 8.0);
  vec2 sampleBlock = mix(block, block + jitter, corrupted);
  vec2 sampleCenterPx = (sampleBlock + 0.5) * u_blockSize;
  vec2 sampleUv = clamp(sampleCenterPx / u_resolution, 0.0, 1.0);

  vec2 shift = vec2(u_colorShift / u_resolution.x, 0.0) * corrupted;
  float r = texture(u_texture, sampleUv + shift).r;
  vec2 centerSample = texture(u_texture, sampleUv).ga;
  float b = texture(u_texture, sampleUv - shift).b;
  fragColor = vec4(r, centerSample.x, b, centerSample.y);
}
`;

export const frameDropEffect: GLEffectModule<FrameDropEffect> = {
  type: "frameDrop",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_blockSize: params.blockSize,
      u_intensity: params.intensity,
      u_colorShift: params.colorShift,
    };
  },
};
