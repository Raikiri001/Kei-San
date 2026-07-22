import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { ModulationEffect } from "@/store/types";

// Renders the image as scan lines on black (like an oscilloscope trace), not a warp
// of the original. Each line's deviation has two independent sources — a constant
// baseline ripple (waveAmplitude) and additional luminance-driven bending
// (signalStrength) — computed as a direct O(1) estimate per pixel rather than a
// bounded neighbor search: an earlier version of this effect searched a small fixed
// window of candidate lines and had to clamp signalStrength to whatever that window
// could reach, so past a certain point turning it up further did nothing. Estimating
// the owning line's position directly (self-referential first pass, refined against
// that candidate's own true sample) has no such ceiling regardless of amplitude.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform int u_orientation;
uniform float u_directionSign;
uniform float u_waveScale;
uniform float u_fmSensitivity;
uniform float u_waveAmplitude;
uniform float u_signalStrength;
uniform float u_lineSpacing;
uniform float u_lineWidth;
uniform float u_contrastFactor;
uniform float u_midtoneGamma;
uniform float u_highlightFactor;
uniform float u_thresholdValue;
uniform float u_blur;
uniform int u_invert;
uniform int u_redOn;
uniform int u_greenOn;
uniform int u_blueOn;
in vec2 v_uv;
out vec4 fragColor;

const float TAU = 6.28318530718;
// A fixed, evenly-spaced (120 degrees apart) built-in spatial offset per channel —
// not user-facing — so simply enabling more than one channel already separates them
// into distinct color fringing by default, the way a real per-channel lens/sensor
// offset looks, matching effect.app's own plain on/off channel switches (no phase
// control to hand-tune to avoid an accidentally-flat monochrome result).
const float RED_PHASE = 0.0;
const float GREEN_PHASE = 2.09439510239;
const float BLUE_PHASE = 4.18879020479;

// Retones a raw sample into the 0-1 signal that drives line bending: invert, contrast
// (pivoted at 0.5), midtones (gamma), highlights (extra push concentrated above the
// midpoint), then a threshold gate.
float processedLuma(vec2 uv) {
  vec2 c = clamp(uv, vec2(0.001), vec2(0.999));
  vec3 rgb = texture(u_texture, c).rgb;
  float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
  if (u_invert == 1) lum = 1.0 - lum;
  lum = clamp((lum - 0.5) * u_contrastFactor + 0.5, 0.0, 1.0);
  lum = pow(lum, u_midtoneGamma);
  float hiWeight = smoothstep(0.4, 1.0, lum);
  lum = clamp(lum + u_highlightFactor * hiWeight * (1.0 - lum), 0.0, 1.0);
  lum = lum * smoothstep(u_thresholdValue - 0.1, u_thresholdValue + 0.1, lum);
  return lum;
}

// A 5-tap average along the line's own path — softens jittery per-pixel bending into
// an organic curve as blur increases; a single tap (the common case, blur = 0) costs
// nothing extra.
float blurredLuma(vec2 sampleUv, vec2 alongAxis, float blurPx) {
  if (blurPx <= 0.01) return processedLuma(sampleUv);
  vec2 step = alongAxis * blurPx / u_resolution;
  float sum = processedLuma(sampleUv) * 3.0;
  sum += processedLuma(sampleUv - step) + processedLuma(sampleUv + step);
  sum += processedLuma(sampleUv - step * 2.0) + processedLuma(sampleUv + step * 2.0);
  return sum / 7.0;
}

float channelCoverage(float phaseOffsetRad, float alongCoord, float acrossCoord, vec2 alongAxis, vec2 acrossAxis) {
  float baseFreq = TAU / max(u_waveScale, 1.0);
  float spacing = max(u_lineSpacing, 0.5);
  // A small constant per-channel spatial bias (relative to line spacing) means each
  // channel samples slightly different nearby image content — real chromatic-
  // fringing color separation tied to the photo's own edges, independent of
  // waveAmplitude/signalStrength (so it still separates colors even when both are
  // turned down for a calm, mostly-flat result).
  float channelBias = sin(phaseOffsetRad) * spacing * 0.6;

  float carrier = sin(alongCoord * baseFreq * 0.25);
  float wavePhase = alongCoord * baseFreq + u_fmSensitivity * carrier * TAU + phaseOffsetRad;
  float waveVal = sin(wavePhase);

  vec2 selfUv = (alongAxis * alongCoord + acrossAxis * (acrossCoord + channelBias)) / u_resolution;
  float selfLum = blurredLuma(selfUv, alongAxis, u_blur);
  float estimatedDeviation = (waveVal * u_waveAmplitude + selfLum * u_signalStrength) * u_directionSign;
  float i = floor((acrossCoord - estimatedDeviation) / spacing + 0.5);
  float baseAcross = i * spacing;

  vec2 trueUv = (alongAxis * alongCoord + acrossAxis * (baseAcross + channelBias)) / u_resolution;
  float trueLum = blurredLuma(trueUv, alongAxis, u_blur);
  float deviation = (waveVal * u_waveAmplitude + trueLum * u_signalStrength) * u_directionSign;
  float dist = abs(acrossCoord - (baseAcross + deviation));

  return 1.0 - smoothstep(0.0, max(u_lineWidth, 0.1), dist);
}

void main() {
  vec2 px = v_uv * u_resolution;
  vec2 alongAxis = u_orientation == 0 ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 acrossAxis = u_orientation == 0 ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
  float alongCoord = dot(px, alongAxis);
  float acrossCoord = dot(px, acrossAxis);

  vec4 original = texture(u_texture, v_uv);

  vec3 col = vec3(0.0);
  if (u_redOn == 1) col.r = channelCoverage(RED_PHASE, alongCoord, acrossCoord, alongAxis, acrossAxis);
  if (u_greenOn == 1) col.g = channelCoverage(GREEN_PHASE, alongCoord, acrossCoord, alongAxis, acrossAxis);
  if (u_blueOn == 1) col.b = channelCoverage(BLUE_PHASE, alongCoord, acrossCoord, alongAxis, acrossAxis);

  fragColor = vec4(col, original.a);
}
`;

const ORIENTATION: Record<ModulationEffect["direction"], number> = {
  up: 0,
  down: 0,
  left: 1,
  right: 1,
};

const DIRECTION_SIGN: Record<ModulationEffect["direction"], number> = {
  up: 1,
  down: -1,
  right: 1,
  left: -1,
};

export const modulationEffect: GLEffectModule<ModulationEffect> = {
  type: "modulation",
  fragmentShader: FRAGMENT_SHADER,
  uniformsFromParams(params, viewport) {
    return {
      u_resolution: [viewport.w, viewport.h],
      u_orientation: ORIENTATION[params.direction],
      u_directionSign: DIRECTION_SIGN[params.direction],
      u_waveScale: params.waveScale,
      u_fmSensitivity: params.fmSensitivity,
      u_waveAmplitude: params.waveAmplitude,
      u_signalStrength: params.signalStrength,
      u_lineSpacing: params.lineSpacing,
      u_lineWidth: params.lineWidth,
      u_contrastFactor: params.contrast / 50,
      u_midtoneGamma: Math.pow(2, (50 - params.midtones) / 50),
      u_highlightFactor: (params.highlights - 50) / 50,
      u_thresholdValue: (params.luminanceThreshold - 50) / 100,
      u_blur: params.blur,
      u_invert: params.invert ? 1 : 0,
      u_redOn: params.redChannel ? 1 : 0,
      u_greenOn: params.greenChannel ? 1 : 0,
      u_blueOn: params.blueChannel ? 1 : 0,
    };
  },
};
