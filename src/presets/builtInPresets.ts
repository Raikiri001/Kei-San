import type { ImageEffectPreset } from "@/presets/types";

/**
 * Curated, developer-authored bundles — not user-savable in this scope (see the plan's
 * rationale: this reads as curated content, matching a reference gallery, not a "save
 * my current stack" end-user feature). Grows alongside each later phase as more atomic
 * effects become available to compose from; a preset can only be authored once every
 * effect type it bundles actually exists.
 */
export const BUILT_IN_PRESETS: ImageEffectPreset[] = [
  {
    id: "halftone-press",
    name: "Halftone Press",
    entries: [
      { type: "halftone", enabled: true, mode: "ink", style: "circle", dotPitch: 8, inkColor: "#000000" },
      { type: "edgeBlend", enabled: true, margin: 60 },
    ],
  },
  {
    id: "chroma-split",
    name: "Chroma Split",
    entries: [
      { type: "rgbShift", enabled: true, mode: "linear", angle: 0, distance: 14, redAmount: 1, greenAmount: 0, blueAmount: -1, centerX: 0.5, centerY: 0.5, edgeFalloff: 0.6 },
    ],
  },
  // --- Phase 14: rebuilt from the now-complete basic-effect roster instead of a
  // single bespoke shader — see each single-shader curated look's own file for the
  // original (grunge.ts, vintagePrint.ts, mixedMedia.ts, thinPaper.ts, wetPaper.ts,
  // teleshopping.ts, xerox.ts, starGlow.ts) — untouched, still available as-is.
  {
    id: "grunge-redux",
    name: "Grunge",
    entries: [
      { type: "filmGrain", enabled: true, amount: 0.55, size: 2.5 },
      { type: "vignette", enabled: true, centerX: 0.5, centerY: 0.5, radiusX: 0.55, radiusY: 0.55, rotation: 0, feather: 0.35, amount: -0.45 },
      {
        type: "colorBalance",
        enabled: true,
        shadowCyanRed: -20,
        shadowMagentaGreen: 15,
        shadowYellowBlue: 0,
        midtoneCyanRed: -10,
        midtoneMagentaGreen: 8,
        midtoneYellowBlue: 0,
        highlightCyanRed: 0,
        highlightMagentaGreen: 0,
        highlightYellowBlue: 0,
      },
      { type: "contrast", enabled: true, brightness: -5, contrast: 30 },
    ],
  },
  {
    id: "vintage-print-redux",
    name: "Vintage Print",
    entries: [
      { type: "filmGrain", enabled: true, amount: 0.3, size: 3 },
      { type: "vignette", enabled: true, centerX: 0.5, centerY: 0.5, radiusX: 0.6, radiusY: 0.6, rotation: 0, feather: 0.35, amount: -0.3 },
      { type: "duotone", enabled: true, shadowColor: "#3a2415", highlightColor: "#f2e0c0" },
      { type: "contrast", enabled: true, brightness: 3, contrast: -15 },
    ],
  },
  {
    id: "mixed-media-redux",
    name: "Mixed Media",
    entries: [
      { type: "filmGrain", enabled: true, amount: 0.25, size: 2.5 },
      { type: "vignette", enabled: true, centerX: 0.5, centerY: 0.5, radiusX: 0.65, radiusY: 0.65, rotation: 0, feather: 0.4, amount: -0.15 },
      { type: "inkBleed", enabled: true, threshold: 0.12, amount: 3, softness: 0.15 },
      { type: "hueSaturation", enabled: true, hue: 0, saturation: -25, lightness: 0 },
    ],
  },
  {
    id: "thin-paper-print-redux",
    name: "Newsprint Print",
    entries: [
      { type: "filmGrain", enabled: true, amount: 0.15, size: 1.5 },
      { type: "contrast", enabled: true, brightness: 20, contrast: -30 },
      { type: "hueSaturation", enabled: true, hue: 0, saturation: -30, lightness: 0 },
    ],
  },
  {
    id: "wet-paper-redux",
    name: "Damp Ink",
    entries: [
      { type: "filmGrain", enabled: true, amount: 0.35, size: 4 },
      { type: "vignette", enabled: true, centerX: 0.5, centerY: 0.5, radiusX: 0.55, radiusY: 0.55, rotation: 0, feather: 0.3, amount: -0.5 },
      { type: "inkBleed", enabled: true, threshold: 0.08, amount: 7, softness: 0.25 },
      { type: "whiteBalance", enabled: true, temperature: 4500, tint: 5 },
      { type: "contrast", enabled: true, brightness: -18, contrast: 18 },
    ],
  },
  {
    id: "teleshopping-redux",
    name: "Teleshopping",
    entries: [
      { type: "halation", enabled: true, threshold: 0.55, radius: 14, tintColor: "#ffaa55", intensity: 1.0 },
      { type: "whiteBalance", enabled: true, temperature: 8500, tint: 0 },
      { type: "hueSaturation", enabled: true, hue: 0, saturation: 15, lightness: 0 },
      { type: "contrast", enabled: true, brightness: 10, contrast: -15 },
    ],
  },
  {
    id: "xerox-redux",
    name: "Xerox",
    entries: [
      { type: "noise", enabled: true, amount: 0.25, colored: false },
      { type: "threshold", enabled: true, threshold: 0.55, softness: 0.12 },
      { type: "contrast", enabled: true, brightness: 0, contrast: 25 },
    ],
  },
  {
    id: "light-streaks-redux",
    name: "Light Streaks",
    entries: [
      { type: "starGlow", enabled: true, threshold: 0.75, angle: 0, rayCount: 1, length: 140, intensity: 1.3 },
      { type: "rgbShift", enabled: true, mode: "linear", angle: 0, distance: 4, redAmount: 1, greenAmount: 0, blueAmount: -1, centerX: 0.5, centerY: 0.5, edgeFalloff: 0.6 },
    ],
  },
  // --- Phase 14: general preset library expansion (new combinations, not rebuilds) ---
  {
    id: "old-film-reel",
    name: "Old Film Reel",
    entries: [
      { type: "halation", enabled: true, threshold: 0.65, radius: 10, tintColor: "#ff6633", intensity: 0.6 },
      { type: "displacement", enabled: true, amount: 4, scale: 2.5 },
      { type: "vintageFilm", enabled: true, grainAmount: 0.35, vignette: 0.45, scratchDensity: 0.05, scratchIntensity: 0.35 },
    ],
  },
  {
    id: "riso-zine",
    name: "Riso Zine",
    entries: [
      { type: "paperScan", enabled: true, grainAmount: 0.15, vignette: 0.2 },
      { type: "stripe", enabled: true, bandWidth: 5, intensity: 0.15, irregularity: 0.6 },
      { type: "risograph", enabled: true, inkColorA: "#0057A6", inkColorB: "#FF48B0", splitPoint: 0.5, overlap: 0.15, dotPitch: 9, misregister: 2.5, grain: 0.05 },
    ],
  },
  {
    id: "broken-signal",
    name: "Broken Signal",
    entries: [
      { type: "noise", enabled: true, amount: 0.15, colored: true },
      { type: "frameDrop", enabled: true, blockSize: 14, intensity: 0.15, colorShift: 3 },
      { type: "vhs", enabled: true, scanlineIntensity: 0.35, colorBleed: 4, noise: 0.06 },
    ],
  },
  {
    id: "crystal-facet",
    name: "Crystal Facet",
    entries: [
      { type: "vignette", enabled: true, centerX: 0.5, centerY: 0.5, radiusX: 0.6, radiusY: 0.6, rotation: 0, feather: 0.4, amount: -0.2 },
      {
        type: "colorGrading",
        enabled: true,
        shadowHue: 210,
        shadowSaturation: 20,
        shadowLuminance: -5,
        midtoneHue: 0,
        midtoneSaturation: 0,
        midtoneLuminance: 0,
        highlightHue: 40,
        highlightSaturation: 25,
        highlightLuminance: 5,
      },
      { type: "cubify", enabled: true, cellSize: 28, jitter: 0.7 },
    ],
  },
  {
    id: "tilt-shift-miniature",
    name: "Tilt-Shift Miniature",
    entries: [
      { type: "contrast", enabled: true, brightness: 5, contrast: 20 },
      { type: "hueSaturation", enabled: true, hue: 0, saturation: 35, lightness: 0 },
      { type: "depthOfField", enabled: true, shape: "tiltShift", centerX: 0.5, centerY: 0.5, focusSize: 0.15, feather: 0.15, angle: 0, blurRadius: 14 },
    ],
  },
  {
    id: "thermal-scan",
    name: "Thermal Scan",
    entries: [
      { type: "crtScreen", enabled: true, curvature: 0.25, cellSize: 5, phosphorIntensity: 0.35, scanlineIntensity: 0.4 },
      { type: "thermal", enabled: true, blackPoint: 0, whitePoint: 1 },
    ],
  },
  // --- Effects overhaul, phase 1: showcases Modulation's blended X/Y analog wave
  // wobble (see modulation.ts) — a strong, content-reactive vintage-CRT-style
  // instability with visible per-channel RGB fringing.
  {
    id: "signal-bleed",
    name: "Signal Bleed",
    entries: [
      {
        type: "modulation",
        enabled: true,
        direction: "up",
        waveScale: 50,
        fmSensitivity: 0.35,
        waveAmplitude: 4,
        signalStrength: 90,
        lineSpacing: 3,
        lineWidth: 1.25,
        contrast: 60,
        midtones: 55,
        highlights: 55,
        luminanceThreshold: 30,
        blur: 1,
        invert: false,
        redChannel: true,
        greenChannel: true,
        blueChannel: true,
      },
    ],
  },
];
