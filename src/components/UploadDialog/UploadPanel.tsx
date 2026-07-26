import { useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useProjectStore } from "@/store/projectStore";
import { fileToDataUrl, loadImage } from "@/utils/fileToDataUrl";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { getEdgeAverageColor } from "@/canvas/edgeBlend";
import { colorSuggestionsCache, edgeColorCache } from "@/canvas/analysisCaches";
import { UploadIcon } from "@/components/RadialMenu/icons";
import { LeftDockPanel } from "@/components/LeftDockPanel";
import { UPLOAD_PANEL_WIDTH } from "@/constants/defaults";

/** Upload's left-docked panel — same shared shell as every other rail panel.
 * Deliberately stays open after a successful upload (unlike the old modal
 * dialog, which dismissed itself): a persistent side panel invites adding
 * several images in a row, the same way the Effects panels stay open after
 * adding an effect. */
export function UploadPanel() {
  const open = useUIStore((s) => s.activeLeftPanel === "upload");
  const closeLeftPanel = useUIStore((s) => s.closeLeftPanel);
  const project = useProjectStore((s) => s.project);
  const addImage = useProjectStore((s) => s.addImage);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;

    const dataUrl = await fileToDataUrl(file);
    const img = await loadImage(dataUrl);
    const maxDim = Math.min(project.width, project.height) * 0.6;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));

    // Eagerly compute and cache derived values now (while we already have the
    // decoded image) so the Colors/Edge-Blend tools have no async wait — and no
    // radial-menu ring-reflow glitch — the first time this image's menu opens.
    colorSuggestionsCache.set(dataUrl, getColorSuggestions(img));
    edgeColorCache.set(dataUrl, getEdgeAverageColor(img));

    addImage({
      dataUrl,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayWidth: img.naturalWidth * scale,
      displayHeight: img.naturalHeight * scale,
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  }

  return (
    <LeftDockPanel open={open} onClose={closeLeftPanel} title="Upload Image" width={UPLOAD_PANEL_WIDTH}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          isDraggingOver ? "border-[rgb(var(--bar-fg)/0.7)]" : "border-[rgb(var(--bar-border)/0.3)] opacity-80"
        }`}
      >
        <span className="flex h-7 w-7 items-center justify-center">
          <UploadIcon />
        </span>
        <span className="text-[12px]">Drag and drop an image here, or click to browse</span>
      </button>

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileInputChange} />
    </LeftDockPanel>
  );
}
