import { create } from "zustand";
import { CUSTOM_SWATCHES_STORAGE_KEY, MAX_CUSTOM_SWATCHES } from "@/constants/defaults";

function loadSwatches(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SWATCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function persist(swatches: string[]) {
  try {
    localStorage.setItem(CUSTOM_SWATCHES_STORAGE_KEY, JSON.stringify(swatches));
  } catch {
    // Swatches are a nice-to-have preference, not critical data — a full/blocked
    // localStorage just means this save silently doesn't persist across reloads.
  }
}

interface SwatchStore {
  swatches: string[];
  addSwatch: (hex: string) => void;
  removeSwatch: (hex: string) => void;
}

/** User's saved custom color swatches — a standalone preference (like theme),
 * not project data, so it lives in its own tiny store instead of ProjectState,
 * and is persisted directly to localStorage rather than through the
 * save-design flow. */
export const useSwatchStore = create<SwatchStore>((set, get) => ({
  swatches: loadSwatches(),

  addSwatch: (hex) => {
    const normalized = hex.toLowerCase();
    if (get().swatches.includes(normalized)) return;
    const next = [normalized, ...get().swatches].slice(0, MAX_CUSTOM_SWATCHES);
    persist(next);
    set({ swatches: next });
  },

  removeSwatch: (hex) => {
    const next = get().swatches.filter((c) => c !== hex);
    persist(next);
    set({ swatches: next });
  },
}));
