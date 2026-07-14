import { HISTORY_STORAGE_KEY, MAX_HISTORY_ENTRIES } from "@/constants/defaults";
import { generateThumbnail, generateThumbnailFromCanvas } from "@/canvas/exportEngine";
import { DOT_PITCH } from "@/canvas/halftone";
import { resolveDefaultMargin } from "@/canvas/edgeBlend";
import type { ImageElement, ProjectState, SavedDesign, TextElement } from "@/store/types";

/** Legacy (pre-multi-image / pre-Phase-3) shape a SavedDesign may have been persisted as. */
interface LegacySavedDesign extends Omit<SavedDesign, "images" | "texts"> {
  images?: ImageElement[];
  image?: ImageElement | null;
  texts?: TextElement[];
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
    zIndex: img.zIndex ?? cursor++,
  }));
  const texts = rawTexts.map((txt) => ({
    ...txt,
    zIndex: txt.zIndex ?? cursor++,
  }));

  return { ...raw, images, texts };
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
