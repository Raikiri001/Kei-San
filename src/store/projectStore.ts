import { create } from "zustand";
import { useUIStore } from "@/store/uiStore";
import { createId } from "@/utils/id";
import { DEFAULT_FONT_ID, DEFAULT_FONT_SIZE } from "@/constants/fonts";
import { DOT_PITCH } from "@/canvas/halftone";
import { resolveDefaultMargin } from "@/canvas/edgeBlend";
import { computeAutoLayout } from "@/utils/autoLayout";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_COLS,
  DEFAULT_GLOW_COLOR,
  DEFAULT_GLOW_SIZE,
  DEFAULT_HEIGHT,
  DEFAULT_ROWS,
  DEFAULT_TEXT_BOX_HEIGHT,
  DEFAULT_TEXT_BOX_WIDTH,
  DEFAULT_WIDTH,
} from "@/constants/defaults";
import type { ImageElement, ProjectState, TextElement } from "@/store/types";

function createBaselineProject(): ProjectState {
  return {
    id: createId(),
    name: "",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    rows: DEFAULT_ROWS,
    cols: DEFAULT_COLS,
    backgroundColor: DEFAULT_BACKGROUND,
    backgroundAlpha: 1,
    images: [],
    texts: [],
    updatedAt: Date.now(),
  };
}

type NewImageInput = Omit<
  ImageElement,
  | "id"
  | "x"
  | "y"
  | "circleMask"
  | "halftoneMode"
  | "halftoneDotPitch"
  | "edgeBlend"
  | "edgeBlendMargin"
  | "rotation"
  | "zIndex"
  | "cropZoom"
  | "cropOffsetX"
  | "cropOffsetY"
  | "opacity"
  | "locked"
> &
  Partial<
    Pick<
      ImageElement,
      | "x"
      | "y"
      | "circleMask"
      | "halftoneMode"
      | "halftoneDotPitch"
      | "edgeBlend"
      | "edgeBlendMargin"
      | "rotation"
      | "cropZoom"
      | "cropOffsetX"
      | "cropOffsetY"
      | "opacity"
      | "locked"
    >
  >;

interface ProjectStore {
  project: ProjectState;
  setName: (name: string) => void;
  setDimensions: (width: number, height: number) => void;
  setGrid: (cols: number, rows: number) => void;
  setBackgroundColor: (color: string) => void;
  setBackgroundAlpha: (alpha: number) => void;
  addImage: (image: NewImageInput) => string;
  updateImage: (id: string, patch: Partial<ImageElement>) => void;
  updateManyImages: (ids: string[], patch: Partial<ImageElement>) => void;
  deleteImage: (id: string) => void;
  addText: (partial?: Partial<TextElement>) => string;
  updateText: (id: string, patch: Partial<TextElement>) => void;
  updateManyTexts: (ids: string[], patch: Partial<TextElement>) => void;
  deleteText: (id: string) => void;
  deleteMany: (ids: string[]) => void;
  bringToFront: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  sendToBack: (id: string) => void;
  bringToFrontMany: (ids: string[]) => void;
  bringForwardMany: (ids: string[]) => void;
  sendBackwardMany: (ids: string[]) => void;
  sendToBackMany: (ids: string[]) => void;
  /** Applies the same raw (already-snapped) delta to every listed element's x/y —
   * used by group drag so the whole selection keeps its relative spacing exactly,
   * rather than each element independently re-snapping to its own nearest node. */
  moveElementsBy: (imageIds: string[], textIds: string[], dx: number, dy: number) => void;
  /** Tiles every image evenly across the canvas (1 -> full canvas, 2 -> halves, etc). */
  autoLayoutImages: () => void;
  loadProject: (project: ProjectState) => void;
  resetToNewDesign: () => void;
}

/** Every in-place edit marks the project dirty; loadProject/resetToNewDesign mark it clean instead. */
function touchDirty() {
  useUIStore.getState().markDirty();
}

function nextZIndex(project: ProjectState): number {
  let max = -1;
  for (const img of project.images) max = Math.max(max, img.zIndex);
  for (const txt of project.texts) max = Math.max(max, txt.zIndex);
  return max + 1;
}

type OrderedElement = { kind: "image"; el: ImageElement } | { kind: "text"; el: TextElement };

/** Combined images+texts, ascending by current zIndex — the single shared stacking order. */
function getOrderedElements(project: ProjectState): OrderedElement[] {
  return [
    ...project.images.map((el) => ({ kind: "image" as const, el })),
    ...project.texts.map((el) => ({ kind: "text" as const, el })),
  ].sort((a, b) => a.el.zIndex - b.el.zIndex);
}

/** Renumbers the given order 0..n-1 and splits it back into the two stored arrays. */
function applyOrder(project: ProjectState, ordered: OrderedElement[]): ProjectState {
  const images: ImageElement[] = [];
  const texts: TextElement[] = [];
  ordered.forEach((entry, idx) => {
    if (entry.kind === "image") images.push({ ...entry.el, zIndex: idx });
    else texts.push({ ...entry.el, zIndex: idx });
  });
  return { ...project, images, texts, updatedAt: Date.now() };
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: createBaselineProject(),

  setName: (name) => {
    set((s) => ({ project: { ...s.project, name, updatedAt: Date.now() } }));
    touchDirty();
  },

  setDimensions: (width, height) => {
    set((s) => ({ project: { ...s.project, width, height, updatedAt: Date.now() } }));
    touchDirty();
  },

  setGrid: (cols, rows) => {
    set((s) => ({ project: { ...s.project, cols, rows, updatedAt: Date.now() } }));
    touchDirty();
  },

  setBackgroundColor: (backgroundColor) => {
    set((s) => ({ project: { ...s.project, backgroundColor, updatedAt: Date.now() } }));
    touchDirty();
  },

  setBackgroundAlpha: (backgroundAlpha) => {
    set((s) => ({ project: { ...s.project, backgroundAlpha, updatedAt: Date.now() } }));
    touchDirty();
  },

  addImage: (partial) => {
    const { project } = get();
    const id = createId();
    // Cascade successive default spawn points, scaled by the new image's own
    // display size (a flat pixel nudge would be invisible against a several-
    // hundred-px-wide image and successive uploads would visually stack).
    const cascade = project.images.length % 6;
    const image: ImageElement = {
      id,
      circleMask: false,
      halftoneMode: "color",
      halftoneDotPitch: DOT_PITCH,
      edgeBlend: false,
      edgeBlendMargin: resolveDefaultMargin(partial.displayWidth, partial.displayHeight),
      rotation: 0,
      cropZoom: 1,
      cropOffsetX: 0,
      cropOffsetY: 0,
      opacity: 1,
      locked: false,
      x: project.width / 2 + cascade * partial.displayWidth * 0.06,
      y: project.height / 2 + cascade * partial.displayHeight * 0.06,
      zIndex: nextZIndex(project),
      ...partial,
    };
    set((s) => ({
      project: { ...s.project, images: [...s.project.images, image], updatedAt: Date.now() },
    }));
    touchDirty();
    return id;
  },

  updateImage: (id, patch) => {
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  updateManyImages: (ids, patch) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((i) => (idSet.has(i.id) ? { ...i, ...patch } : i)),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  deleteImage: (id) => {
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.filter((i) => i.id !== id),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  addText: (partial) => {
    const { project } = get();
    const id = createId();
    // Cascade successive default spawn points so new text elements don't stack
    // exactly on top of the image/each other and become unreachable by click/drag.
    const cascade = project.texts.length % 6;
    const text: TextElement = {
      id,
      content: "New text",
      fontFamily: DEFAULT_FONT_ID,
      fontSize: DEFAULT_FONT_SIZE,
      orientation: "horizontal",
      align: "center",
      color: "#f5f5f5",
      colorAlpha: 1,
      glow: false,
      glowColor: DEFAULT_GLOW_COLOR,
      glowSize: DEFAULT_GLOW_SIZE,
      x: project.width / 2 + cascade * 48,
      y: project.height / 2 + cascade * 36,
      boxWidth: DEFAULT_TEXT_BOX_WIDTH,
      boxHeight: DEFAULT_TEXT_BOX_HEIGHT,
      warpX: 1,
      warpY: 1,
      bold: false,
      italic: false,
      underline: false,
      rotation: 0,
      zIndex: nextZIndex(project),
      locked: false,
      ...partial,
    };
    set((s) => ({
      project: { ...s.project, texts: [...s.project.texts, text], updatedAt: Date.now() },
    }));
    touchDirty();
    return id;
  },

  updateText: (id, patch) => {
    set((s) => ({
      project: {
        ...s.project,
        texts: s.project.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  updateManyTexts: (ids, patch) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        texts: s.project.texts.map((t) => (idSet.has(t.id) ? { ...t, ...patch } : t)),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  deleteText: (id) => {
    set((s) => ({
      project: {
        ...s.project,
        texts: s.project.texts.filter((t) => t.id !== id),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  deleteMany: (ids) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.filter((i) => !idSet.has(i.id)),
        texts: s.project.texts.filter((t) => !idSet.has(t.id)),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  bringToFront: (id) => {
    const { project } = get();
    const ordered = getOrderedElements(project);
    const idx = ordered.findIndex((e) => e.el.id === id);
    if (idx === -1) return;
    const [item] = ordered.splice(idx, 1);
    ordered.push(item);
    set({ project: applyOrder(project, ordered) });
    touchDirty();
  },

  sendToBack: (id) => {
    const { project } = get();
    const ordered = getOrderedElements(project);
    const idx = ordered.findIndex((e) => e.el.id === id);
    if (idx === -1) return;
    const [item] = ordered.splice(idx, 1);
    ordered.unshift(item);
    set({ project: applyOrder(project, ordered) });
    touchDirty();
  },

  bringForward: (id) => {
    const { project } = get();
    const ordered = getOrderedElements(project);
    const idx = ordered.findIndex((e) => e.el.id === id);
    if (idx === -1 || idx === ordered.length - 1) return;
    [ordered[idx], ordered[idx + 1]] = [ordered[idx + 1], ordered[idx]];
    set({ project: applyOrder(project, ordered) });
    touchDirty();
  },

  sendBackward: (id) => {
    const { project } = get();
    const ordered = getOrderedElements(project);
    const idx = ordered.findIndex((e) => e.el.id === id);
    if (idx <= 0) return;
    [ordered[idx], ordered[idx - 1]] = [ordered[idx - 1], ordered[idx]];
    set({ project: applyOrder(project, ordered) });
    touchDirty();
  },

  bringToFrontMany: (ids) => {
    const { project } = get();
    const idSet = new Set(ids);
    const ordered = getOrderedElements(project);
    const selected = ordered.filter((e) => idSet.has(e.el.id));
    const rest = ordered.filter((e) => !idSet.has(e.el.id));
    set({ project: applyOrder(project, [...rest, ...selected]) });
    touchDirty();
  },

  sendToBackMany: (ids) => {
    const { project } = get();
    const idSet = new Set(ids);
    const ordered = getOrderedElements(project);
    const selected = ordered.filter((e) => idSet.has(e.el.id));
    const rest = ordered.filter((e) => !idSet.has(e.el.id));
    set({ project: applyOrder(project, [...selected, ...rest]) });
    touchDirty();
  },

  bringForwardMany: (ids) => {
    const { project } = get();
    const idSet = new Set(ids);
    const ordered = getOrderedElements(project);
    // Walk from the top down so each selected item swaps at most once with the
    // unselected neighbor directly above it, keeping the selection's own
    // relative order intact instead of cascading multiple steps.
    for (let i = ordered.length - 2; i >= 0; i--) {
      if (idSet.has(ordered[i].el.id) && !idSet.has(ordered[i + 1].el.id)) {
        [ordered[i], ordered[i + 1]] = [ordered[i + 1], ordered[i]];
      }
    }
    set({ project: applyOrder(project, ordered) });
    touchDirty();
  },

  sendBackwardMany: (ids) => {
    const { project } = get();
    const idSet = new Set(ids);
    const ordered = getOrderedElements(project);
    for (let i = 1; i < ordered.length; i++) {
      if (idSet.has(ordered[i].el.id) && !idSet.has(ordered[i - 1].el.id)) {
        [ordered[i], ordered[i - 1]] = [ordered[i - 1], ordered[i]];
      }
    }
    set({ project: applyOrder(project, ordered) });
    touchDirty();
  },

  moveElementsBy: (imageIds, textIds, dx, dy) => {
    const imageIdSet = new Set(imageIds);
    const textIdSet = new Set(textIds);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((i) => (imageIdSet.has(i.id) ? { ...i, x: i.x + dx, y: i.y + dy } : i)),
        texts: s.project.texts.map((t) => (textIdSet.has(t.id) ? { ...t, x: t.x + dx, y: t.y + dy } : t)),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  autoLayoutImages: () => {
    const { project } = get();
    const tiles = computeAutoLayout(project.images.length, project.width, project.height);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img, idx) => {
          const tile = tiles[idx];
          if (!tile) return img;
          return { ...img, x: tile.x, y: tile.y, displayWidth: tile.w, displayHeight: tile.h };
        }),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  loadProject: (project) => {
    set({ project });
    useUIStore.getState().markClean();
    useUIStore.getState().resetPan();
  },

  resetToNewDesign: () => {
    set({ project: createBaselineProject() });
    useUIStore.getState().markClean();
    useUIStore.getState().resetPan();
  },
}));
