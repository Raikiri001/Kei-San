import { useCallback } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useAssetLibraryStore } from "@/store/assetLibraryStore";
import { fileToDataUrl, loadImage } from "@/utils/fileToDataUrl";
import { fitDisplaySize } from "@/utils/imageSizing";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { getEdgeAverageColor } from "@/canvas/edgeBlend";
import { colorSuggestionsCache, edgeColorCache } from "@/canvas/analysisCaches";

/**
 * Shared "decode a dropped/picked file, place it on the canvas, and register
 * it in the Upload panel's persistent asset library" pipeline — used by both
 * the Upload panel's own dropzone/file-picker and the app-wide window drop
 * handler (App.tsx), so dragging an image onto the canvas, the header, or
 * anywhere else behaves identically to dropping it on the Upload panel
 * itself. The library registration (addAsset) is what makes the upload
 * outlive its own canvas instance — deleting that instance later doesn't
 * touch the library, and spawning more copies from it never needs the
 * original file again (see spawnAsset).
 */
export function useImageUpload() {
  const project = useProjectStore((s) => s.project);
  const addImage = useProjectStore((s) => s.addImage);
  const addAsset = useAssetLibraryStore((s) => s.addAsset);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const dataUrl = await fileToDataUrl(file);
      const img = await loadImage(dataUrl);
      const { displayWidth, displayHeight } = fitDisplaySize(img.naturalWidth, img.naturalHeight, project.width, project.height);

      // Eagerly compute and cache derived values now (while we already have the
      // decoded image) so the Colors/Edge-Blend tools have no async wait — and no
      // radial-menu ring-reflow glitch — the first time this image's menu opens.
      colorSuggestionsCache.set(dataUrl, getColorSuggestions(img));
      edgeColorCache.set(dataUrl, getEdgeAverageColor(img));

      addAsset({ dataUrl, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      addImage({
        dataUrl,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth,
        displayHeight,
      });
    },
    [project.width, project.height, addImage, addAsset],
  );

  // Sequential, not Promise.all — successive uploads cascade their spawn point
  // off `project.images.length` (see addImage), which only advances once each
  // call has actually committed to the store, so uploading several files at
  // once still fans them out instead of stacking them on the same spot.
  const uploadFiles = useCallback(
    async (files: FileList | File[] | null | undefined) => {
      if (!files) return;
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }
    },
    [uploadFile],
  );

  return uploadFiles;
}
