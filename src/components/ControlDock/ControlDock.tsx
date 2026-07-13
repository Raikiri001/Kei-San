import { useRef, type ReactNode } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDraftNumber } from "@/hooks/useDraftNumber";
import { downloadCanvas, renderProjectToCanvas } from "@/canvas/exportEngine";
import { saveCurrentProject } from "@/store/persistence";
import { fileToDataUrl, loadImage } from "@/utils/fileToDataUrl";
import { getColorSuggestions } from "@/canvas/colorExtraction";
import { getEdgeAverageColor } from "@/canvas/edgeBlend";
import { colorSuggestionsCache, edgeColorCache } from "@/canvas/analysisCaches";
import { GRID_PRESETS, RESOLUTION_PRESETS } from "@/constants/defaults";
import {
  DownloadIcon,
  FolderIcon,
  MoonIcon,
  NewDesignIcon,
  SunIcon,
  TextContentIcon,
  UploadIcon,
} from "@/components/RadialMenu/icons";

function DockField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "glass-panel h-8 w-16 rounded px-2 text-[12px] tabular-nums outline-none focus:border-accent/60";
const selectClass =
  "glass-panel h-8 rounded px-2 text-[11px] outline-none focus:border-accent/60";

function DockButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="corner-frame glass-panel group relative flex flex-col items-center gap-1 px-3 py-1.5 text-[11px] uppercase tracking-wide transition-colors hover:border-accent/50 hover:text-accent"
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

  const widthDraft = useDraftNumber(project.width, {
    min: 64,
    max: 7680,
    onCommit: (width) => {
      setDimensions(width, project.height);
      saveCurrentProject(project);
    },
  });
  const heightDraft = useDraftNumber(project.height, {
    min: 64,
    max: 7680,
    onCommit: (height) => {
      setDimensions(project.width, height);
      saveCurrentProject(project);
    },
  });
  const colsDraft = useDraftNumber(project.cols, {
    min: 1,
    max: 24,
    onCommit: (cols) => {
      setGrid(cols, project.rows);
      saveCurrentProject(project);
    },
  });
  const rowsDraft = useDraftNumber(project.rows, {
    min: 1,
    max: 24,
    onCommit: (rows) => {
      setGrid(project.cols, rows);
      saveCurrentProject(project);
    },
  });

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

  function handleResolutionPreset(e: React.ChangeEvent<HTMLSelectElement>) {
    const preset = RESOLUTION_PRESETS[Number(e.target.value)];
    if (!preset) return;
    setDimensions(preset.width, preset.height);
    saveCurrentProject(project);
  }

  function handleGridPreset(e: React.ChangeEvent<HTMLSelectElement>) {
    const preset = GRID_PRESETS[Number(e.target.value)];
    if (!preset) return;
    setGrid(preset.cols, preset.rows);
    saveCurrentProject(project);
  }

  return (
    <div className="glass-panel corner-frame pointer-events-auto relative flex flex-wrap items-end gap-4 px-5 py-3">
      <span className="corner-bl" />
      <span className="corner-br" />

      <DockField label="Project">
        <input
          value={project.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => saveCurrentProject(project)}
          placeholder="Untitled"
          className="glass-panel h-8 w-40 rounded px-2 text-[12px] outline-none focus:border-accent/60"
        />
      </DockField>

      <DockField label="Width">
        <input
          type="number"
          value={widthDraft.draft}
          onChange={widthDraft.onChange}
          onFocus={widthDraft.onFocus}
          onBlur={widthDraft.onBlur}
          onKeyDown={widthDraft.onKeyDown}
          className={inputClass}
        />
      </DockField>

      <DockField label="Height">
        <input
          type="number"
          value={heightDraft.draft}
          onChange={heightDraft.onChange}
          onFocus={heightDraft.onFocus}
          onBlur={heightDraft.onBlur}
          onKeyDown={heightDraft.onKeyDown}
          className={inputClass}
        />
      </DockField>

      <DockField label="Resolution">
        <select defaultValue="" onChange={handleResolutionPreset} className={selectClass}>
          <option value="" disabled>
            Preset…
          </option>
          {RESOLUTION_PRESETS.map((preset, idx) => (
            <option key={preset.label} value={idx}>
              {preset.label}
            </option>
          ))}
        </select>
      </DockField>

      <DockField label="Cols">
        <input
          type="number"
          value={colsDraft.draft}
          onChange={colsDraft.onChange}
          onFocus={colsDraft.onFocus}
          onBlur={colsDraft.onBlur}
          onKeyDown={colsDraft.onKeyDown}
          className={inputClass}
        />
      </DockField>

      <DockField label="Rows">
        <input
          type="number"
          value={rowsDraft.draft}
          onChange={rowsDraft.onChange}
          onFocus={rowsDraft.onFocus}
          onBlur={rowsDraft.onBlur}
          onKeyDown={rowsDraft.onKeyDown}
          className={inputClass}
        />
      </DockField>

      <DockField label="Grid">
        <select defaultValue="" onChange={handleGridPreset} className={selectClass}>
          <option value="" disabled>
            Preset…
          </option>
          {GRID_PRESETS.map((preset, idx) => (
            <option key={preset.label} value={idx}>
              {preset.label}
            </option>
          ))}
        </select>
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
