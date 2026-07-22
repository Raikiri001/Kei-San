import { DOT_PITCH } from "@/canvas/gl/effects/halftone";
import { createId } from "@/utils/id";
import { IDENTITY_CURVE } from "@/components/EffectsDrawer/curveMath";
import type { EffectLayer, LayerBlend, LayerMask, MixLayer, ModulationEffect, StackableEffect, StackableEffectType } from "@/store/types";

const DEFAULT_EDGE_BLEND_MARGIN = 60;

/** Fresh default blend/mask for a brand-new layer — "normal"/opacity 1/mask disabled
 * renders identically to a layer with no blend/mask concept at all, so adding these
 * fields never changes anything until a user actually touches them. */
export function createDefaultBlend(): LayerBlend {
  return { blendMode: "normal", opacity: 1 };
}

export function createDefaultMask(): LayerMask {
  return { enabled: false, centerX: 0.5, centerY: 0.5, radius: 0.5, falloff: 0.3, aspectStretch: 1, rotation: 0, invert: false, debug: false };
}

/** Default params for a fresh instance of each stackable effect type — used both when
 * a gallery card adds a brand-new layer and (isolated to just that one type) when
 * rendering that card's own preview thumbnail. */
export function createDefaultEffectParams(type: StackableEffectType): StackableEffect {
  switch (type) {
    case "halftone":
      return { type: "halftone", enabled: true, mode: "color", style: "circle", dotPitch: DOT_PITCH, inkColor: "#000000" };
    case "rgbShift":
      return {
        type: "rgbShift",
        enabled: true,
        mode: "linear",
        angle: 0,
        distance: 8,
        redAmount: 1,
        greenAmount: 0,
        blueAmount: -1,
        centerX: 0.5,
        centerY: 0.5,
        edgeFalloff: 0.6,
      };
    case "edgeBlend":
      return { type: "edgeBlend", enabled: true, margin: DEFAULT_EDGE_BLEND_MARGIN };
    case "gaussianBlur":
      return { type: "gaussianBlur", enabled: true, radius: 10 };
    case "motionBlur":
      return { type: "motionBlur", enabled: true, angle: 0, distance: 30 };
    case "cameraShake":
      return { type: "cameraShake", enabled: true, intensity: 12 };
    case "bloom":
      return { type: "bloom", enabled: true, threshold: 0.7, intensity: 1 };
    case "starGlow":
      return { type: "starGlow", enabled: true, threshold: 0.7, angle: 0, rayCount: 4, length: 60, intensity: 1 };
    case "dither":
      return { type: "dither", enabled: true, levels: 4 };
    case "xerox":
      return { type: "xerox", enabled: true, threshold: 0.5, contrast: 3 };
    case "pixelate":
      return { type: "pixelate", enabled: true, pixelSize: 10, monochrome: true };
    case "ascii":
      return { type: "ascii", enabled: true, cellSize: 10, colorMode: "mono" };
    case "glitch":
      return { type: "glitch", enabled: true, bandCount: 20, intensity: 20, colorShift: 6, density: 0.4, bandJitter: 0, seed: 0 };
    case "vhs":
      return { type: "vhs", enabled: true, scanlineIntensity: 0.3, colorBleed: 3, noise: 0.08 };
    case "ntsc":
      return { type: "ntsc", enabled: true, colorBleed: 6, interlace: 0.4 };
    case "modulation":
      return {
        type: "modulation",
        enabled: true,
        direction: "up",
        waveScale: 60,
        fmSensitivity: 0.2,
        waveAmplitude: 3,
        signalStrength: 60,
        lineSpacing: 4,
        lineWidth: 1.5,
        contrast: 50,
        midtones: 50,
        highlights: 50,
        luminanceThreshold: 40,
        blur: 0,
        invert: false,
        redChannel: true,
        greenChannel: true,
        blueChannel: true,
      };
    case "ledScreen":
      return { type: "ledScreen", enabled: true, cellSize: 14 };
    case "motionTrails":
      return {
        type: "motionTrails",
        enabled: true,
        threshold: 0.6,
        knee: 0.2,
        preBlur: 4,
        dimming: 0.1,
        directionX: 3,
        directionY: -2,
        shake: 0.3,
        shakeSpeed: 3,
        intensity: 1.5,
        sourceDim: 0.05,
      };
    case "grunge":
      return { type: "grunge", enabled: true, grainAmount: 0.5, vignette: 0.5 };
    case "vintagePrint":
      return { type: "vintagePrint", enabled: true, grainAmount: 0.35, vignette: 0.4 };
    case "mixedMedia":
      return { type: "mixedMedia", enabled: true, grainAmount: 0.3, vignette: 0.25 };
    case "thinPaper":
      return { type: "thinPaper", enabled: true, grainAmount: 0.2, vignette: 0.15 };
    case "wetPaper":
      return { type: "wetPaper", enabled: true, grainAmount: 0.4, vignette: 0.45 };
    case "teleshopping":
      return { type: "teleshopping", enabled: true, grainAmount: 0.15, vignette: 0.2 };
    case "paperScan":
      return { type: "paperScan", enabled: true, grainAmount: 0.2, vignette: 0.35 };
    case "blackAndWhite":
      return { type: "blackAndWhite", enabled: true, grainAmount: 0.25, vignette: 0.2 };
    case "classicFilm":
      return { type: "classicFilm", enabled: true, grainAmount: 0.15, vignette: 0.15 };
    case "vintageFilm":
      return { type: "vintageFilm", enabled: true, grainAmount: 0.4, vignette: 0.5, scratchDensity: 0.06, scratchIntensity: 0.4 };
    case "blobTracker":
      return { type: "blobTracker", enabled: true, density: 5, sensitivity: 0.5, colorMode: "single", color: "#00ff66" };
    case "curves":
      return {
        type: "curves",
        enabled: true,
        master: IDENTITY_CURVE.map((p) => ({ ...p })),
        red: IDENTITY_CURVE.map((p) => ({ ...p })),
        green: IDENTITY_CURVE.map((p) => ({ ...p })),
        blue: IDENTITY_CURVE.map((p) => ({ ...p })),
      };
    case "levels":
      return { type: "levels", enabled: true, inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 };
    case "exposure":
      return { type: "exposure", enabled: true, exposure: 0, offset: 0, gammaCorrection: 1 };
    case "contrast":
      return { type: "contrast", enabled: true, brightness: 0, contrast: 0 };
    case "whiteBalance":
      return { type: "whiteBalance", enabled: true, temperature: 6500, tint: 0 };
    case "hueSaturation":
      return { type: "hueSaturation", enabled: true, hue: 0, saturation: 0, lightness: 0 };
    case "colorBalance":
      return {
        type: "colorBalance",
        enabled: true,
        shadowCyanRed: 0,
        shadowMagentaGreen: 0,
        shadowYellowBlue: 0,
        midtoneCyanRed: 0,
        midtoneMagentaGreen: 0,
        midtoneYellowBlue: 0,
        highlightCyanRed: 0,
        highlightMagentaGreen: 0,
        highlightYellowBlue: 0,
      };
    case "gradientMap":
      return {
        type: "gradientMap",
        enabled: true,
        stops: [
          { id: createId(), position: 0, color: "#000000" },
          { id: createId(), position: 1, color: "#ffffff" },
        ],
      };
    case "duotone":
      return { type: "duotone", enabled: true, shadowColor: "#000000", highlightColor: "#ffffff" };
    case "monochrome":
      return { type: "monochrome", enabled: true, redWeight: 21, greenWeight: 72, blueWeight: 7, tint: "#ffffff" };
    case "thermal":
      return { type: "thermal", enabled: true, blackPoint: 0, whitePoint: 1 };
    case "colorMatrix":
      return { type: "colorMatrix", enabled: true, m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0, m20: 0, m21: 0, m22: 1, offsetR: 0, offsetG: 0, offsetB: 0 };
    case "rgbGain":
      return { type: "rgbGain", enabled: true, gainR: 1, gainG: 1, gainB: 1 };
    case "hueCurves":
      return {
        type: "hueCurves",
        enabled: true,
        hueToHue: [
          { x: 0, y: 0.5 },
          { x: 1, y: 0.5 },
        ],
        hueToSaturation: [
          { x: 0, y: 0.5 },
          { x: 1, y: 0.5 },
        ],
        hueToLightness: [
          { x: 0, y: 0.5 },
          { x: 1, y: 0.5 },
        ],
      };
    case "colorGrading":
      return {
        type: "colorGrading",
        enabled: true,
        shadowHue: 0,
        shadowSaturation: 0,
        shadowLuminance: 0,
        midtoneHue: 0,
        midtoneSaturation: 0,
        midtoneLuminance: 0,
        highlightHue: 0,
        highlightSaturation: 0,
        highlightLuminance: 0,
      };
    case "circularBlur":
      return { type: "circularBlur", enabled: true, radius: 0 };
    case "radialBlur":
      return { type: "radialBlur", enabled: true, centerX: 0.5, centerY: 0.5, angle: 0 };
    case "zoomBlur":
      return { type: "zoomBlur", enabled: true, centerX: 0.5, centerY: 0.5, strength: 0 };
    case "blurSharp":
      return { type: "blurSharp", enabled: true, amount: 0 };
    case "depthOfField":
      return { type: "depthOfField", enabled: true, shape: "iris", centerX: 0.5, centerY: 0.5, focusSize: 0.3, feather: 0.2, angle: 0, blurRadius: 0 };
    case "swirl":
      return { type: "swirl", enabled: true, centerX: 0.5, centerY: 0.5, radius: 200, angle: 0 };
    case "pinch":
      return { type: "pinch", enabled: true, centerX: 0.5, centerY: 0.5, radius: 200, strength: 0 };
    case "perspective":
      return {
        type: "perspective",
        enabled: true,
        corners: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
      };
    case "ripple":
      return { type: "ripple", enabled: true, centerX: 0.5, centerY: 0.5, amplitude: 0, wavelength: 40 };
    case "emboss":
      return { type: "emboss", enabled: true, angle: 135, height: 3, amount: 0 };
    case "polarCoords":
      return { type: "polarCoords", enabled: true, mode: "rectToPolar", centerX: 0.5, centerY: 0.5, rotation: 0 };
    case "elasticGrid":
      return {
        type: "elasticGrid",
        enabled: true,
        points: Array.from({ length: 25 }, () => ({ dx: 0, dy: 0 })),
      };
    case "vignette":
      return { type: "vignette", enabled: true, centerX: 0.5, centerY: 0.5, radiusX: 0.6, radiusY: 0.6, rotation: 0, feather: 0.35, amount: 0 };
    case "threshold":
      return { type: "threshold", enabled: true, threshold: 0.5, softness: 0 };
    case "reededGlass":
      return { type: "reededGlass", enabled: true, ribWidth: 20, strength: 0, angle: 0 };
    case "cubify":
      return { type: "cubify", enabled: true, cellSize: 24, jitter: 0 };
    case "transform":
      return { type: "transform", enabled: true, translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 };
    case "risograph":
      return { type: "risograph", enabled: true, inkColorA: "#0057A6", inkColorB: "#FF48B0", splitPoint: 0.5, overlap: 0.15, dotPitch: 10, misregister: 1.5, grain: 0.04 };
    case "stripe":
      return { type: "stripe", enabled: true, bandWidth: 6, intensity: 0, irregularity: 0.5 };
    case "noise":
      return { type: "noise", enabled: true, amount: 0, colored: true };
    case "frameDrop":
      return { type: "frameDrop", enabled: true, blockSize: 16, intensity: 0, colorShift: 4 };
    case "crtScreen":
      return { type: "crtScreen", enabled: true, curvature: 0, cellSize: 6, phosphorIntensity: 0, scanlineIntensity: 0 };
    case "inkBleed":
      return { type: "inkBleed", enabled: true, threshold: 0.15, amount: 0, softness: 0.2 };
    case "displacement":
      return { type: "displacement", enabled: true, amount: 0, scale: 3 };
    case "filmGrain":
      return { type: "filmGrain", enabled: true, amount: 0, size: 2 };
    case "halation":
      return { type: "halation", enabled: true, threshold: 0.7, radius: 12, tintColor: "#ff5522", intensity: 0 };
  }
}

/** A fresh, independently-`id`'d layer — every "add to stack" action (gallery card
 * click, preset instantiation) goes through this rather than hand-building the shape. */
export function createEffectLayer(type: StackableEffectType): EffectLayer {
  return { kind: "effect", id: createId(), blend: createDefaultBlend(), mask: createDefaultMask(), ...createDefaultEffectParams(type) };
}

/** A fresh, independently-`id`'d Layer Mix node with both branches empty — every "add
 * Layer Mix" action goes through this. An empty branchB is deliberate, not a
 * placeholder to fill in: it's what makes "blend the processed result against the
 * original" the zero-effort default (see MixLayer's doc comment in store/types.ts). */
export function createMixLayer(): MixLayer {
  return { kind: "mix", id: createId(), enabled: true, expanded: true, blend: createDefaultBlend(), mask: createDefaultMask(), branchA: [], branchB: [] };
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.round(randomInRange(min, max));
}

/** Which effect types have a real "surprise me" implementation below — the effects
 * overhaul is being rolled out one effect at a time (see the plan), so most types have
 * none yet. LayerInspectorPanel's header Randomize button only renders when this is
 * true, rather than wiring a button that silently does nothing for every other effect. */
export function hasRandomizer(type: StackableEffectType): boolean {
  return type === "modulation" || type === "glitch";
}

// Matches every seed SliderField's own max in LayerSettingsFields.tsx (MOD_SEED_MAX,
// GLITCH_SEED_MAX, ...) — rolling a seed beyond what its own slider can display would
// leave the readout correct but the slider thumb visually pinned at max, unable to
// show where the rolled value actually landed.
const SEED_SLIDER_MAX = 9999;

/** Effect-type-aware "surprise me" — rerolls a curated subset of a layer's own params
 * within tasteful ranges (not just its seed), the way Lightroom/VSCO's own random
 * buttons work, rather than a flat re-seed. Returns a patch suitable for the same
 * `onUpdate` every other field in the inspector already calls. */
export function randomizeEffectParams(layer: StackableEffect): Record<string, unknown> {
  switch (layer.type) {
    case "modulation": {
      const directions: ModulationEffect["direction"][] = ["up", "down", "left", "right"];
      return {
        direction: directions[randomInt(0, directions.length - 1)],
        waveScale: randomInRange(15, 250),
        fmSensitivity: randomInRange(0, 0.8),
        waveAmplitude: randomInRange(0, 20),
        signalStrength: randomInRange(20, 200),
        lineSpacing: randomInRange(2, 14),
        lineWidth: randomInRange(0.75, 4),
        contrast: randomInRange(30, 80),
        midtones: randomInRange(30, 80),
        highlights: randomInRange(20, 80),
        luminanceThreshold: randomInRange(10, 60),
        blur: randomInRange(0, 10),
      };
    }
    case "glitch":
      return {
        bandCount: randomInt(6, 60),
        intensity: randomInRange(4, 60),
        colorShift: randomInRange(0, 18),
        density: randomInRange(0.15, 0.85),
        bandJitter: randomInRange(0, 0.8),
        seed: randomInt(0, SEED_SLIDER_MAX),
      };
    default:
      return {};
  }
}
