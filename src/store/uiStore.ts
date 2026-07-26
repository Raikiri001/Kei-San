import { create } from "zustand";
import { DEFAULT_ZOOM, EFFECTS_PANEL_DEFAULT_WIDTH, EFFECTS_PANEL_MAX_WIDTH, EFFECTS_PANEL_MIN_WIDTH, MAX_ZOOM, MIN_ZOOM } from "@/constants/defaults";
import type { RadialMenuContext, RadialMenuState } from "@/store/types";
import type { GridNode } from "@/utils/grid";

type Theme = "dark" | "light";

/** Every panel that docks to the rail's right edge and pushes the
 * ruler/canvas over — all mutually exclusive (only one can be open at a
 * time, since they all occupy the same slot), all opened/closed through
 * `openLeftPanel`/`closeLeftPanel` below. */
export type LeftPanelKind = "effects" | "textEffects" | "upload" | "canvasSettings" | "backgroundColor" | "designs";

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
  /** Master anchor toggle. On: anchor-node dots render, and moving an image/text
   * element snaps its position to the nearest anchor node. Off: anchor dots hide
   * and moves become completely free-form (no position snapping at all) — but
   * resizing is unaffected either way, its edges always snap to the row/column/
   * canvas-edge grid lines regardless of this toggle. */
  showAnchors: boolean;
  theme: Theme;
  /** Every currently-selected element id (image or text) — empty means nothing selected. */
  selectedElementIds: string[];
  /** Live raw delta (screen-drag-derived, canvas px) while dragging one element of a
   * multi-selection — every OTHER selected element previews itself offset by this
   * same amount so the whole group visibly moves together, without writing to the
   * project store until the drag commits. Null outside of an active group drag. */
  groupDragOffset: { dx: number; dy: number } | null;
  radialMenu: RadialMenuState | null;
  /** Which left-docked panel (if any) is currently open — see LeftPanelKind.
   * Every rail button that opens a panel (Upload, Image FX, Text FX, Canvas,
   * Color, Designs) goes through this single slot instead of its own
   * separate open flag, since only one can ever be open/pushing the canvas
   * over at a time. */
  activeLeftPanel: LeftPanelKind | null;
  /** The Image Effects gallery's target image ids, mirroring radialMenu's own
   * targetIds convention (see openEffectsDrawer below) — only meaningful
   * while activeLeftPanel === "effects". */
  effectsDrawerTargetIds: string[];
  /** Current width of the Active Stack panel — user-resizable, lifted up from
   * local component state (rather than kept inside EffectsDrawer) so the
   * App-level layout wrapper can read it and push the canvas/ruler over by
   * the same amount while it's open. */
  effectsPanelWidth: number;
  /** Which layer (if any) the Active Stack has open in the right-docked
   * Inspector panel — also lifted up for the same reason: App.tsx needs to
   * know whether that panel is open to push the canvas's right edge in. */
  effectsSelectedLayerId: string | null;
  isDirty: boolean;
  /** The grid node an in-progress drag would snap to on release — drives the live anchor highlight. */
  dragPreviewNode: GridNode | null;
  /** Full-canvas-length smart-guide lines (canvas px) an in-progress free-form
   * move (anchors off) is currently aligned to — null on an axis with no
   * current alignment. See `snapToAlignmentGuides` in utils/grid.ts. */
  alignmentGuideX: number | null;
  alignmentGuideY: number | null;
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
  toggleShowAnchors: () => void;
  toggleTheme: () => void;
  /** Convenience: replaces the selection with a single id (or clears it). Every
   * pre-multi-select call site (tap-to-open-menu, deselect-on-background-click,
   * double-click-into-crop/edit, paste) keeps working unchanged through this. */
  setSelectedElementId: (id: string | null) => void;
  /** Replaces the whole selection — used by the marquee drag-box and by the
   * convenience wrapper above. */
  setSelectedElementIds: (ids: string[]) => void;
  /** Shift/Cmd-click additive toggle: adds the id if absent, removes it if present. */
  toggleElementSelection: (id: string) => void;
  setGroupDragOffset: (offset: { dx: number; dy: number } | null) => void;
  openRadialMenu: (x: number, y: number, context: RadialMenuContext, targetIds: string[]) => void;
  closeRadialMenu: () => void;
  /** Repositions the currently-open menu (e.g. to keep it glued to an element being dragged) without changing its context/target. */
  moveRadialMenu: (x: number, y: number) => void;
  /** Opens the given panel, or closes it if it's already the active one
   * (rail buttons toggle). */
  openLeftPanel: (kind: LeftPanelKind) => void;
  closeLeftPanel: () => void;
  openEffectsDrawer: (targetIds: string[]) => void;
  setEffectsPanelWidth: (width: number) => void;
  setEffectsSelectedLayerId: (id: string | null) => void;
  setDragPreviewNode: (node: GridNode | null) => void;
  setAlignmentGuide: (x: number | null, y: number | null) => void;
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
  showAnchors: false,
  theme: "dark",
  selectedElementIds: [],
  groupDragOffset: null,
  radialMenu: null,
  activeLeftPanel: null,
  effectsDrawerTargetIds: [],
  effectsPanelWidth: EFFECTS_PANEL_DEFAULT_WIDTH,
  effectsSelectedLayerId: null,
  isDirty: false,
  dragPreviewNode: null,
  alignmentGuideX: null,
  alignmentGuideY: null,
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
  toggleShowAnchors: () => set((s) => ({ showAnchors: !s.showAnchors })),

  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      return { theme: next };
    }),

  setSelectedElementId: (id) => set({ selectedElementIds: id ? [id] : [] }),
  setSelectedElementIds: (selectedElementIds) => set({ selectedElementIds }),
  toggleElementSelection: (id) =>
    set((s) => ({
      selectedElementIds: s.selectedElementIds.includes(id)
        ? s.selectedElementIds.filter((existing) => existing !== id)
        : [...s.selectedElementIds, id],
    })),
  setGroupDragOffset: (groupDragOffset) => set({ groupDragOffset }),

  openRadialMenu: (x, y, context, targetIds) =>
    set({ radialMenu: { open: true, x, y, context, targetIds }, selectedElementIds: targetIds }),

  closeRadialMenu: () => set({ radialMenu: null }),

  moveRadialMenu: (x, y) =>
    set((s) => (s.radialMenu ? { radialMenu: { ...s.radialMenu, x, y } } : {})),

  openLeftPanel: (kind) =>
    set((s) => ({
      activeLeftPanel: s.activeLeftPanel === kind ? null : kind,
      effectsSelectedLayerId: null,
    })),
  closeLeftPanel: () => set({ activeLeftPanel: null, effectsSelectedLayerId: null }),
  openEffectsDrawer: (targetIds) => set({ activeLeftPanel: "effects", effectsDrawerTargetIds: targetIds, effectsSelectedLayerId: null }),
  setEffectsPanelWidth: (width) =>
    set({ effectsPanelWidth: Math.min(EFFECTS_PANEL_MAX_WIDTH, Math.max(EFFECTS_PANEL_MIN_WIDTH, width)) }),
  setEffectsSelectedLayerId: (effectsSelectedLayerId) => set({ effectsSelectedLayerId }),
  setDragPreviewNode: (dragPreviewNode) => set({ dragPreviewNode }),
  setAlignmentGuide: (alignmentGuideX, alignmentGuideY) => set({ alignmentGuideX, alignmentGuideY }),
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
