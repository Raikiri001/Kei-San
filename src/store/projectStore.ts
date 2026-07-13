import { create } from "zustand";
import { useUIStore } from "@/store/uiStore";
import { createId } from "@/utils/id";
import { DEFAULT_FONT_SIZE } from "@/constants/fonts";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_COLS,
  DEFAULT_HEIGHT,
  DEFAULT_ROWS,
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
    images: [],
    texts: [],
    updatedAt: Date.now(),
  };
}

type NewImageInput = Omit<ImageElement, "id" | "x" | "y" | "circleMask" | "halftoneMode" | "edgeBlend"> &
  Partial<Pick<ImageElement, "circleMask" | "halftoneMode" | "edgeBlend">>;

interface ProjectStore {
  project: ProjectState;
  setName: (name: string) => void;
  setDimensions: (width: number, height: number) => void;
  setGrid: (cols: number, rows: number) => void;
  setBackgroundColor: (color: string) => void;
  addImage: (image: NewImageInput) => string;
  updateImage: (id: string, patch: Partial<ImageElement>) => void;
  deleteImage: (id: string) => void;
  addText: (partial?: Partial<TextElement>) => string;
  updateText: (id: string, patch: Partial<TextElement>) => void;
  deleteText: (id: string) => void;
  loadProject: (project: ProjectState) => void;
  resetToNewDesign: () => void;
}

/** Every in-place edit marks the project dirty; loadProject/resetToNewDesign mark it clean instead. */
function touchDirty() {
  useUIStore.getState().markDirty();
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
      edgeBlend: false,
      x: project.width / 2 + cascade * partial.displayWidth * 0.06,
      y: project.height / 2 + cascade * partial.displayHeight * 0.06,
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
      fontFamily: "sans",
      fontSize: DEFAULT_FONT_SIZE,
      orientation: "horizontal",
      color: "#f5f5f5",
      x: project.width / 2 + cascade * 48,
      y: project.height / 2 + cascade * 36,
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

  loadProject: (project) => {
    set({ project });
    useUIStore.getState().markClean();
  },

  resetToNewDesign: () => {
    set({ project: createBaselineProject() });
    useUIStore.getState().markClean();
  },
}));
