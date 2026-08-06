import { useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useAssetLibraryStore } from "@/store/assetLibraryStore";
import { useImageUpload } from "@/hooks/useImageUpload";
import { spawnAsset } from "@/utils/spawnAsset";
import { UploadIcon } from "@/components/RadialMenu/icons";
import { LeftDockPanel } from "@/components/LeftDockPanel";
import { UploadedImageCard } from "@/components/UploadDialog/UploadedImageCard";
import { UPLOAD_PANEL_WIDTH } from "@/constants/defaults";

/** Upload's left-docked panel — same shared shell as every other rail panel.
 * Deliberately stays open after a successful upload (unlike the old modal
 * dialog, which dismissed itself): a persistent side panel invites adding
 * several images in a row, the same way the Effects panels stay open after
 * adding an effect. Every image ever uploaded (via this panel's own
 * dropzone/picker, OR dropped anywhere else on the window — see App.tsx)
 * stays listed below the dropzone as a reusable asset library — see
 * assetLibraryStore's own doc comment for why this is deliberately NOT the
 * same list as what's currently on the canvas: deleting a canvas instance
 * should never mean re-uploading the same file to get it back. Clicking a
 * thumbnail spawns a fresh instance on the canvas; dragging one onto the
 * canvas spawns it at the drop point instead (see UploadedImageCard). */
export function UploadPanel() {
  const open = useUIStore((s) => s.activeLeftPanel === "upload");
  const closeLeftPanel = useUIStore((s) => s.closeLeftPanel);
  const assets = useAssetLibraryStore((s) => s.assets);
  const removeAsset = useAssetLibraryStore((s) => s.removeAsset);
  const uploadFiles = useImageUpload();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    // Stops here instead of also bubbling to App.tsx's own window-level drop
    // handler — otherwise a drop directly on this dropzone would upload the
    // same file(s) twice, once from each handler.
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingOver(false);
    uploadFiles(e.dataTransfer.files);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    // `files` is snapshotted into a real array before clearing `value` —
    // `e.target.files` is a *live* FileList tied to the input's own current
    // selection, so clearing the input first (still holding just a reference
    // to that same FileList, not a copy) would empty it out from under
    // uploadFiles before it ever gets to read it.
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    uploadFiles(files);
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
        className={`flex w-full shrink-0 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          isDraggingOver ? "border-[rgb(var(--bar-fg)/0.7)]" : "border-[rgb(var(--bar-border)/0.3)] opacity-80"
        }`}
      >
        <span className="flex h-7 w-7 items-center justify-center">
          <UploadIcon />
        </span>
        <span className="text-[12px]">Drag and drop an image here, or click to browse</span>
      </button>

      <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileInputChange} />

      {assets.length > 0 && (
        <div className="bar-adaptive-glass thin-scroll -mx-6 mt-6 min-h-0 flex-1 overflow-y-auto px-6">
          <div className="mb-3 text-[11px] uppercase tracking-wide opacity-60">Uploaded ({assets.length})</div>
          <div className="grid grid-cols-2 gap-3 pb-4">
            {assets.map((asset) => (
              <UploadedImageCard key={asset.id} asset={asset} onSpawn={() => spawnAsset(asset)} onRemove={() => removeAsset(asset.id)} />
            ))}
          </div>
        </div>
      )}
    </LeftDockPanel>
  );
}
