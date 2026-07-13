import { create } from "zustand";
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from "@/constants/defaults";
import type { RadialMenuContext, RadialMenuState } from "@/store/types";

type Theme = "dark" | "light";

interface UIStore {
  zoom: number;
  theme: Theme;
  selectedElementId: string | null;
  radialMenu: RadialMenuState | null;
  designsDrawerOpen: boolean;
  isDirty: boolean;
  /** Set while a discard-confirmation popover is pending (New Design / loading another design while dirty). */
  pendingDiscardAction: (() => void) | null;
  pendingDiscardMessage: string;

  setZoom: (zoom: number) => void;
  zoomBy: (delta: number) => void;
  toggleTheme: () => void;
  setSelectedElementId: (id: string | null) => void;
  openRadialMenu: (x: number, y: number, context: RadialMenuContext, targetId: string | null) => void;
  closeRadialMenu: () => void;
  setDesignsDrawerOpen: (open: boolean) => void;
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
  theme: "dark",
  selectedElementId: null,
  radialMenu: null,
  designsDrawerOpen: false,
  isDirty: false,
  pendingDiscardAction: null,
  pendingDiscardMessage: "",

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  zoomBy: (delta) => set((s) => ({ zoom: clampZoom(s.zoom + delta) })),

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

  setDesignsDrawerOpen: (designsDrawerOpen) => set({ designsDrawerOpen }),

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
