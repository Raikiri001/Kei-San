import { create } from "zustand";
import { useUIStore } from "@/store/uiStore";
import { createId } from "@/utils/id";
import { DEFAULT_FONT_ID, DEFAULT_FONT_SIZE } from "@/constants/fonts";
import { createEffectLayer, createMixLayer } from "@/canvas/gl/effectDefaults";
import { addToBranch, mapEffectLayer, mapGroupLayer, mapMixLayer, removeLayerById, setBranchOrder } from "@/store/imageEffects";
import { BUILT_IN_PRESETS } from "@/presets/builtInPresets";
import { instantiatePresetGroup } from "@/presets/instantiatePreset";
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
import type { EffectLayer, ImageElement, Layer, MixLayer, ProjectState, StackableEffect, StackableEffectType, TextElement } from "@/store/types";

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
  "id" | "x" | "y" | "layers" | "rotation" | "zIndex" | "cropZoom" | "cropOffsetX" | "cropOffsetY" | "opacity" | "locked"
> &
  Partial<Pick<ImageElement, "x" | "y" | "layers" | "rotation" | "cropZoom" | "cropOffsetX" | "cropOffsetY" | "opacity" | "locked">>;

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
  /** Appends a fresh, default-param instance of `type` to each listed image's layer
   * stack — clicking an Effects gallery card always ADDS, never toggles/replaces, so
   * the same effect type can be stacked more than once. */
  addEffectLayer: (ids: string[], type: StackableEffectType) => void;
  /** Appends a fresh, independently-editable group layer (see instantiatePresetGroup)
   * for the given built-in preset — same "always adds" semantics as addEffectLayer,
   * so presets and individual effects (and repeat applications of the same preset)
   * freely stack rather than one replacing another. */
  addPresetGroupLayer: (ids: string[], presetId: string) => void;
  /** Shallow-merges `patch` into one effect layer (top-level or nested inside a preset
   * group) by its own id — covers `enabled` toggles, param edits (type-checked against
   * that effect's own param shape), and the universal `blend`/`mask` fields every
   * layer carries regardless of effect type. `blend`/`mask` patches must include the
   * whole object (not a deep-partial) since this is a shallow merge at the layer level. */
  updateEffectLayer: <T extends StackableEffectType>(
    ids: string[],
    layerId: string,
    patch: Partial<Omit<Extract<StackableEffect, { type: T }>, "type">> & Partial<Pick<EffectLayer, "blend" | "mask">>,
  ) => void;
  /** Shallow-merges `patch` into one top-level preset-group layer by id — `enabled`
   * (the group's own master toggle) and/or `expanded` (UI-only). */
  updateGroupLayer: (ids: string[], groupId: string, patch: { enabled?: boolean; expanded?: boolean }) => void;
  /** Removes one layer by id — a top-level effect/group layer, or a child nested
   * inside a group — from each listed image's stack. */
  deleteLayer: (ids: string[], layerId: string) => void;
  /** Applies a drag-reordered top-level layer stack (as shown in the Active Stack
   * panel) — children within a group keep the fixed order they were created with. */
  setLayerOrder: (ids: string[], newOrder: string[]) => void;
  /** Appends a fresh Layer Mix node (both branches empty) — same "always adds"
   * semantics as addEffectLayer/addPresetGroupLayer. */
  addMixLayer: (ids: string[]) => void;
  /** Shallow-merges `patch` into one top-level Layer Mix's own fields — `enabled`,
   * `expanded` (UI-only), or its universal `blend`/`mask` (not its branch children —
   * those go through updateEffectLayer/deleteLayer by the child's own id, same as any
   * other effect layer, since mapEffectLayer/removeLayerById already search inside
   * both branches). */
  updateMixLayer: (ids: string[], mixLayerId: string, patch: Partial<Pick<MixLayer, "enabled" | "expanded" | "blend" | "mask">>) => void;
  /** Appends a fresh, default-param effect layer to one branch of a Layer Mix. */
  addBranchEffectLayer: (ids: string[], mixLayerId: string, branch: "a" | "b", type: StackableEffectType) => void;
  /** Applies a drag-reordered branch (as shown in a MixLayerRow's own two mini stacks). */
  setBranchLayerOrder: (ids: string[], mixLayerId: string, branch: "a" | "b", newOrder: string[]) => void;
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
      layers: [],
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

  addEffectLayer: (ids, type) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img) =>
          idSet.has(img.id) ? { ...img, layers: [...img.layers, createEffectLayer(type)] } : img,
        ),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  addPresetGroupLayer: (ids, presetId) => {
    const preset = BUILT_IN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img) =>
          idSet.has(img.id) ? { ...img, layers: [...img.layers, instantiatePresetGroup(preset)] } : img,
        ),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  updateEffectLayer: (ids, layerId, patch) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img) =>
          idSet.has(img.id) ? { ...img, layers: mapEffectLayer(img.layers, layerId, (layer) => ({ ...layer, ...patch })) } : img,
        ),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  updateGroupLayer: (ids, groupId, patch) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img) =>
          idSet.has(img.id) ? { ...img, layers: mapGroupLayer(img.layers, groupId, (group) => ({ ...group, ...patch })) } : img,
        ),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  deleteLayer: (ids, layerId) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img) => (idSet.has(img.id) ? { ...img, layers: removeLayerById(img.layers, layerId) } : img)),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  setLayerOrder: (ids, newOrder) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img) => {
          if (!idSet.has(img.id)) return img;
          const byId = new Map(img.layers.map((l) => [l.id, l]));
          const reordered = newOrder.map((id) => byId.get(id)).filter((l): l is Layer => !!l);
          return { ...img, layers: reordered };
        }),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  addMixLayer: (ids) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img) => (idSet.has(img.id) ? { ...img, layers: [...img.layers, createMixLayer()] } : img)),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  updateMixLayer: (ids, mixLayerId, patch) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img) =>
          idSet.has(img.id) ? { ...img, layers: mapMixLayer(img.layers, mixLayerId, (mix) => ({ ...mix, ...patch })) } : img,
        ),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  addBranchEffectLayer: (ids, mixLayerId, branch, type) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img) =>
          idSet.has(img.id) ? { ...img, layers: addToBranch(img.layers, mixLayerId, branch, createEffectLayer(type)) } : img,
        ),
        updatedAt: Date.now(),
      },
    }));
    touchDirty();
  },

  setBranchLayerOrder: (ids, mixLayerId, branch, newOrder) => {
    const idSet = new Set(ids);
    set((s) => ({
      project: {
        ...s.project,
        images: s.project.images.map((img) =>
          idSet.has(img.id) ? { ...img, layers: setBranchOrder(img.layers, mixLayerId, branch, newOrder) } : img,
        ),
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
