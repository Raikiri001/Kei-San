import { create } from "zustand";
import { createId } from "@/utils/id";

/** A drag-and-drop-from-panel gesture identifies its payload by this custom
 * `dataTransfer` type — both UploadedImageCard (drag source) and
 * CanvasWorkspace (drop target) key off it, and App.tsx's own window-wide
 * file-drop handler deliberately ignores it (only "Files" triggers that one),
 * so dragging a library thumbnail onto the canvas and dragging a real OS file
 * onto the canvas never fight over the same drop. */
export const ASSET_DRAG_MIME = "application/x-kei-san-asset-id";

export interface UploadedAsset {
  id: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}

interface AssetLibraryStore {
  assets: UploadedAsset[];
  addAsset: (asset: Omit<UploadedAsset, "id">) => UploadedAsset;
  removeAsset: (id: string) => void;
}

/**
 * Every image ever uploaded (via the Upload panel's dropzone/picker, or a
 * window-wide file drop — see useImageUpload) this session, independent of
 * `projectStore`'s own `project.images` — deleting a canvas instance never
 * touches this list, and this list never gets wiped by starting a new
 * project or loading a saved design, since it isn't part of `ProjectState`
 * at all. Lets the Upload panel show a persistent "already uploaded this"
 * library to spawn fresh instances from (click, or drag onto the canvas)
 * instead of asking the user to re-upload the same file. Session-only (not
 * localStorage-backed) on purpose — the rest of the live project doesn't
 * survive a page reload either (only an explicit "Save" to My Designs does),
 * so persisting just this slice across reloads would be an inconsistent,
 * one-off exception, on top of the real risk of blowing through localStorage's
 * quota with full-resolution image data URLs.
 */
export const useAssetLibraryStore = create<AssetLibraryStore>((set) => ({
  assets: [],
  addAsset: (asset) => {
    const newAsset: UploadedAsset = { id: createId(), ...asset };
    set((s) => ({ assets: [...s.assets, newAsset] }));
    return newAsset;
  },
  removeAsset: (id) => set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
}));
