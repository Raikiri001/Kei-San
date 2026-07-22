import { VERTEX_SHADER_SOURCE } from "@/canvas/gl/fullscreenQuad";
import { compileProgram, type CompiledProgram } from "@/canvas/gl/shaderProgram";
import { halftoneEffect } from "@/canvas/gl/effects/halftone";
import { rgbShiftEffect } from "@/canvas/gl/effects/rgbShift";
import { gaussianBlurEffect } from "@/canvas/gl/effects/gaussianBlur";
import { motionBlurEffect } from "@/canvas/gl/effects/motionBlur";
import { cameraShakeEffect } from "@/canvas/gl/effects/cameraShake";
import { bloomEffect } from "@/canvas/gl/effects/bloom";
import { starGlowEffect } from "@/canvas/gl/effects/starGlow";
import { ditherEffect } from "@/canvas/gl/effects/dither";
import { xeroxEffect } from "@/canvas/gl/effects/xerox";
import { pixelateEffect } from "@/canvas/gl/effects/pixelate";
import { glitchEffect } from "@/canvas/gl/effects/glitch";
import { vhsEffect } from "@/canvas/gl/effects/vhs";
import { ntscEffect } from "@/canvas/gl/effects/ntsc";
import { modulationEffect } from "@/canvas/gl/effects/modulation";
import { ledScreenEffect } from "@/canvas/gl/effects/ledScreen";
import { motionTrailsEffect } from "@/canvas/gl/effects/motionTrails";
import { grungeEffect } from "@/canvas/gl/effects/grunge";
import { vintagePrintEffect } from "@/canvas/gl/effects/vintagePrint";
import { mixedMediaEffect } from "@/canvas/gl/effects/mixedMedia";
import { thinPaperEffect } from "@/canvas/gl/effects/thinPaper";
import { wetPaperEffect } from "@/canvas/gl/effects/wetPaper";
import { teleshoppingEffect } from "@/canvas/gl/effects/teleshopping";
import { curvesEffect } from "@/canvas/gl/effects/curves";
import { levelsEffect } from "@/canvas/gl/effects/levels";
import { exposureEffect } from "@/canvas/gl/effects/exposure";
import { contrastEffect } from "@/canvas/gl/effects/contrast";
import { whiteBalanceEffect } from "@/canvas/gl/effects/whiteBalance";
import { hueSaturationEffect } from "@/canvas/gl/effects/hueSaturation";
import { colorBalanceEffect } from "@/canvas/gl/effects/colorBalance";
import { gradientMapEffect } from "@/canvas/gl/effects/gradientMap";
import { duotoneEffect } from "@/canvas/gl/effects/duotone";
import { monochromeEffect } from "@/canvas/gl/effects/monochrome";
import { thermalEffect } from "@/canvas/gl/effects/thermal";
import { colorMatrixEffect } from "@/canvas/gl/effects/colorMatrix";
import { rgbGainEffect } from "@/canvas/gl/effects/rgbGain";
import { hueCurvesEffect } from "@/canvas/gl/effects/hueCurves";
import { colorGradingEffect } from "@/canvas/gl/effects/colorGrading";
import { circularBlurEffect } from "@/canvas/gl/effects/circularBlur";
import { radialBlurEffect } from "@/canvas/gl/effects/radialBlur";
import { zoomBlurEffect } from "@/canvas/gl/effects/zoomBlur";
import { blurSharpEffect } from "@/canvas/gl/effects/blurSharp";
import { depthOfFieldEffect } from "@/canvas/gl/effects/depthOfField";
import { swirlEffect } from "@/canvas/gl/effects/swirl";
import { pinchEffect } from "@/canvas/gl/effects/pinch";
import { perspectiveEffect } from "@/canvas/gl/effects/perspective";
import { rippleEffect } from "@/canvas/gl/effects/ripple";
import { embossEffect } from "@/canvas/gl/effects/emboss";
import { polarCoordsEffect } from "@/canvas/gl/effects/polarCoords";
import { elasticGridEffect } from "@/canvas/gl/effects/elasticGrid";
import { vignetteEffect } from "@/canvas/gl/effects/vignette";
import { thresholdEffect } from "@/canvas/gl/effects/threshold";
import { reededGlassEffect } from "@/canvas/gl/effects/reededGlass";
import { cubifyEffect } from "@/canvas/gl/effects/cubify";
import { transformEffect } from "@/canvas/gl/effects/transform";
import { risographEffect } from "@/canvas/gl/effects/risograph";
import { stripeEffect } from "@/canvas/gl/effects/stripe";
import { noiseEffect } from "@/canvas/gl/effects/noise";
import { frameDropEffect } from "@/canvas/gl/effects/frameDrop";
import { crtScreenEffect } from "@/canvas/gl/effects/crtScreen";
import { inkBleedEffect } from "@/canvas/gl/effects/inkBleed";
import { paperScanEffect } from "@/canvas/gl/effects/paperScan";
import { blackAndWhiteEffect } from "@/canvas/gl/effects/blackAndWhite";
import { classicFilmEffect } from "@/canvas/gl/effects/classicFilm";
import { vintageFilmEffect } from "@/canvas/gl/effects/vintageFilm";
import { displacementEffect } from "@/canvas/gl/effects/displacement";
import { filmGrainEffect } from "@/canvas/gl/effects/filmGrain";
import { halationEffect } from "@/canvas/gl/effects/halation";
import type { GLEffectModule } from "@/canvas/gl/effectTypes";
import type { StackableEffectType } from "@/store/types";

// A registry of differently-parameterized effect modules has no common non-`any`
// element type — each module's own file stays fully typed against its own params.
// "ascii" and "blobTracker" are deliberately absent: they're Canvas2D post-processes
// (see canvas/asciiOverlay.ts and canvas/blobTrackerOverlay.ts), never dispatched
// through this GL registry at all.
const GL_EFFECT_MODULES: GLEffectModule<any>[] = [
  halftoneEffect,
  rgbShiftEffect,
  gaussianBlurEffect,
  motionBlurEffect,
  cameraShakeEffect,
  bloomEffect,
  starGlowEffect,
  ditherEffect,
  xeroxEffect,
  pixelateEffect,
  glitchEffect,
  vhsEffect,
  ntscEffect,
  modulationEffect,
  ledScreenEffect,
  motionTrailsEffect,
  grungeEffect,
  vintagePrintEffect,
  mixedMediaEffect,
  thinPaperEffect,
  wetPaperEffect,
  teleshoppingEffect,
  curvesEffect,
  levelsEffect,
  exposureEffect,
  contrastEffect,
  whiteBalanceEffect,
  hueSaturationEffect,
  colorBalanceEffect,
  gradientMapEffect,
  duotoneEffect,
  monochromeEffect,
  thermalEffect,
  colorMatrixEffect,
  rgbGainEffect,
  hueCurvesEffect,
  colorGradingEffect,
  circularBlurEffect,
  radialBlurEffect,
  zoomBlurEffect,
  blurSharpEffect,
  depthOfFieldEffect,
  swirlEffect,
  pinchEffect,
  perspectiveEffect,
  rippleEffect,
  embossEffect,
  polarCoordsEffect,
  elasticGridEffect,
  vignetteEffect,
  thresholdEffect,
  reededGlassEffect,
  cubifyEffect,
  transformEffect,
  risographEffect,
  stripeEffect,
  noiseEffect,
  frameDropEffect,
  crtScreenEffect,
  inkBleedEffect,
  paperScanEffect,
  blackAndWhiteEffect,
  classicFilmEffect,
  vintageFilmEffect,
  displacementEffect,
  filmGrainEffect,
  halationEffect,
];

const moduleByType = new Map<StackableEffectType, GLEffectModule<any>>(GL_EFFECT_MODULES.map((m) => [m.type, m]));

const programCache = new Map<StackableEffectType, CompiledProgram>();

export function getEffectModule(type: StackableEffectType): GLEffectModule<any> | undefined {
  return moduleByType.get(type);
}

/** Compiles an effect's fragment shader once, ever, and reuses the linked program across
 * every image, every gallery card, and every frame for the app's whole lifetime — never
 * recompiled per-image. */
export function getCompiledProgram(gl: WebGL2RenderingContext, type: StackableEffectType): CompiledProgram {
  const cached = programCache.get(type);
  if (cached) return cached;
  const module = moduleByType.get(type);
  if (!module) throw new Error(`No GL effect module registered for type "${type}"`);
  if (!module.fragmentShader) {
    throw new Error(`Effect module "${type}" has no fragmentShader — it should have set renderMultiPass instead of falling through to the single-pass path`);
  }
  const compiled = compileProgram(gl, VERTEX_SHADER_SOURCE, module.fragmentShader);
  programCache.set(type, compiled);
  return compiled;
}
