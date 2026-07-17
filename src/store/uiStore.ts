import { create } from "zustand";
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from "@/constants/defaults";
import type { RadialMenuContext, RadialMenuState } from "@/store/types";
import type { GridNode } from "@/utils/grid";

type Theme = "dark" | "light";

interface UIStore {
  zoom: number;
  /** Viewport pan offset in screen px, applied alongside zoom on the canvas wrapper transform. */
  panX: number;
  panY: number;
  /** Persistent pan-tool toggle (stays active until toggled off). */
  panToolActive: boolean;
  /** Transient — true only while Space is physically held, regardless of panToolActive. */
  isSpacePanning: boolean;
  /** Global corner-drag resize preference (shared across all elements, not per-element/project data). */
  aspectLocked: boolean;
  theme: Theme;
  selectedElementId: string | null;
  radialMenu: RadialMenuState | null;
  designsDrawerOpen: boolean;
  uploadDialogOpen: boolean;
  isDirty: boolean;
  /** The grid node an in-progress drag would snap to on release — drives the live anchor highlight. */
  dragPreviewNode: GridNode | null;
  /** The text element currently showing its inline on-canvas editable box, if any. */
  editingTextId: string | null;
  /** The image element currently in crop mode (double-clicked into), if any — pinch/wheel
   * zooms and drag pans its content within its fixed frame instead of moving/resizing it. */
  croppingImageId: string | null;
  /** Set while a discard-confirmation popover is pending (New Design / loading another design while dirty). */
  pendingDiscardAction: (() => void) | null;
  pendingDiscardMessage: string;

  setZoom: (zoom: number) => void;
  zoomBy: (delta: number) => void;
  setPan: (x: number, y: number) => void;
  panBy: (dx: number, dy: number) => void;
  resetPan: () => void;
  togglePanTool: () => void;
  setSpacePanning: (active: boolean) => void;
  toggleAspectLocked: () => void;
  toggleTheme: () => void;
  setSelectedElementId: (id: string | null) => void;
  openRadialMenu: (x: number, y: number, context: RadialMenuContext, targetId: string | null) => void;
  closeRadialMenu: () => void;
  /** Repositions the currently-open menu (e.g. to keep it glued to an element being dragged) without changing its context/target. */
  moveRadialMenu: (x: number, y: number) => void;
  setDesignsDrawerOpen: (open: boolean) => void;
  setUploadDialogOpen: (open: boolean) => void;
  setDragPreviewNode: (node: GridNode | null) => void;
  setEditingTextId: (id: string | null) => void;
  setCroppingImageId: (id: string | null) => void;
  markDirty: () => void;
  markClean: () => void;
  /** Runs `action` immediately if clean; otherwise stages it behind a confirm popover. */
  guardDirty: (action: () => void, message: string) => void;
  confirmDiscard: () => void;
  cancelDiscard: () => void;
}

function clampZoom(z: number): number {
  return Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM);
}

export const useUIStore = create<UIStore>((set, get) => ({
  zoom: DEFAULT_ZOOM,
  panX: 0,
  panY: 0,
  panToolActive: false,
  isSpacePanning: false,
  aspectLocked: false,
  theme: "dark",
  selectedElementId: null,
  radialMenu: null,
  designsDrawerOpen: false,
  uploadDialogOpen: false,
  isDirty: false,
  dragPreviewNode: null,
  editingTextId: null,
  croppingImageId: null,
  pendingDiscardAction: null,
  pendingDiscardMessage: "",

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  zoomBy: (delta) => set((s) => ({ zoom: clampZoom(s.zoom + delta) })),
  setPan: (x, y) => set({ panX: x, panY: y }),
  panBy: (dx, dy) => set((s) => ({ panX: s.panX + dx, panY: s.panY + dy })),
  resetPan: () => set({ panX: 0, panY: 0 }),
  togglePanTool: () => set((s) => ({ panToolActive: !s.panToolActive })),
  setSpacePanning: (isSpacePanning) => set({ isSpacePanning }),
  toggleAspectLocked: () => set((s) => ({ aspectLocked: !s.aspectLocked })),

  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      return { theme: next };
    }),

  setSelectedElementId: (selectedElementId) => set({ selectedElementId }),

  openRadialMenu: (x, y, context, targetId) =>
    set({ radialMenu: { open: true, x, y, context, targetId }, selectedElementId: targetId }),

  closeRadialMenu: () => set({ radialMenu: null }),

  moveRadialMenu: (x, y) =>
    set((s) => (s.radialMenu ? { radialMenu: { ...s.radialMenu, x, y } } : {})),

  setDesignsDrawerOpen: (designsDrawerOpen) => set({ designsDrawerOpen }),
  setUploadDialogOpen: (uploadDialogOpen) => set({ uploadDialogOpen }),
  setDragPreviewNode: (dragPreviewNode) => set({ dragPreviewNode }),
  setEditingTextId: (editingTextId) => set({ editingTextId }),
  setCroppingImageId: (croppingImageId) => set({ croppingImageId }),

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),

  guardDirty: (action, message) => {
    if (get().isDirty) {
      set({ pendingDiscardAction: action, pendingDiscardMessage: message });
    } else {
      action();
    }
  },
  confirmDiscard: () => {
    const action = get().pendingDiscardAction;
    set({ pendingDiscardAction: null, pendingDiscardMessage: "" });
    action?.();
  },
  cancelDiscard: () => set({ pendingDiscardAction: null, pendingDiscardMessage: "" }),
}));
