import type { FontId } from "@/constants/fonts";

/** Halftone: renders as a dot/line/hatch screen instead of a plain image. */
export interface HalftoneEffect {
  type: "halftone";
  enabled: boolean;
  /** "color" fills each cell with its own averaged color; "ink" fills every cell with
   * `inkColor`. Ignored when `style` is "hatch" (that style always samples true color
   * per channel, matching a real CMYK print separation). */
  mode: "color" | "ink";
  /** "circle" is the classic dot screen; "line" collapses each cell to a horizontal
   * line screen; "hatch" renders each color channel as its own angled line screen at
   * a different angle (15°/75°/45° — classic print-separation angles chosen to avoid
   * the three patterns beating against each other into a moiré), absorbing what used
   * to be the standalone RGB Hatch effect. */
  style: "circle" | "line" | "hatch";
  /** Cell pitch in true canvas px — smaller = more/finer dots, lines, or hatch lines. */
  dotPitch: number;
  /** Fill color used when `mode` is "ink". */
  inkColor: string;
}

/** Chromatic-aberration-style per-channel offset. "linear" shifts every pixel by the
 * same vector (the classic look); "radial" instead shifts each pixel radially toward/
 * away from `centerX`/`centerY`, scaled up toward the frame edges by `edgeFalloff` —
 * matching how real lens chromatic aberration is strongest at the edges and near-zero
 * at the optical center, not uniform across the frame. Either way, each channel's own
 * `Amount` is a signed multiplier on the shared `distance` (negative reverses that
 * channel's direction, 0 holds it still, >1 exaggerates it) — the classic "red one way,
 * blue the other, green fixed" look is just the default redAmount=1/greenAmount=0/
 * blueAmount=-1, not baked in, so any per-channel split is reachable. */
export interface RgbShiftEffect {
  type: "rgbShift";
  enabled: boolean;
  mode: "linear" | "radial";
  /** Shift direction in degrees — "linear" mode only. */
  angle: number;
  /** Base shift distance, true canvas px. */
  distance: number;
  redAmount: number;
  greenAmount: number;
  blueAmount: number;
  /** "radial" mode only: normalized point the shift radiates from. */
  centerX: number;
  centerY: number;
  /** "radial" mode only: 0-1 — 0 keeps the shift uniform across the frame, 1 scales it
   * fully by distance from center (a true lens-CA edge falloff). */
  edgeFalloff: number;
}

/** Soft glow, sampled from the image's own edge color, blended into the background
 * behind it. Renders via its own dedicated pass (CSS box-shadow live, canvas
 * blur+fillRect at export) rather than through the shared GPU content pipeline — but
 * is otherwise a completely ordinary stackable effect: addable from the gallery,
 * repeatable, independently toggleable/deletable/reorderable, same as every other
 * type. Multiple enabled instances simply layer their glows on top of each other. */
export interface EdgeBlendEffect {
  type: "edgeBlend";
  enabled: boolean;
  /** Glow size in true canvas px. */
  margin: number;
}

/** Uniform, isotropic blur. */
export interface GaussianBlurEffect {
  type: "gaussianBlur";
  enabled: boolean;
  /** Blur radius in true canvas px. */
  radius: number;
}

/** Directional streak blur, simulating motion along one direction. */
export interface MotionBlurEffect {
  type: "motionBlur";
  enabled: boolean;
  /** Blur direction in degrees. */
  angle: number;
  /** Blur streak length in true canvas px. */
  distance: number;
}

/** Blurred double-exposure jitter, simulating a handheld-camera shake. */
export interface CameraShakeEffect {
  type: "cameraShake";
  enabled: boolean;
  /** Jitter radius in true canvas px. */
  intensity: number;
}

/** Bloom: bright highlights blurred isotropically and additively re-composited over
 * the image. Renamed from this codebase's original "starGlow" (Phase 1) once the
 * true multi-ray Star Glow effect below was built — this is the plain, non-directional
 * bloom look, matching the reference app's separate "Bloom" card. */
export interface BloomEffect {
  type: "bloom";
  enabled: boolean;
  /** Luminance (0-1) above which a pixel counts as "bright" and blooms. */
  threshold: number;
  /** How strongly the bloomed highlights are added back over the image. */
  intensity: number;
}

/** Bloom variant that stretches bright highlights into `rayCount` evenly-spaced
 * directional streaks radiating from a base angle — a real multi-ray star/diffraction
 * pattern (rayCount 4 = a classic 4-point star, 6 = a 6-point star, etc.), not just one
 * streak. Renamed from this codebase's original "lightStreaks" (Phase 1, single
 * direction only) once enriched to match the reference app's actual "Star Glow" card. */
export interface StarGlowEffect {
  type: "starGlow";
  enabled: boolean;
  /** Luminance (0-1) above which a pixel counts as "bright" and streaks. */
  threshold: number;
  /** Base ray direction in degrees — the other rays are spaced evenly around this. */
  angle: number;
  /** How many evenly-spaced rays radiate outward — 1 reproduces a single streak. */
  rayCount: number;
  /** Streak length in true canvas px. */
  length: number;
  /** How strongly the streaked highlights are added back over the image. */
  intensity: number;
}

/** Ordered (Bayer-matrix) color quantization — the classic retro "reduced palette
 * with a dot pattern instead of banding" look. */
export interface DitherEffect {
  type: "dither";
  enabled: boolean;
  /** Quantization levels per channel — lower = more posterized/dithered. */
  levels: number;
}

/** High-contrast black & white photocopier look, with scan grain. */
export interface XeroxEffect {
  type: "xerox";
  enabled: boolean;
  /** Luminance (0-1) midpoint of the black/white cutover. */
  threshold: number;
  /** How sharply the cutover happens — higher = crisper black/white edge. */
  contrast: number;
}

/** Chunky pixelation with an optional monochrome LCD-green tint, Nokia-3310-style. */
export interface PixelateEffect {
  type: "pixelate";
  enabled: boolean;
  /** Pixel block size in true canvas px. */
  pixelSize: number;
  monochrome: boolean;
}

/** Renders as a grid of monospace characters (luminance -> character-density ramp)
 * instead of continuous pixels. Structurally different from every other effect: it
 * needs real glyph rendering, which a GPU fragment shader can't do — so it runs as a
 * Canvas2D pass sampling the already-GPU-rendered content, always applied last
 * (after the GPU chain and after any Edge Blend halo), regardless of where it sits
 * in the user's own stack order. See canvas/asciiOverlay.ts. */
export interface AsciiEffect {
  type: "ascii";
  enabled: boolean;
  /** Character cell size in true canvas px — smaller = finer/denser ASCII grid. */
  cellSize: number;
  /** "mono" draws plain white characters on black; "color" tints each character by
   * that cell's own sampled average color. */
  colorMode: "mono" | "color";
}

/** Datamosh-style horizontal band displacement, with an optional per-band RGB split.
 * Band positions/offsets are seeded from a fixed spatial hash of screen position
 * (not per-frame-random), so they stay identical between the live preview and export
 * renders at a given resolution. */
export interface GlitchEffect {
  type: "glitch";
  enabled: boolean;
  /** How many horizontal bands the image is divided into. */
  bandCount: number;
  /** Max horizontal displacement, true canvas px. */
  intensity: number;
  /** Per-band R/B channel split distance, true canvas px. */
  colorShift: number;
  /** 0-1 — fraction of bands that glitch at all (was a fixed ~40% baked into the
   * hash gate; now a real control). */
  density: number;
  /** 0-1 — how unevenly band boundaries are spaced vs. perfectly even (0), so bands
   * read as torn/uneven rather than a mechanically regular grid. */
  bandJitter: number;
  /** Seeds every hash-driven random choice this effect makes (which bands glitch, by
   * how much, boundary jitter) — same seed always reproduces the same pattern, live
   * preview and export alike. Was previously a fixed, unexposed hash. */
  seed: number;
}

/** VHS tape look: scanlines, chromatic-aberration color bleed, and grain. */
export interface VhsEffect {
  type: "vhs";
  enabled: boolean;
  /** 0-1 strength of the horizontal scanline darkening. */
  scanlineIntensity: number;
  /** Chromatic-aberration color bleed distance, true canvas px. */
  colorBleed: number;
  /** 0-1 grain strength. */
  noise: number;
}

/** Analog broadcast look: horizontal chroma smear and alternating-row interlace flicker. */
export interface NtscEffect {
  type: "ntsc";
  enabled: boolean;
  /** Horizontal color-smear distance, true canvas px. */
  colorBleed: number;
  /** 0-1 strength of the alternating-row interlace darkening. */
  interlace: number;
}

/** Renders the image as a set of closely-packed scan lines on black, the way an
 * oscilloscope traces a signal — not a warp of the original full-color image. Each
 * line's deviation from its own straight baseline has two independent sources, not
 * one shared amplitude: `waveAmplitude` is a constant baseline ripple (so a flat,
 * empty region of the photo can be made genuinely flat by turning this down to 0,
 * instead of being stuck with whatever residual waviness a single shared amplitude
 * left behind), and `signalStrength` is how strongly the source image's own local
 * luminance additionally bends the line (bright regions bend/bunch lines toward them;
 * dark regions only show `waveAmplitude`'s own baseline ripple). Computed as a direct
 * O(1) estimate per pixel (no bounded neighbor search), so unlike an earlier version
 * of this effect, `signalStrength` has no artificial ceiling where it stops changing
 * anything. `direction` picks one of exactly 4 discrete cardinal options — no
 * continuous drag/angle — matching the reference line-scan tool's own "Modulated
 * Diffuse X/Y" style split: "up"/"down" render horizontal lines (each one traced
 * left-to-right, bending vertically), "left"/"right" render vertical lines (each
 * traced top-to-bottom, bending horizontally); the two options within each pair just
 * mirror which way the bend points. `contrast`/`midtones`/`highlights`/
 * `luminanceThreshold` (0-100, 50 is neutral on all four, matching the reference
 * tool's own convention) retone the luminance before it drives the lines, `blur`
 * softens it (fewer jittery per-pixel bends, more organic curves), and `invert` flips
 * it. `lineSpacing`/`lineWidth` control the rendered scan lines themselves. Each
 * channel is a plain on/off switch, matching effect.app's own Modulation panel (no
 * per-channel phase to hand-tune) — red/green/blue each sample a fixed, built-in
 * spatial offset from one another, so simply enabling more than one channel already
 * separates them into distinct color fringing by default, the way real per-channel
 * lens/sensor offset looks, without needing any manual tuning to avoid a flat
 * monochrome result. */
export interface ModulationEffect {
  type: "modulation";
  enabled: boolean;
  direction: "up" | "down" | "left" | "right";
  /** Carrier wave's spatial period, true canvas px. */
  waveScale: number;
  /** 0-1 — how strongly a slower carrier wave perturbs the wave's own phase. */
  fmSensitivity: number;
  /** Constant baseline ripple amplitude, true canvas px — turn to 0 for a dead-flat
   * baseline in empty/flat regions of the photo. */
  waveAmplitude: number;
  /** How strongly local luminance additionally bends each line, true canvas px. */
  signalStrength: number;
  /** Spacing between adjacent scan lines, true canvas px. */
  lineSpacing: number;
  /** Scan line stroke thickness, true canvas px. */
  lineWidth: number;
  /** 0-100, 50 neutral. */
  contrast: number;
  /** 0-100, 50 neutral. */
  midtones: number;
  /** 0-100, 50 neutral. */
  highlights: number;
  /** 0-100, 50 neutral — below-neutral gates in even dark regions, above-neutral
   * restricts bending to brighter regions only. */
  luminanceThreshold: number;
  /** True canvas px — softens the luminance sample so lines bend smoothly. */
  blur: number;
  invert: boolean;
  redChannel: boolean;
  greenChannel: boolean;
  blueChannel: boolean;
}

/** Close-up LED-matrix look: each cell rendered as separate R/G/B sub-pixel bars with
 * a dark gap between cells. */
export interface LedScreenEffect {
  type: "ledScreen";
  enabled: boolean;
  /** Cell size in true canvas px. */
  cellSize: number;
}

/** Threshold-bright pixels, then trail them out into `direction` as a chain of
 * dimmed, jittered, offset copies — matching effect.app's own "Motion Trails" card
 * (a black-background wavy-streak look, not a directional blur of the whole image
 * like Motion Blur). `direction` is a literal 2-axis vector (see XYPad.tsx), not an
 * angle — its two axes have genuinely different ranges (wide horizontal reach,
 * narrow vertical drift), matching the reference control exactly. `shake` is a
 * fixed per-iteration spatial jitter (hashed by iteration index, not time — this app
 * has no animation dimension, so "shake" reads as a wavy/wobbly trail shape rather
 * than motion), `shakeSpeed` controls how quickly that jitter varies along the
 * trail. `sourceDim` scales the untouched image before trails composite over it —
 * near 0 is what produces the reference's black background. */
export interface MotionTrailsEffect {
  type: "motionTrails";
  enabled: boolean;
  /** Luminance (0-1) above which a pixel counts as "bright" and trails. */
  threshold: number;
  /** 0-1 — softness of the threshold cutover (a hard step at 0). */
  knee: number;
  /** Pixel radius of a gaussian blur applied before thresholding — fuses adjacent
   * small bright spots (e.g. many individual highlights in a busy photo) into
   * fewer, larger streak sources so the result reads as one cohesive glow instead
   * of a comb of separate thin trails. 0 disables it. */
  preBlur: number;
  /** 0-1 — how much each successive trailed copy dims relative to the last. */
  dimming: number;
  /** Trail direction on the horizontal axis, in UI units (internally scaled up into
   * real px — see motionTrails.ts's DIRECTION_SCALE). */
  directionX: number;
  /** Trail direction on the vertical axis, in UI units, same scaling as directionX. */
  directionY: number;
  /** 0-1 — spatial jitter/wobble strength per trail step. */
  shake: number;
  /** How quickly the jitter varies along the trail — higher = wigglier. */
  shakeSpeed: number;
  /** How strongly the trails composite back over the dimmed source. */
  intensity: number;
  /** 0-1 — how much the untouched source image is dimmed before trails are added. */
  sourceDim: number;
}

/** Classic tone-curve grading: independent Master/Red/Green/Blue draggable point
 * curves (see CurveField.tsx), matching how Photoshop/Lightroom's own Curves panel
 * composes a master curve with per-channel ones — the master applies to every
 * channel first, then each channel's own curve applies on top of that. Each curve
 * always includes x=0 and x=1 and is sorted by x; the same monotone-cubic-sampled
 * LUT the editor draws is what the shader samples, so the widget never lies about
 * what the effect will do. */
export interface CurvesEffect {
  type: "curves";
  enabled: boolean;
  master: { x: number; y: number }[];
  red: { x: number; y: number }[];
  green: { x: number; y: number }[];
  blue: { x: number; y: number }[];
}

/** Photoshop's own Levels dialog: remap the input range [inputBlack, inputWhite] (0-255,
 * matching the real dialog's numbers) through a midtone gamma, then rescale into
 * [outputBlack, outputWhite]. Master/RGB-combined only — Curves (above) already covers
 * arbitrary per-channel tone mapping, so a duplicate per-channel Levels would be pure
 * redundant scope; Levels' own value is the fast 5-number black/white/gamma-point
 * workflow. Defaults (0/255/1.0/0/255) render as a true no-op. */
export interface LevelsEffect {
  type: "levels";
  enabled: boolean;
  inputBlack: number;
  inputWhite: number;
  gamma: number;
  outputBlack: number;
  outputWhite: number;
}

/** Photoshop's actual 3-control Exposure dialog — deliberately computed in true linear
 * light (see canvas/gl/effects/exposure.ts), unlike every other adjustment here which
 * operates directly on the encoded signal; that's genuine, documented Photoshop
 * behavior, not an invented distinction, and it's why Exposure reads as photographic
 * stops of light rather than a flat multiply. Defaults (0/0/1.0) are a no-op. */
export interface ExposureEffect {
  type: "exposure";
  enabled: boolean;
  /** Stops. */
  exposure: number;
  offset: number;
  gammaCorrection: number;
}

/** Photoshop's combined "Brightness/Contrast" dialog (kept as one effect, matching the
 * real tool). Brightness is a headroom-safe lerp toward white/black (never clips);
 * Contrast is the real sigmoidal-contrast algorithm (ImageMagick/GraphicsMagick's
 * published technique) with its closed-form algebraic inverse used for negative values
 * — see canvas/gl/effects/contrast.ts. Defaults (0/0) are a no-op. */
export interface ContrastEffect {
  type: "contrast";
  enabled: boolean;
  brightness: number;
  contrast: number;
}

/** White balance — temperature and tint together, since no real tool (Camera Raw,
 * Lightroom, Resolve) ever separates them. Implemented as a genuine Bradford
 * chromatic-adaptation transform (the same technique raw processors use), precomputed
 * as one 3x3 matrix on the CPU and applied in linear light on the GPU — not a "push R
 * and B" hack. See canvas/gl/effects/whiteBalance.ts. `temperature: 6500` (D65, sRGB's
 * own native white) and `tint: 0` together are a no-op. */
export interface WhiteBalanceEffect {
  type: "whiteBalance";
  enabled: boolean;
  /** Kelvin. */
  temperature: number;
  tint: number;
}

/** An exact RGB<->HSL round-trip (see canvas/gl/effects/hueSaturation.ts) — not the
 * "cheap" hue-rotation-matrix shortcut, which is only a linear approximation and
 * visibly distorts saturation/perceived lightness away from the true hue circle.
 * Defaults (0/0/0) are a no-op. */
export interface HueSaturationEffect {
  type: "hueSaturation";
  enabled: boolean;
  /** Degrees. */
  hue: number;
  saturation: number;
  lightness: number;
}

/** Photoshop's actual Color Balance tool — independent Cyan-Red/Magenta-Green/
 * Yellow-Blue pushes for Shadows/Midtones/Highlights, blended smoothly by luminance
 * via `toneZoneWeights` (see canvas/gl/toneZoneHelpers.ts) rather than hard zone
 * cutoffs. All-zero is a true no-op. */
export interface ColorBalanceEffect {
  type: "colorBalance";
  enabled: boolean;
  shadowCyanRed: number;
  shadowMagentaGreen: number;
  shadowYellowBlue: number;
  midtoneCyanRed: number;
  midtoneMagentaGreen: number;
  midtoneYellowBlue: number;
  highlightCyanRed: number;
  highlightMagentaGreen: number;
  highlightYellowBlue: number;
}

/** Photoshop's real Gradient Map — replaces each pixel's RGB with a user-authored
 * gradient (see GradientStopEditor.tsx) sampled at that pixel's luminance. Like every
 * color-replacing "look" effect in this app (Grunge, Vintage Print, etc.), this has
 * no true no-op default — its default (black->white, 2 stops, the editor's minimum)
 * instead renders as a plain grayscale. */
export interface GradientMapEffect {
  type: "gradientMap";
  enabled: boolean;
  stops: { id: string; position: number; color: string }[];
}

/** The classic 2-ink print technique — shadowColor and highlightColor linearly
 * interpolated by luminance. Gradient Map's simplest 2-stop case, kept as its own
 * effect because real tools separate "the classic fixed duotone" from "arbitrary
 * gradient map" as distinct, differently-scoped tools. */
export interface DuotoneEffect {
  type: "duotone";
  enabled: boolean;
  shadowColor: string;
  highlightColor: string;
}

/** Photoshop's Black & White adjustment's actual mechanism — per-channel weighted
 * contribution (not a fixed grayscale formula), so a user can replicate classic
 * darkroom color-filter B&W photography looks, plus an optional tint. Weights default
 * to Rec.709's luma coefficients as percentages (21/72/7) and are deliberately not
 * renormalized — matching genuine Photoshop behavior, where pushing the total above
 * or below 100% is an expected, real side effect. */
export interface MonochromeEffect {
  type: "monochrome";
  enabled: boolean;
  redWeight: number;
  greenWeight: number;
  blueWeight: number;
  tint: string;
}

/** A false-color thermal-camera look using the real, published "Ironbow" FLIR palette
 * (hardcoded — a curated look, not a user-editable gradient, matching how this app
 * treats other named curated looks). `blackPoint`/`whitePoint` pick which luminance
 * band maps across the full palette, like a mini Levels input range. */
export interface ThermalEffect {
  type: "thermal";
  enabled: boolean;
  blackPoint: number;
  whitePoint: number;
}

/** Photoshop's Channel Mixer, generalized as a raw 3x3 matrix + 3 offsets — a real
 * professional tool for custom channel mixing/cross-processing. Applied on the
 * encoded signal (a creative tool, not a physical one). Identity + zero offsets is a
 * true no-op. */
export interface ColorMatrixEffect {
  type: "colorMatrix";
  enabled: boolean;
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
  m20: number;
  m21: number;
  m22: number;
  offsetR: number;
  offsetG: number;
  offsetB: number;
}

/** Broadcast/camera-style per-channel gain, applied in true linear light (see
 * canvas/gl/effects/rgbGain.ts) — the same "proper vs cheap" distinction as Exposure:
 * gain is a physical light-scaling control, not a display-space multiply. (1,1,1) is
 * a true no-op. */
export interface RgbGainEffect {
  type: "rgbGain";
  enabled: boolean;
  gainR: number;
  gainG: number;
  gainB: number;
}

/** Lightroom/Camera Raw's real underlying mechanism for its HSL color-mixer panel —
 * three curves indexed by the pixel's OWN hue rather than by tone (hue->hue-shift,
 * hue->saturation-multiplier, hue->lightness-multiplier), reusing CurveField/
 * curveToLUT exactly as-is with the stored 0-1 y-axis reinterpreted at the shader
 * call site (see canvas/gl/effects/hueCurves.ts). Flat at y=0.5 on all three (= zero
 * shift, 1x multiplier, 1x multiplier) is a true no-op — a different default shape
 * than `IDENTITY_CURVE`'s diagonal, since these aren't tone curves. */
export interface HueCurvesEffect {
  type: "hueCurves";
  enabled: boolean;
  hueToHue: { x: number; y: number }[];
  hueToSaturation: { x: number; y: number }[];
  hueToLightness: { x: number; y: number }[];
}

/** The modern 3-way color-wheel tool (Lightroom Classic's Color Grading panel /
 * DaVinci Resolve's color wheels) — Shadows/Midtones/Highlights, each an independent
 * hue+saturation pick (see ColorWheelPad.tsx) plus its own luminance offset, blended
 * by `toneZoneWeights` like Color Balance. Distinct from Color Balance by using the
 * hue-wheel input model instead of CMY-axis sliders — real tools ship both as
 * genuinely different workflows. Every zone at saturation 0 / luminance 0 is a true
 * no-op regardless of hue angle. */
export interface ColorGradingEffect {
  type: "colorGrading";
  enabled: boolean;
  shadowHue: number;
  shadowSaturation: number;
  shadowLuminance: number;
  midtoneHue: number;
  midtoneSaturation: number;
  midtoneLuminance: number;
  highlightHue: number;
  highlightSaturation: number;
  highlightLuminance: number;
}

/** A disc/bokeh kernel — uniform weight within a radius (flat, not Gaussian Blur's
 * bell-curve falloff) — the real shape of out-of-focus lens blur, and why bright
 * points blur into "bokeh circles" instead of soft blobs. See
 * canvas/gl/effects/circularBlur.ts. `radius: 0` is a true no-op. */
export interface CircularBlurEffect {
  type: "circularBlur";
  enabled: boolean;
  radius: number;
}

/** Photoshop's classic Radial Blur "Spin" method — the same recursive-doubling
 * technique Motion Trails uses (see canvas/gl/effects/motionTrails.ts), but each
 * step rotates around a center instead of translating, and combines via a true
 * running average (`mix(.., .., 0.5)`) instead of `max()`, since this is a blur, not
 * a glow trail. `angle: 0` is a true no-op. */
export interface RadialBlurEffect {
  type: "radialBlur";
  enabled: boolean;
  centerX: number;
  centerY: number;
  /** Degrees — total rotational sweep. */
  angle: number;
}

/** Photoshop's classic Radial Blur "Zoom" method — the same recursive-doubling
 * technique as Radial Blur, this time scaling toward/away from a center each step
 * instead of rotating. `strength: 0` is a true no-op. */
export interface ZoomBlurEffect {
  type: "zoomBlur";
  enabled: boolean;
  centerX: number;
  centerY: number;
  /** 0-100 (%). */
  strength: number;
}

/** One bidirectional control: positive is a plain Gaussian blur; negative is genuine
 * Unsharp Masking (Photoshop's own real sharpening technique — blur the image, then
 * push each pixel away from its blurred version to amplify high-frequency detail),
 * not the "cheap" fixed 3x3 sharpen-kernel shortcut. See
 * canvas/gl/effects/blurSharp.ts. `amount: 0` is a true no-op. */
export interface BlurSharpEffect {
  type: "blurSharp";
  enabled: boolean;
  /** -100..100. */
  amount: number;
}

/** Photoshop Blur Gallery's two real focus-shape models (Iris: radial falloff from a
 * point; Tilt-Shift: falloff from a band/line) over a genuine variable-radius blur —
 * a blur-level chain (progressively-blurred versions of the whole image, blended per
 * pixel by a synthetic focus map), the real technique real-time engines use for
 * spatially-varying blur. See canvas/gl/effects/depthOfField.ts. `blurRadius: 0` is
 * a true no-op regardless of the other params. */
export interface DepthOfFieldEffect {
  type: "depthOfField";
  enabled: boolean;
  shape: "iris" | "tiltShift";
  centerX: number;
  centerY: number;
  /** 0-1 — radius (iris) or half-width (tiltShift) of the sharp region. */
  focusSize: number;
  /** 0-1 — softness of the sharp/blurred transition. */
  feather: number;
  /** Degrees — tilt-shift band orientation only, ignored for iris. */
  angle: number;
  blurRadius: number;
}

/** Classic Photoshop Twirl — pixels rotate around a center by an angle that falls
 * off with distance (real rotational-fluid distortion), edited via a plain center
 * drag on a live preview (see CircleRegionEditor.tsx, `showRotation={false}` since a
 * circle has no meaningful rotation of its own). `angle: 0` is a true no-op. */
export interface SwirlEffect {
  type: "swirl";
  enabled: boolean;
  centerX: number;
  centerY: number;
  /** Px. */
  radius: number;
  /** Degrees. */
  angle: number;
}

/** Photoshop's Pinch/Punch — a radial power-law warp anchored at the effect radius's
 * edge. See canvas/gl/effects/pinch.ts for the sign convention (positive strength
 * pinches/sucks inward, negative punches/bulges outward). `strength: 0` is a true
 * no-op. */
export interface PinchEffect {
  type: "pinch";
  enabled: boolean;
  centerX: number;
  centerY: number;
  /** Px. */
  radius: number;
  /** -100..100. */
  strength: number;
}

/** A genuine projective (homography) transform — real Photoshop-style Free
 * Transform corner-pinning, not a bilinear "keystone" approximation (which subtly
 * bows lines that should stay straight). The stored data model is the 4 corners
 * themselves (edited directly via QuadCornerEditor.tsx), order TL/TR/BR/BL,
 * normalized 0-1. See canvas/gl/effects/perspective.ts for the closed-form
 * unit-square-to-quadrilateral coefficient solve (Heckbert, 1989). The untouched
 * default `(0,0),(1,0),(1,1),(0,1)` — the plain unit square — is a true no-op. */
export interface PerspectiveEffect {
  type: "perspective";
  enabled: boolean;
  corners: { x: number; y: number }[];
}

/** Concentric-wave displacement from a center point (Photoshop's radial Ripple/Pond
 * ripple) — no animation dimension in this app, so this renders one static ripple
 * frame. See canvas/gl/effects/ripple.ts. `amplitude: 0` is a true no-op. */
export interface RippleEffect {
  type: "ripple";
  enabled: boolean;
  centerX: number;
  centerY: number;
  /** Px, 0-50. */
  amplitude: number;
  /** Px, 10-200. */
  wavelength: number;
}

/** The real directional-derivative emboss technique Photoshop's own Emboss filter is
 * built on (Angle/Height/Amount, matching those exact 3 controls) — sample twice
 * along the light direction, the difference approximates a directional derivative,
 * add a neutral-gray bias. Blended against the source by `amount`, so unlike
 * Photoshop's own Emboss (which has no "off" state) this gets a true no-op at
 * `amount: 0` — a deliberate, disclosed improvement, not a misrepresentation of the
 * classic filter. See canvas/gl/effects/emboss.ts. */
export interface EmbossEffect {
  type: "emboss";
  enabled: boolean;
  /** Degrees. */
  angle: number;
  /** Px, 1-10. */
  height: number;
  /** 0-100. */
  amount: number;
}

/** Photoshop's actual "Polar Coordinates" filter, both of its real modes — a genuine
 * coordinate-system conversion, so like Gradient Map/Duotone/Monochrome this
 * fundamentally has no no-op state (converting coordinate systems always changes the
 * image). See canvas/gl/effects/polarCoords.ts. */
export interface PolarCoordsEffect {
  type: "polarCoords";
  enabled: boolean;
  mode: "rectToPolar" | "polarToRect";
  centerX: number;
  centerY: number;
  /** Degrees — rotates where the wrap "seam" starts. */
  rotation: number;
}

/** The real draggable mesh warp (free-form deformation, Sederberg & Parry 1986) — a
 * 5x5 grid of control points (see MESH_GRID_SIZE in MeshWarpEditor.tsx), each
 * individually draggable, the image deforming via bilinear interpolation of the
 * surrounding 4 control points' displacement at every pixel. See
 * canvas/gl/effects/elasticGrid.ts. `points` are row-major, normalized fractions of
 * width/height (resolution-independent). All-zero is a true no-op. */
export interface ElasticGridEffect {
  type: "elasticGrid";
  enabled: boolean;
  points: { dx: number; dy: number }[];
}

/** Classic photographic edge-darkening (or lightening), Adobe's own +/- "Amount"
 * convention. Driven by the same CircleRegionEditor.tsx ellipse Mask/Swirl/Pinch/
 * Ripple already use — the ellipse is the vignette's inner "unaffected" boundary, and
 * radiusX/radiusY/rotation double as the classic "Roundness" control for free. See
 * canvas/gl/effects/vignette.ts. `amount: 0` is a true no-op. */
export interface VignetteEffect {
  type: "vignette";
  enabled: boolean;
  centerX: number;
  centerY: number;
  /** Fraction of min(image width, image height) — same convention as LayerMask.radius. */
  radiusX: number;
  radiusY: number;
  /** Degrees. */
  rotation: number;
  /** 0-1 — how far beyond the ellipse the fade extends. */
  feather: number;
  /** -1..1. Negative darkens toward black, positive lightens toward white. */
  amount: number;
}

/** The real Photoshop Threshold filter (hard luminance cutoff to pure black/white),
 * plus one disclosed, off-by-default enhancement (a soft edge) the classic filter
 * doesn't have — `softness: 0` reproduces the authentic hard cutoff exactly, matching
 * Emboss's own "improve on the classic, default to the classic" pattern. Like
 * Duotone/Gradient Map/Polar Coords this has no possible no-op state — converting to
 * pure B/W always changes the image. See canvas/gl/effects/threshold.ts. */
export interface ThresholdEffect {
  type: "threshold";
  enabled: boolean;
  /** 0-1 luminance cutoff. */
  threshold: number;
  /** 0-1, softness of the cutover (0 = a hard step). */
  softness: number;
}

/** Vertical (or rotated) fluted-glass refraction. The per-rib horizontal displacement
 * is the actual surface derivative of a half-cylinder lens profile
 * h(x)=sqrt(r²-x²) — dh/dx = -x/sqrt(r²-x²) — a real, physically-motivated refraction
 * proxy (steep right at a rib seam, ~0 at a rib center), not an ad hoc curve. See
 * canvas/gl/effects/reededGlass.ts. `strength: 0` is a true no-op. */
export interface ReededGlassEffect {
  type: "reededGlass";
  enabled: boolean;
  /** Px, width of one rib. */
  ribWidth: number;
  /** Px, 0-30. */
  strength: number;
  /** Degrees — rib orientation, 0 = vertical (the classic reeded-glass look). */
  angle: number;
}

/** Photoshop Crystallize's actual algorithm — jittered-grid Voronoi, single-tap-
 * per-cell sampling (matching halftone.ts/pixelate.ts's own single-tap-at-
 * representative-point convention). See canvas/gl/effects/cubify.ts. No possible
 * no-op state (cellification always changes the image, same category as
 * Duotone/Polar Coords) — `jitter: 0` still gives a meaningful plain-grid look. */
export interface CubifyEffect {
  type: "cubify";
  enabled: boolean;
  /** Px, cell size. */
  cellSize: number;
  /** 0-1 — 0 is a plain regular grid, 1 is full Voronoi jitter. */
  jitter: number;
}

/** A genuine affine transform (translate/scale/rotate/skew) applied to a layer's own
 * sampling coordinates — independent of the canvas element's own position, e.g. to
 * nudge/zoom/rotate just one stacked effect's content. Driven by TransformBoxEditor.tsx,
 * which mirrors this app's own element resize/rotate interaction
 * (useResizeDrag.ts/useRotateDrag.ts): corner drag = uniform scale, edge drag =
 * single-axis scale, a rotate handle with the same 15°-Shift-snap, and dragging the
 * box body = translate. Skew has no drag precedent anywhere in this codebase, so it
 * stays 2 plain sliders. See canvas/gl/effects/transform.ts. All-identity
 * (translate 0, scale 1, rotation 0, skew 0) is a true no-op. */
export interface TransformEffect {
  type: "transform";
  enabled: boolean;
  /** Fraction of image width/height. */
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  /** Degrees. */
  rotation: number;
  /** Degrees. */
  skewX: number;
  skewY: number;
}

/** A genuine 2-spot-color print separation (real riso printing physics), not a cheap
 * 2-color tint — each ink is its own halftone screen (reusing halftone.ts's exact
 * per-cell dot-radius technique) at its own classic print angle (15°/75°, hardcoded
 * the same way halftone.ts hardcodes its hatch angles), each with its own small
 * misregistration offset (real riso prints are never perfectly aligned), combined via
 * genuine multiplicative overprint so an overlap region shows a real third mixed
 * color. Luminance uses Rec.709 (matches duotone.ts — Risograph is conceptually a
 * 2-ink duotone). See canvas/gl/effects/risograph.ts. No possible no-op state (a
 * 2-ink halftone conversion always changes the image) — same category as Duotone. */
export interface RisographEffect {
  type: "risograph";
  enabled: boolean;
  inkColorA: string;
  inkColorB: string;
  /** 0-1 luminance split point between the two inks. */
  splitPoint: number;
  /** 0-1 — softness of the crossfade between the two inks' coverage. */
  overlap: number;
  /** Px, halftone screen cell size (shared by both inks). */
  dotPitch: number;
  /** Px magnitude of the fixed relative misregistration between the two inks. */
  misregister: number;
  /** 0-1 paper/ink grain amount. */
  grain: number;
}

/** Real inkjet/thermal print-head banding — each print pass leaves a slightly
 * different ink density, producing repeating horizontal bands whose intensity
 * varies irregularly pass-to-pass (a perfectly uniform sine would look too clean).
 * A per-band deterministic hash (same convention as GlitchEffect's per-band gate)
 * modulates the banding density. See canvas/gl/effects/stripe.ts. `intensity: 0` is
 * a true no-op. */
export interface StripeEffect {
  type: "stripe";
  enabled: boolean;
  /** Px. */
  bandWidth: number;
  /** 0-1. */
  intensity: number;
  /** 0-1 — how much per-band density varies vs. a perfectly uniform band. */
  irregularity: number;
}

/** Standalone per-pixel sensor/signal noise — flat and colored-or-mono, distinct
 * from Film Grain's luminance-dependent organic character. Reuses the same spatial
 * hash formula as xerox.ts/vhs.ts. See canvas/gl/effects/noise.ts. `amount: 0` is a
 * true no-op. */
export interface NoiseEffect {
  type: "noise";
  enabled: boolean;
  /** 0-1. */
  amount: number;
  /** Independent per-channel noise vs. one shared luminance value. */
  colored: boolean;
}

/** Real MPEG-style macroblock corruption — distinct from GlitchEffect's horizontal-
 * band shift (this is 2D per-block, matching real video-codec block sizes). A
 * per-block deterministic hash gate marks a subset as "corrupted", sampling from a
 * hash-jittered offset block instead of their own true source (simulating a decoder
 * holding stale block data), with an optional RGB split on corrupted blocks only.
 * See canvas/gl/effects/frameDrop.ts. `intensity: 0` is a true no-op. */
export interface FrameDropEffect {
  type: "frameDrop";
  enabled: boolean;
  /** Px. */
  blockSize: number;
  /** 0-1 — corruption likelihood. */
  intensity: number;
  /** Px — RGB split on corrupted blocks. */
  colorShift: number;
}

/** Real CRT display simulation (the physical screen's own optics — not tape/
 * broadcast artifacts, that's VhsEffect/NtscEffect's job): barrel-distorted screen
 * curvature, a phosphor/aperture-grille RGB sub-mask (same cell-center-sample-plus-
 * 3-way-vertical-submask technique as LedScreenEffect), and VHS's own scanline sine.
 * See canvas/gl/effects/crtScreen.ts. All-zero is a true no-op. */
export interface CrtScreenEffect {
  type: "crtScreen";
  enabled: boolean;
  /** 0-1 — barrel distortion amount. */
  curvature: number;
  /** Px — phosphor mask pitch. */
  cellSize: number;
  /** 0-1 — how visible the RGB sub-mask is. */
  phosphorIntensity: number;
  /** 0-1. */
  scanlineIntensity: number;
}

/** Real edge-aware feathering — ink diffusing into paper fibers at high-contrast
 * boundaries, staying sharp elsewhere — distinct from a plain uniform blur. A
 * directional-derivative edge magnitude (same two-tap technique EmbossEffect
 * already uses, combined both axes) gates a blend between the sharp sample and a
 * cheap small blur sample (same 5x5-tap single-pass technique bloom.ts's own
 * middle-pass blur uses). See canvas/gl/effects/inkBleed.ts. `amount: 0` is a true
 * no-op. */
export interface InkBleedEffect {
  type: "inkBleed";
  enabled: boolean;
  /** 0-1 — edge sensitivity. */
  threshold: number;
  /** 0-1 — blur radius/strength at bled edges. */
  amount: number;
  /** 0-1 — softness of the edge-to-bleed cutover. */
  softness: number;
}

/** Film-gate-weave simulation — a genuinely new primitive for this codebase:
 * coherent value-noise (bilinear-interpolated hash grid, the standard technique,
 * distinct from every other effect's flat white-noise hash) sampled at low spatial
 * frequency, producing a smooth large-scale organic warp rather than per-pixel
 * jitter. Matches this app's established "no animation dimension, one static frame"
 * convention (RippleEffect/ReededGlassEffect) — one static instant of gate-weave
 * misalignment, not a simulated wobble over time. See
 * canvas/gl/effects/displacement.ts. `amount: 0` is a true no-op. */
export interface DisplacementEffect {
  type: "displacement";
  enabled: boolean;
  /** Px, 0-15. */
  amount: number;
  /** Noise spatial frequency — low is a smoother/larger-scale warp. */
  scale: number;
}

/** Standalone luminance-dependent grain — the one genuinely new grain technique
 * this phase adds: visibility fades in highlights and is strongest in shadows/
 * midtones, matching real emulsion response (every existing grain — textureShared/
 * VhsEffect/XeroxEffect — is flat/brightness-independent, a deliberate contrast
 * with this one). See canvas/gl/effects/filmGrain.ts. `amount: 0` is a true no-op. */
export interface FilmGrainEffect {
  type: "filmGrain";
  enabled: boolean;
  /** 0-1. */
  amount: number;
  /** Px — grain cell size. */
  size: number;
}

/** Real photographic halation — light bouncing off a film's base layer and
 * re-exposing the emulsion from behind, characteristically red/orange without full
 * anti-halation backing. Built directly on bloomShared.ts's `runBloomPipeline`
 * (threshold -> middle-pass -> additive composite), supplying a custom middle pass
 * that blurs (Bloom's own cheap single-pass technique — a glow doesn't need
 * arbitrary-radius correctness) and tints the result warm before composite. See
 * canvas/gl/effects/halation.ts. `intensity: 0` is a true no-op. */
export interface HalationEffect {
  type: "halation";
  enabled: boolean;
  /** 0-1. */
  threshold: number;
  /** Px. */
  radius: number;
  tintColor: string;
  /** 0+. */
  intensity: number;
}

/** Shared shape for every "paper/texture" look below (Grunge, Vintage Print, Mixed
 * Media, Thin Paper, Wet Paper, Teleshopping) — all six render through the same
 * underlying grain+vignette+color-wash shader (see canvas/gl/effects/textureShared.ts),
 * differing only in their own fixed tint/contrast/saturation/brightness "recipe" and
 * default grain/vignette starting point; only grain and vignette are exposed as
 * user-adjustable per effect, matching this app's "a couple of adjustable knobs per
 * curated look" convention (e.g. Xerox's threshold+contrast). */
interface PaperTextureParams {
  enabled: boolean;
  /** Procedural grain strength, 0-1. */
  grainAmount: number;
  /** Radial corner-darkening strength, 0-1. */
  vignette: number;
}

/** Heavy noisy grain, cool purple tint, boosted contrast. */
export interface GrungeEffect extends PaperTextureParams {
  type: "grunge";
}

/** Warm sepia tint, faded/lowered contrast — a classic aged-photo look. */
export interface VintagePrintEffect extends PaperTextureParams {
  type: "vintagePrint";
}

/** Neutral paper-canvas texture with a light desaturating wash. */
export interface MixedMediaEffect extends PaperTextureParams {
  type: "mixedMedia";
}

/** High-key, low-contrast, washed-out newsprint look. */
export interface ThinPaperEffect extends PaperTextureParams {
  type: "thinPaper";
}

/** Dark, blotchy, cool-toned ink-bleed look. */
export interface WetPaperEffect extends PaperTextureParams {
  type: "wetPaper";
}

/** Soft warm glow with lifted brightness — a VHS-infomercial look. */
export interface TeleshoppingEffect extends PaperTextureParams {
  type: "teleshopping";
}

/** Warm/yellow scanner-light cast with gentle uneven-lighting vignette and light
 * grain — a scanned-document look. Same `PaperTextureParams` family as Grunge/
 * Vintage Print/etc (see textureShared.ts's `applyPaperTexture`), just a different
 * fixed tint/contrast/saturation/brightness recipe. */
export interface PaperScanEffect extends PaperTextureParams {
  type: "paperScan";
}

/** A curated film-stock black & white look — distinct from `MonochromeEffect`
 * (Photoshop's actual per-channel-weighted Black & White *adjustment*, a technical
 * tool). This is `saturation` fixed at 0 (true grayscale, not user-adjustable — the
 * entire point of this look) plus a punchy contrast recipe matching real
 * panchromatic B&W film's characteristic response. Same `PaperTextureParams` family
 * as Grunge/Paper Scan/etc. */
export interface BlackAndWhiteEffect extends PaperTextureParams {
  type: "blackAndWhite";
}

/** A well-preserved color-negative-film emulation — gentle warm highlight tint,
 * mild contrast, light grain, subtle vignette. The "clean" film-stock look,
 * contrasted with `VintageFilmEffect`'s degraded one. Same `PaperTextureParams`
 * family as Grunge/Paper Scan/etc. */
export interface ClassicFilmEffect extends PaperTextureParams {
  type: "classicFilm";
}

/** An aged/degraded film stock — heavier grain, faded cyan/magenta color-shift,
 * stronger vignette (the shared `PaperTextureParams` recipe), plus thin vertical
 * scratch streaks the shared primitive doesn't have: a sparse subset of columns get
 * a thin bright/dark streak, using the same per-column deterministic hash-gate
 * convention as `GlitchEffect`'s own per-band gate. Like every other
 * `PaperTextureParams` member this has no full no-op state — it's a curated look. */
export interface VintageFilmEffect extends PaperTextureParams {
  type: "vintageFilm";
  /** 0-1 — fraction of columns that get a scratch. */
  scratchDensity: number;
  /** 0-1 — scratch brightness/darkness strength. */
  scratchIntensity: number;
}

/** Sci-fi tracking-box overlay whose reticles mark real detected high-contrast
 * regions in the already-rendered image (a coarse per-cell local-contrast scan, not a
 * shader — needs getImageData, same structural timing as AsciiEffect: a Canvas2D pass
 * sampling the just-rendered content, always applied last, after ASCII if both are
 * enabled, via the same rotation-safe scratch-canvas detour at export). `density`
 * caps how many boxes are placed; `sensitivity` controls the contrast cutoff for what
 * counts as "interesting". The layer's own id only seeds stable tie-breaking between
 * equally-scored candidate regions, not primary placement — that's driven by the
 * image's real content. See canvas/blobTrackerOverlay.ts. */
export interface BlobTrackerEffect {
  type: "blobTracker";
  enabled: boolean;
  /** Max tracker boxes to place. */
  density: number;
  /** 0-1 — how low a contrast counts as "interesting"; higher finds more/subtler regions. */
  sensitivity: number;
  /** "single" fills every box with `color`; "random" gives each detected box its own
   * hue, deterministically hashed from the layer's seed + that box's index (see
   * canvas/blobTrackerOverlay.ts) — stable across re-renders, not truly random. */
  colorMode: "single" | "random";
  color: string;
}

/** Every effect that can appear as a repeatable, reorderable, deletable layer in an
 * image's `layers` stack — grows with each later phase. */
export type StackableEffect =
  | HalftoneEffect
  | RgbShiftEffect
  | EdgeBlendEffect
  | GaussianBlurEffect
  | MotionBlurEffect
  | CameraShakeEffect
  | BloomEffect
  | StarGlowEffect
  | DitherEffect
  | XeroxEffect
  | PixelateEffect
  | AsciiEffect
  | GlitchEffect
  | VhsEffect
  | NtscEffect
  | ModulationEffect
  | LedScreenEffect
  | MotionTrailsEffect
  | GrungeEffect
  | VintagePrintEffect
  | MixedMediaEffect
  | ThinPaperEffect
  | WetPaperEffect
  | TeleshoppingEffect
  | PaperScanEffect
  | BlackAndWhiteEffect
  | ClassicFilmEffect
  | VintageFilmEffect
  | BlobTrackerEffect
  | CurvesEffect
  | LevelsEffect
  | ExposureEffect
  | ContrastEffect
  | WhiteBalanceEffect
  | HueSaturationEffect
  | ColorBalanceEffect
  | GradientMapEffect
  | DuotoneEffect
  | MonochromeEffect
  | ThermalEffect
  | ColorMatrixEffect
  | RgbGainEffect
  | HueCurvesEffect
  | ColorGradingEffect
  | CircularBlurEffect
  | RadialBlurEffect
  | ZoomBlurEffect
  | BlurSharpEffect
  | DepthOfFieldEffect
  | SwirlEffect
  | PinchEffect
  | PerspectiveEffect
  | RippleEffect
  | EmbossEffect
  | PolarCoordsEffect
  | ElasticGridEffect
  | VignetteEffect
  | ThresholdEffect
  | ReededGlassEffect
  | CubifyEffect
  | TransformEffect
  | RisographEffect
  | StripeEffect
  | NoiseEffect
  | FrameDropEffect
  | CrtScreenEffect
  | InkBleedEffect
  | DisplacementEffect
  | FilmGrainEffect
  | HalationEffect;
export type StackableEffectType = StackableEffect["type"];

/** How a layer's own transformed output re-composites onto whatever came before it —
 * universal, present on every layer (not per-effect-type), matching effect.app's own
 * node model where every stack entry carries a blend mode + opacity regardless of what
 * it does. "normal" + opacity 1 (the default) reduces to plain replacement, so every
 * pre-Phase-5 effect renders pixel-identical until a user actually changes this. */
export type BlendMode = "normal" | "lighten" | "darken" | "multiply" | "screen" | "overlay" | "add" | "subtract" | "difference" | "exclusion";

export interface LayerBlend {
  blendMode: BlendMode;
  /** 0-1 — how much of the transformed result shows through over what came before. */
  opacity: number;
}

/** A soft-edged radial (optionally elliptical) region restricting where a layer's
 * effect applies — universal, present on every layer alongside LayerBlend. Disabled
 * (the default) applies the effect everywhere, same as before this existed. */
export interface LayerMask {
  enabled: boolean;
  /** 0-1, box-local, fraction of width/height respectively. */
  centerX: number;
  centerY: number;
  /** 0-1, normalized to min(width, height). */
  radius: number;
  /** 0-1, edge softness — 0 is a hard cutoff, 1 is maximally feathered. */
  falloff: number;
  /** Ellipse squash relative to a circle — 1 is circular, >1 stretches horizontally, <1 vertically. */
  aspectStretch: number;
  /** Degrees. */
  rotation: number;
  invert: boolean;
  /** Renders the mask's own weight (grayscale) instead of the effect — for tuning. */
  debug: boolean;
}

/** One instance of an atomic effect within `ImageElement.layers` — the same `type` can
 * appear any number of times (e.g. two independent Halftone layers with different
 * params), each with its own `id`, which is what makes them independently
 * toggleable/editable/deletable/reorderable rather than sharing one slot per type. */
export type EffectLayer = { kind: "effect"; id: string; blend: LayerBlend; mask: LayerMask } & StackableEffect;

/** A named bundle of effect layers added together in one click (see
 * ImageEffectPreset in presets/types.ts) — collapsible in the UI to reveal and
 * individually tune each child, and itself toggleable/deletable/reorderable as one
 * unit, same as a plain EffectLayer. The same preset can be added more than once;
 * each application gets its own group `id` and its own cloned `children`, fully
 * independent of any other instance of the same preset. */
export interface PresetGroupLayer {
  kind: "group";
  id: string;
  presetId: string;
  /** Snapshot of the preset's display name at the moment it was added — stays stable
   * even if the preset's own definition is renamed later. */
  name: string;
  enabled: boolean;
  /** UI-only: whether this group's children are currently shown in the Active Stack panel. */
  expanded: boolean;
  children: EffectLayer[];
}

/**
 * True branching compositing node: unlike every other layer (a single transform
 * wrapped in the universal blend/mask), Layer Mix has no transform of its own — it
 * renders two independent effect sub-chains (`branchA`/`branchB`, each starting from
 * the same input — the buffer state entering this node) and blends their two results
 * together via its own `blend`/`mask`. An empty `branchB` is a pass-through of that
 * same input, so "blend the processed result against the original" falls out as the
 * degenerate case for free. Capped at one level deep by design — a branch holds plain
 * EffectLayers only, never a nested group or another Layer Mix — to keep the
 * recursion (and the UI for editing it) bounded. See glRenderer.ts's `renderMixLayer`.
 */
export interface MixLayer {
  kind: "mix";
  id: string;
  enabled: boolean;
  /** UI-only: whether the two branches are currently shown in the Active Stack panel. */
  expanded: boolean;
  blend: LayerBlend;
  mask: LayerMask;
  branchA: EffectLayer[];
  branchB: EffectLayer[];
}

export type Layer = EffectLayer | PresetGroupLayer | MixLayer;

/** The subset of layer kinds that can appear in the flattened, render-ready content
 * list (see flattenEnabledEffectLayers in store/imageEffects.ts) — preset groups are
 * never part of this list themselves, only their flattened-in children are. */
export type ContentLayer = EffectLayer | MixLayer;

export interface ImageElement {
  id: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  /** Center-anchored, true canvas px */
  x: number;
  /** Center-anchored, true canvas px */
  y: number;
  /** The ordered, user-managed stack of effect/preset-group layers — see Layer's doc
   * comment. Empty by default; layers are added by clicking a card in the Effects/
   * Presets gallery, never pre-populated. */
  layers: Layer[];
  /** Clockwise rotation in degrees around the element's own center. Default 0. */
  rotation: number;
  /** Shared stacking order across images and texts — higher paints on top. */
  zIndex: number;
  /** Crop zoom (>=1) applied on top of the base squish-to-frame fit. 1 = no crop, whole image squished to fill displayWidth/displayHeight. Set via double-click crop mode. */
  cropZoom: number;
  /** Crop pan, each a fraction (-1..1) of the max pannable distance at the current cropZoom — not raw px, so it stays valid if the frame is later resized. */
  cropOffsetX: number;
  cropOffsetY: number;
  /** Overall element opacity/transparency, 0 (fully transparent) - 1 (fully opaque). */
  opacity: number;
  /** Blocks move/resize/rotate/delete while true; all other edits (style, crop, layer order) remain available. */
  locked: boolean;
}

export type TextOrientation = "horizontal" | "vertical";

/** Horizontal alignment of wrapped/multi-line content within the text box — no effect on vertical orientation. */
export type TextAlign = "left" | "center" | "right" | "justify";

export interface TextElement {
  id: string;
  content: string;
  fontFamily: FontId;
  fontSize: number;
  orientation: TextOrientation;
  align: TextAlign;
  color: string;
  /** Alpha (0-1) applied to the text's own fill color (and its glow, if on). */
  colorAlpha: number;
  /** Outer glow around the glyphs — a colored, blurred halo independent of the
   * fill color, off by default. */
  glow: boolean;
  glowColor: string;
  /** Glow blur radius, true canvas px. */
  glowSize: number;
  /** Center-anchored, true canvas px */
  x: number;
  /** Center-anchored, true canvas px */
  y: number;
  /** Explicit text-frame dimensions (true canvas px), set via the corner/edge
   * resize handles — a real textbox: content reflows/wraps to fit this width,
   * independent of fontSize (which only ever controls glyph size). Same
   * mechanism as an image's displayWidth/displayHeight. */
  boxWidth: number;
  boxHeight: number;
  /** Warp: a purely decorative glyph stretch (percentage-based, 1 = 100% = no
   * warp), layered on top of the properly-sized, properly-wrapping box above —
   * NOT a sizing mechanism itself, unlike the old scaleX/scaleY it replaces. */
  warpX: number;
  warpY: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Clockwise rotation in degrees around the element's own center. Default 0. */
  rotation: number;
  /** Shared stacking order across images and texts — higher paints on top. */
  zIndex: number;
  /** Blocks move/resize/rotate/delete while true; all other edits (style, layer order) remain available. */
  locked: boolean;
}

export type CanvasElement = ImageElement | TextElement;

export interface ProjectState {
  id: string;
  name: string;
  width: number;
  height: number;
  rows: number;
  cols: number;
  backgroundColor: string;
  /** Alpha (0-1) of the canvas background fill — 0 lets PNG export produce a
   * transparent background instead of a solid color. */
  backgroundAlpha: number;
  images: ImageElement[];
  texts: TextElement[];
  updatedAt: number;
}

export interface SavedDesign extends ProjectState {
  thumbnailDataUrl: string;
}

export type RadialMenuContext = "image" | "text" | "mixed";

export interface RadialMenuState {
  open: boolean;
  x: number;
  y: number;
  context: RadialMenuContext;
  targetIds: string[];
}
