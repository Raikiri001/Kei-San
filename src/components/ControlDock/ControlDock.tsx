import { useRef, type ReactNode } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { downloadCanvas, renderProjectToCanvas } from "@/canvas/exportEngine";
import { saveCurrentProject } from "@/store/persistence";
import { fileToDataUrl, loadImage } from "@/utils/fileToDataUrl";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { getEdgeAverageColor } from "@/canvas/edgeBlend";
import { colorSuggestionsCache, edgeColorCache } from "@/canvas/analysisCaches";
import {
  DownloadIcon,
  FolderIcon,
  MoonIcon,
  NewDesignIcon,
  SunIcon,
  TextContentIcon,
  UploadIcon,
} from "@/components/RadialMenu/icons";

function DockField({ label, jpLabel, children }: { label: string; jpLabel: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex flex-col leading-none">
        <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
        <span className="label-jp">{jpLabel}</span>
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "glass-panel h-8 w-16 rounded px-2 text-[12px] tabular-nums outline-none focus:border-accent/60";

function DockButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="corner-frame glass-panel group relative flex flex-col items-center gap-1 rounded-md px-3 py-1.5 text-[11px] uppercase tracking-wide transition-colors hover:border-accent/50 hover:text-accent"
    >
      <span className="corner-bl" />
      <span className="corner-br" />
      <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      {children}
    </button>
  );
}

export function ControlDock() {
  const project = useProjectStore((s) => s.project);
  const setName = useProjectStore((s) => s.setName);
  const setDimensions = useProjectStore((s) => s.setDimensions);
  const setGrid = useProjectStore((s) => s.setGrid);
  const addImage = useProjectStore((s) => s.addImage);
  const addText = useProjectStore((s) => s.addText);
  const resetToNewDesign = useProjectStore((s) => s.resetToNewDesign);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const guardDirty = useUIStore((s) => s.guardDirty);
  const setDesignsDrawerOpen = useUIStore((s) => s.setDesignsDrawerOpen);
  const openRadialMenu = useUIStore((s) => s.openRadialMenu);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

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

  function handleAddText() {
    const id = addText();
    openRadialMenu(window.innerWidth / 2, window.innerHeight / 2, "text", id);
  }

  async function handleExport() {
    const canvas = await renderProjectToCanvas(project);
    await downloadCanvas(canvas, project.name);
    await saveCurrentProject(project, canvas);
  }

  function handleNewDesign() {
    guardDirty(() => resetToNewDesign(), "Discard unsaved changes and start a new design?");
  }

  return (
    <div className="glass-panel corner-frame pointer-events-auto relative flex flex-wrap items-end gap-4 rounded-xl px-5 py-3">
      <span className="corner-bl" />
      <span className="corner-br" />

      <DockField label="Project" jpLabel="プロジェクト名">
        <input
          value={project.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => saveCurrentProject(project)}
          placeholder="Untitled"
          className="glass-panel h-8 w-40 rounded px-2 text-[12px] outline-none focus:border-accent/60"
        />
      </DockField>

      <DockField label="Width" jpLabel="幅">
        <input
          type="number"
          min={64}
          max={7680}
          value={project.width}
          onChange={(e) => setDimensions(Number(e.target.value) || project.width, project.height)}
          onBlur={() => saveCurrentProject(project)}
          className={inputClass}
        />
      </DockField>

      <DockField label="Height" jpLabel="高さ">
        <input
          type="number"
          min={64}
          max={7680}
          value={project.height}
          onChange={(e) => setDimensions(project.width, Number(e.target.value) || project.height)}
          onBlur={() => saveCurrentProject(project)}
          className={inputClass}
        />
      </DockField>

      <DockField label="Cols" jpLabel="列">
        <input
          type="number"
          min={1}
          max={24}
          value={project.cols}
          onChange={(e) => setGrid(Number(e.target.value) || project.cols, project.rows)}
          onBlur={() => saveCurrentProject(project)}
          className={inputClass}
        />
      </DockField>

      <DockField label="Rows" jpLabel="行">
        <input
          type="number"
          min={1}
          max={24}
          value={project.rows}
          onChange={(e) => setGrid(project.cols, Number(e.target.value) || project.rows)}
          onBlur={() => saveCurrentProject(project)}
          className={inputClass}
        />
      </DockField>

      <div className="mx-1 h-9 w-px bg-white/10" />

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      <DockButton onClick={() => fileInputRef.current?.click()} icon={<UploadIcon />}>
        Upload Image
      </DockButton>
      <DockButton onClick={handleAddText} icon={<TextContentIcon />}>
        Add Text
      </DockButton>
      <DockButton onClick={() => setDesignsDrawerOpen(true)} icon={<FolderIcon />}>
        My Designs
      </DockButton>
      <DockButton onClick={handleNewDesign} icon={<NewDesignIcon />}>
        New Design
      </DockButton>
      <DockButton onClick={handleExport} icon={<DownloadIcon />}>
        Export Wallpaper
      </DockButton>
      <DockButton onClick={toggleTheme} icon={theme === "dark" ? <MoonIcon /> : <SunIcon />}>
        {theme === "dark" ? "Dark" : "Light"}
      </DockButton>
    </div>
  );
}
