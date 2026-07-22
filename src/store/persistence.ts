import {
  DEFAULT_GLOW_COLOR,
  DEFAULT_GLOW_SIZE,
  DEFAULT_TEXT_BOX_HEIGHT,
  DEFAULT_TEXT_BOX_WIDTH,
  HISTORY_STORAGE_KEY,
  MAX_HISTORY_ENTRIES,
} from "@/constants/defaults";
import { generateThumbnail, generateThumbnailFromCanvas } from "@/canvas/exportEngine";
import { resolveDefaultMargin } from "@/canvas/edgeBlend";
import { DOT_PITCH } from "@/canvas/gl/effects/halftone";
import { createDefaultBlend, createDefaultMask } from "@/canvas/gl/effectDefaults";
import { IDENTITY_CURVE } from "@/components/EffectsDrawer/curveMath";
import { createId } from "@/utils/id";
import { DEFAULT_FONT_ID, FONTS, type FontId } from "@/constants/fonts";
import type { EffectLayer, ImageElement, Layer, ProjectState, SavedDesign, StackableEffect, TextElement } from "@/store/types";

type LegacyTextElement = Omit<
  TextElement,
  | "boxWidth"
  | "boxHeight"
  | "warpX"
  | "warpY"
  | "bold"
  | "italic"
  | "underline"
  | "align"
  | "rotation"
  | "colorAlpha"
  | "glow"
  | "glowColor"
  | "glowSize"
  | "fontFamily"
  | "locked"
> &
  Partial<
    Pick<
      TextElement,
      | "boxWidth"
      | "boxHeight"
      | "warpX"
      | "warpY"
      | "bold"
      | "italic"
      | "underline"
      | "align"
      | "rotation"
      | "colorAlpha"
      | "glow"
      | "glowColor"
      | "glowSize"
      | "locked"
    >
  > & {
    // Pre-redesign field names — a saved text element may have either of these
    // (never both), carrying the same "how much to stretch" meaning warpX/Y
    // has now, which is why the migration below maps them across directly
    // instead of discarding them.
    scaleX?: number;
    scaleY?: number;
    // Raw legacy value — could be the old "sans"/"serif" FontFamilyKey, a
    // current FontId, or (if the save predates fonts entirely) undefined.
    // Widened to a bare string here since old JSON won't satisfy FontId.
    fontFamily?: string;
  };

/** The `effects` bag's per-entry shape from the Phase-0 schema (superseded by the
 * current repeatable-layer model) — kept narrow and local since that union no longer
 * exists in store/types.ts, only its migration path does. */
interface LegacyPhase0Effect {
  type: string;
  enabled: boolean;
  mode?: "color" | "ink";
  style?: "circle" | "line";
  dotPitch?: number;
  inkColor?: string;
  margin?: number;
  angle?: number;
  distance?: number;
}

type LegacyImageElement = Omit<ImageElement, "locked" | "layers"> &
  Partial<Pick<ImageElement, "locked" | "layers">> & {
    // Oldest (pre-effects-array) generation.
    circleMask?: boolean;
    halftoneMode?: "color" | "ink";
    halftoneDotPitch?: number;
    edgeBlend?: boolean;
    edgeBlendMargin?: number;
    // Phase-0 generation: a fixed one-per-type `effects` bag + `effectStackOrder` (this
    // generation had edge-blend as a singleton too, excluded from effectStackOrder,
    // which is why migrateImageLayers below checks for it separately from the order loop).
    effects?: LegacyPhase0Effect[];
    effectStackOrder?: string[];
  };

/** Legacy (pre-multi-image / pre-Phase-3 / pre-scaleX-scaleY / pre-alpha) shape a SavedDesign may have been persisted as. */
interface LegacySavedDesign extends Omit<SavedDesign, "images" | "texts" | "backgroundAlpha"> {
  images?: LegacyImageElement[];
  image?: LegacyImageElement | null;
  texts?: LegacyTextElement[];
  backgroundAlpha?: number;
}

/** Maps an old-schema fontFamily value forward. "sans"/"serif" were the only
 * two options pre-redesign and visually matched Inter/Noto Serif JP (the
 * first link in each's old fallback chain), so mapping to those exact ids
 * keeps reopened old designs looking identical instead of silently changing
 * them. Falls back to the default if the stored id no longer exists (e.g. a
 * font removed from the curated list in the future). */
function migrateFontFamily(raw: string | undefined): FontId {
  if (raw === "sans") return "inter";
  if (raw === "serif") return "noto-serif-jp";
  if (raw && FONTS.some((f) => f.id === raw)) return raw as FontId;
  return DEFAULT_FONT_ID;
}

/** Migrates one image's layer stack forward from whichever generation it was saved
 * under: the current schema passes through untouched; the Phase-0 `effects`/
 * `effectStackOrder` schema gets flattened into fresh, id-bearing layers (edge-blend
 * included, checked separately since that generation's `effectStackOrder` deliberately
 * excluded it); the oldest pre-effects-array schema's flat `circleMask`/`edgeBlend`/etc.
 * fields become individual layers if those toggles were ever on. */
function migrateImageLayers(img: LegacyImageElement): Layer[] {
  if (img.layers) return img.layers;

  if (img.effects) {
    const order = img.effectStackOrder ?? [];
    const layers: Layer[] = order
      .map((type) => img.effects!.find((e) => e.type === type))
      .filter((entry): entry is LegacyPhase0Effect => !!entry?.enabled)
      .map((entry) => ({
        kind: "effect" as const,
        id: createId(),
        blend: createDefaultBlend(),
        mask: createDefaultMask(),
        ...(entry as unknown as StackableEffect),
      }));

    const edgeBlendEntry = img.effects.find((e) => e.type === "edgeBlend");
    if (edgeBlendEntry?.enabled) {
      const defaultMargin = resolveDefaultMargin(img.displayWidth, img.displayHeight);
      layers.push({
        kind: "effect",
        id: createId(),
        blend: createDefaultBlend(),
        mask: createDefaultMask(),
        type: "edgeBlend",
        enabled: true,
        margin: edgeBlendEntry.margin ?? defaultMargin,
      });
    }
    return layers;
  }

  const layers: Layer[] = [];
  if (img.circleMask) {
    layers.push({
      kind: "effect",
      id: createId(),
      blend: createDefaultBlend(),
      mask: createDefaultMask(),
      type: "halftone",
      enabled: true,
      mode: img.halftoneMode ?? "color",
      style: "circle",
      dotPitch: img.halftoneDotPitch ?? DOT_PITCH,
      inkColor: "#000000",
    });
  }
  if (img.edgeBlend === true) {
    layers.push({
      kind: "effect",
      id: createId(),
      blend: createDefaultBlend(),
      mask: createDefaultMask(),
      type: "edgeBlend",
      enabled: true,
      margin: img.edgeBlendMargin ?? resolveDefaultMargin(img.displayWidth, img.displayHeight),
    });
  }
  return layers;
}

/** Migrates a single effect layer's `type`-specific shape forward across the Phase-7
 * taxonomy rename: the original isotropic-bloom "starGlow" (Phase 1) became "bloom"
 * (detected by the absence of `rayCount`, which only the current, real multi-ray
 * "starGlow" always has); the original single-direction "lightStreaks" became the
 * current multi-ray "starGlow" (given `rayCount: 1`, reproducing a single streak);
 * "rgbHatch" folded into Halftone as a `style: "hatch"` option; "modulation" gained
 * an entirely new param set (detected by the absence of `waveScale`); "blobTracker"
 * gained a `sensitivity` field. Old field values are ported across 1:1 where a direct
 * correspondence exists (e.g. rgbHatch's lineSpacing -> halftone's dotPitch);
 * everything else defaults, same tolerance this app has always had for a taxonomy
 * "redo" not being byte-identical to the retired version (see halftone's own
 * single-tap-vs-box-average note from Phase 0). */
function migrateEffectLayerParams(layer: EffectLayer): EffectLayer {
  const raw = layer as unknown as Record<string, unknown>;
  const common = { kind: layer.kind, id: layer.id, blend: layer.blend, mask: layer.mask, enabled: raw.enabled as boolean };

  switch (raw.type) {
    case "starGlow":
      if (raw.rayCount === undefined) {
        return { ...common, type: "bloom", threshold: raw.threshold, intensity: raw.intensity } as unknown as EffectLayer;
      }
      return layer;
    case "lightStreaks":
      return {
        ...common,
        type: "starGlow",
        threshold: raw.threshold,
        angle: raw.angle,
        rayCount: 1,
        length: raw.length,
        intensity: raw.intensity,
      } as unknown as EffectLayer;
    case "rgbHatch":
      return {
        ...common,
        type: "halftone",
        mode: "color",
        style: "hatch",
        dotPitch: raw.lineSpacing ?? DOT_PITCH,
        inkColor: "#000000",
      } as unknown as EffectLayer;
    case "modulation":
      if (raw.waveScale === undefined) {
        return {
          ...common,
          type: "modulation",
          waveScale: 200,
          fmSensitivity: 0,
          signalStrength: raw.amplitude ?? 12,
          direction: 0,
          redChannel: true,
          greenChannel: true,
          blueChannel: true,
        } as unknown as EffectLayer;
      }
      return layer;
    case "blobTracker":
      if (raw.sensitivity === undefined || raw.colorMode === undefined) {
        return { ...layer, sensitivity: raw.sensitivity ?? 0.5, colorMode: raw.colorMode ?? "single" } as unknown as EffectLayer;
      }
      return layer;
    case "motionTrails":
      if (raw.preBlur === undefined) {
        return { ...layer, preBlur: 0 } as unknown as EffectLayer;
      }
      return layer;
    case "curves":
      // Pre-per-channel Curves (this session's own Phase 6) had one shared `points`
      // array instead of independent master/red/green/blue curves.
      if (raw.master === undefined) {
        return {
          ...common,
          type: "curves",
          master: raw.points ?? IDENTITY_CURVE.map((p) => ({ ...p })),
          red: IDENTITY_CURVE.map((p) => ({ ...p })),
          green: IDENTITY_CURVE.map((p) => ({ ...p })),
          blue: IDENTITY_CURVE.map((p) => ({ ...p })),
        } as unknown as EffectLayer;
      }
      return layer;
    default:
      return layer;
  }
}

function ensureEffectLayerDefaults(layer: EffectLayer): EffectLayer {
  const migrated = migrateEffectLayerParams(layer);
  return { ...migrated, blend: migrated.blend ?? createDefaultBlend(), mask: migrated.mask ?? createDefaultMask() };
}

/** Back-fills `blend`/`mask` onto any layer loaded from a pre-Phase-5 save (top-level,
 * nested inside a preset group, or nested inside either of a Layer Mix's two
 * branches — no old save ever actually has a Mix layer, since it's new this phase,
 * but handling it here keeps this function total over every current Layer kind) —
 * every EffectLayer must have both, and normal/opacity-1/mask-disabled renders
 * identically to a layer with no blend/mask concept at all, so old saves never
 * visually change from this. Applied uniformly regardless of which generation
 * migrateImageLayers took the layers from. */
function ensureLayerDefaults(layers: Layer[]): Layer[] {
  return layers.map((layer) => {
    if (layer.kind === "effect") return ensureEffectLayerDefaults(layer);
    if (layer.kind === "group") return { ...layer, children: layer.children.map(ensureEffectLayerDefaults) };
    return { ...layer, branchA: layer.branchA.map(ensureEffectLayerDefaults), branchB: layer.branchB.map(ensureEffectLayerDefaults) };
  });
}

/** Migrates any older saved entry forward so old localStorage data never crashes the app. */
function normalizeDesign(raw: LegacySavedDesign): SavedDesign {
  const rawImages = Array.isArray(raw.images) ? raw.images : raw.image ? [raw.image] : [];
  const rawTexts = Array.isArray(raw.texts) ? raw.texts : [];

  // Legacy saves predate zIndex entirely — default-fill it in the same
  // "images (array order) then texts (array order)" sequence the app always
  // rendered in before layer ordering existed, so old designs don't visually
  // reshuffle the first time they're reopened.
  let cursor = 0;
  const images = rawImages.map((img) => {
    // Legacy fields from every prior generation are consumed by the migrate*
    // helpers above and must not survive onto the normalized ImageElement.
    const {
      circleMask: _circleMask,
      halftoneMode: _halftoneMode,
      halftoneDotPitch: _halftoneDotPitch,
      edgeBlendMargin: _edgeBlendMargin,
      effects: _effects,
      effectStackOrder: _effectStackOrder,
      edgeBlend: _edgeBlend,
      ...rest
    } = img;
    return {
      ...rest,
      layers: ensureLayerDefaults(migrateImageLayers(img)),
      rotation: img.rotation ?? 0,
      cropZoom: img.cropZoom ?? 1,
      cropOffsetX: img.cropOffsetX ?? 0,
      cropOffsetY: img.cropOffsetY ?? 0,
      opacity: img.opacity ?? 1,
      locked: img.locked ?? false,
      zIndex: img.zIndex ?? cursor++,
    };
  });
  const texts = rawTexts.map((txt) => {
    // Pre-redesign saves only ever had scaleX/scaleY (a stretch factor that
    // conflated box sizing with glyph distortion) — mapping those straight
    // into warpX/warpY preserves the same *visual* stretched look under the
    // new model (which separates "how big is the box" from "how warped are
    // the glyphs"), rather than silently discarding it. There's no way to
    // recover the old box's actual pixel size from saved data alone (that
    // required a live DOM measurement), so boxWidth/Height fall back to the
    // same flat default a brand-new text element gets.
    const { scaleX: _scaleX, scaleY: _scaleY, fontFamily, ...rest } = txt;
    return {
      ...rest,
      fontFamily: migrateFontFamily(fontFamily),
      boxWidth: txt.boxWidth ?? DEFAULT_TEXT_BOX_WIDTH,
      boxHeight: txt.boxHeight ?? DEFAULT_TEXT_BOX_HEIGHT,
      warpX: txt.warpX ?? txt.scaleX ?? 1,
      warpY: txt.warpY ?? txt.scaleY ?? 1,
      bold: txt.bold ?? false,
      italic: txt.italic ?? false,
      underline: txt.underline ?? false,
      align: txt.align ?? ("center" as const),
      rotation: txt.rotation ?? 0,
      colorAlpha: txt.colorAlpha ?? 1,
      glow: txt.glow ?? false,
      glowColor: txt.glowColor ?? DEFAULT_GLOW_COLOR,
      glowSize: txt.glowSize ?? DEFAULT_GLOW_SIZE,
      locked: txt.locked ?? false,
      zIndex: txt.zIndex ?? cursor++,
    };
  });

  return { ...raw, images, texts, backgroundAlpha: raw.backgroundAlpha ?? 1 };
}

export function loadDesignsHistory(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacySavedDesign[];
    return parsed.map(normalizeDesign);
  } catch {
    return [];
  }
}

function writeHistory(list: SavedDesign[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Could not persist design history (localStorage quota?)", err);
  }
}

/**
 * Upserts the current project into the history list, generating a thumbnail.
 * Pass an already-rendered `canvas` (e.g. from an export you just performed) to
 * avoid a redundant full-resolution re-render; omitted for standalone autosaves.
 */
export async function saveCurrentProject(project: ProjectState, canvas?: HTMLCanvasElement): Promise<void> {
  const thumbnailDataUrl = canvas ? generateThumbnailFromCanvas(canvas, project) : await generateThumbnail(project);
  const existing = loadDesignsHistory();
  const saved: SavedDesign = { ...project, thumbnailDataUrl };

  const withoutCurrent = existing.filter((d) => d.id !== project.id);
  const next = [saved, ...withoutCurrent]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_HISTORY_ENTRIES);

  writeHistory(next);
}

export function deleteDesign(id: string): void {
  writeHistory(loadDesignsHistory().filter((d) => d.id !== id));
}
