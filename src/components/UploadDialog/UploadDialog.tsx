import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useProjectStore } from "@/store/projectStore";
import { fileToDataUrl, loadImage } from "@/utils/fileToDataUrl";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { getEdgeAverageColor } from "@/canvas/edgeBlend";
import { colorSuggestionsCache, edgeColorCache } from "@/canvas/analysisCaches";
import { UploadIcon } from "@/components/RadialMenu/icons";

export function UploadDialog() {
  const open = useUIStore((s) => s.uploadDialogOpen);
  const setOpen = useUIStore((s) => s.setUploadDialogOpen);
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
    setOpen(false);
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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        {/* Fixed neutral scrim (not a --chrome-* token) is intentional: its job is
            universal page-dimming behind the dialog regardless of theme — tokenizing it
            to the light theme's near-white --chrome-bg would make it disappear. */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out] data-[state=closed]:animate-[fade-out_120ms_ease-in]" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-7 outline-none data-[state=open]:animate-[glass-in_260ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[glass-out_170ms_cubic-bezier(0.22,1,0.36,1)]">
          <Dialog.Title className="mb-5 text-[13px] font-bold uppercase tracking-wide">Upload Image</Dialog.Title>

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
              isDraggingOver ? "border-accent/70 text-accent" : "border-[rgb(var(--chrome-border)/0.3)] opacity-80"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center">
              <UploadIcon />
            </span>
            <span className="text-[12px]">Drag and drop an image here, or click to browse</span>
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileInputChange} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
