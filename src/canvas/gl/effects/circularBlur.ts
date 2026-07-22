import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { CircularBlurEffect } from "@/store/types";

// A disc/bokeh kernel — uniform weight within a radius, not Gaussian Blur's soft
// bell-curve falloff — the real shape of out-of-focus lens blur (why bright points
// blur into "bokeh circles" rather than soft blobs). Concentric-ring sampling
// approximates a filled disc, but a FIXED sample count per ring (an earlier version
// of this file used 3 rings x 8 samples) leaves samples on outer rings far apart in
// actual pixels once the radius is large — e.g. at radius 40 an 8-sample outer ring
// has ~30px between samples, which shows up as a visible "spirograph"/ring artifact
// on detailed source images. This version instead sizes each ring's sample count to
// its own circumference, so adjacent samples stay ~4px apart on every ring
// regardless of radius — density-adaptive, not a blind increase in total taps.
const RING_COUNT = 6;
const TARGET_ARC_SPACING = 4;
const MAX_SAMPLES_PER_RING = 64;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_radius;
in vec2 v_uv;
out vec4 fragColor;

const float TAU = 6.28318530718;
const int RING_COUNT = ${RING_COUNT};
const float TARGET_ARC_SPACING = ${TARGET_ARC_SPACING.toFixed(1)};
const int MAX_SAMPLES_PER_RING = ${MAX_SAMPLES_PER_RING};

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec4 sum = texture(u_texture, v_uv);
  float totalWeight = 1.0;
  for (int ring = 1; ring <= RING_COUNT; ring++) {
    float ringRadius = (float(ring) / float(RING_COUNT)) * u_radius;
    int numSamples = clamp(int(ceil(TAU * ringRadius / TARGET_ARC_SPACING)), 4, MAX_SAMPLES_PER_RING);
    for (int i = 0; i < numSamples; i++) {
      float angle = (float(i) / float(numSamples)) * TAU;
      vec2 offset = vec2(cos(angle), sin(angle)) * ringRadius * texel;
      sum += texture(u_texture, v_uv + offset);
      totalWeight += 1.0;
    }
  }
  fragColor = sum / totalWeight;
}
`;

export const circularBlurEffect: GLEffectModule<CircularBlurEffect> = {
  type: "circularBlur",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return { u_resolution: [viewport.w, viewport.h], u_radius: params.radius };
  },
};
