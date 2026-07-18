import {
  DEFAULT_GLOW_COLOR,
  DEFAULT_GLOW_SIZE,
  DEFAULT_TEXT_BOX_HEIGHT,
  DEFAULT_TEXT_BOX_WIDTH,
  HISTORY_STORAGE_KEY,
  MAX_HISTORY_ENTRIES,
} from "@/constants/defaults";
import { generateThumbnail, generateThumbnailFromCanvas } from "@/canvas/exportEngine";
import { DOT_PITCH } from "@/canvas/halftone";
import { resolveDefaultMargin } from "@/canvas/edgeBlend";
import type { ImageElement, ProjectState, SavedDesign, TextElement } from "@/store/types";

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
    >
  > & {
    // Pre-redesign field names — a saved text element may have either of these
    // (never both), carrying the same "how much to stretch" meaning warpX/Y
    // has now, which is why the migration below maps them across directly
    // instead of discarding them.
    scaleX?: number;
    scaleY?: number;
  };

/** Legacy (pre-multi-image / pre-Phase-3 / pre-scaleX-scaleY / pre-alpha) shape a SavedDesign may have been persisted as. */
interface LegacySavedDesign extends Omit<SavedDesign, "images" | "texts" | "backgroundAlpha"> {
  images?: ImageElement[];
  image?: ImageElement | null;
  texts?: LegacyTextElement[];
  backgroundAlpha?: number;
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
  const images = rawImages.map((img) => ({
    ...img,
    halftoneMode: img.halftoneMode ?? ("color" as const),
    halftoneDotPitch: img.halftoneDotPitch ?? DOT_PITCH,
    edgeBlend: img.edgeBlend ?? false,
    edgeBlendMargin: img.edgeBlendMargin ?? resolveDefaultMargin(img.displayWidth, img.displayHeight),
    rotation: img.rotation ?? 0,
    cropZoom: img.cropZoom ?? 1,
    cropOffsetX: img.cropOffsetX ?? 0,
    cropOffsetY: img.cropOffsetY ?? 0,
    opacity: img.opacity ?? 1,
    zIndex: img.zIndex ?? cursor++,
  }));
  const texts = rawTexts.map((txt) => {
    // Pre-redesign saves only ever had scaleX/scaleY (a stretch factor that
    // conflated box sizing with glyph distortion) — mapping those straight
    // into warpX/warpY preserves the same *visual* stretched look under the
    // new model (which separates "how big is the box" from "how warped are
    // the glyphs"), rather than silently discarding it. There's no way to
    // recover the old box's actual pixel size from saved data alone (that
    // required a live DOM measurement), so boxWidth/Height fall back to the
    // same flat default a brand-new text element gets.
    const { scaleX: _scaleX, scaleY: _scaleY, ...rest } = txt;
    return {
      ...rest,
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
