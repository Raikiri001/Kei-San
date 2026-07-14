import type { ReactNode } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useDraftNumber } from "@/hooks/useDraftNumber";
import { downloadCanvas, renderProjectToCanvas } from "@/canvas/exportEngine";
import { saveCurrentProject } from "@/store/persistence";
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

/** Groups related fields (e.g. width/height/resolution) into their own themed sub-panel. */
function DockGroup({ children }: { children: ReactNode }) {
  return (
    <div className="corner-frame glass-panel relative flex items-end gap-3 px-3 py-2">
      <span className="corner-bl" />
      <span className="corner-br" />
      {children}
    </div>
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
  const addText = useProjectStore((s) => s.addText);
  const resetToNewDesign = useProjectStore((s) => s.resetToNewDesign);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const guardDirty = useUIStore((s) => s.guardDirty);
  const setDesignsDrawerOpen = useUIStore((s) => s.setDesignsDrawerOpen);
  const setUploadDialogOpen = useUIStore((s) => s.setUploadDialogOpen);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const setEditingTextId = useUIStore((s) => s.setEditingTextId);

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

  function handleAddText() {
    const id = addText();
    setSelectedElementId(id);
    setEditingTextId(id);
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

  // Presets are derived, not stored: the select always reflects whatever the
  // current width/height (or cols/rows) actually are, so hand-editing either
  // field while a preset is active automatically flips the dropdown to "Custom"
  // with no extra state to track.
  const resolutionMatchIdx = RESOLUTION_PRESETS.findIndex(
    (p) => p.width === project.width && p.height === project.height,
  );
  const gridMatchIdx = GRID_PRESETS.findIndex((p) => p.cols === project.cols && p.rows === project.rows);

  return (
    <div className="glass-panel corner-frame pointer-events-auto relative flex flex-wrap items-end gap-4 px-5 py-3">
      <span className="corner-bl" />
      <span className="corner-br" />

      <span className="pb-1 text-[15px] font-semibold tracking-wide" style={{ color: "var(--color-accent)" }}>
        景さん
      </span>
      <div className="mx-1 h-9 w-px" style={{ background: "rgb(var(--chrome-border) / 0.2)" }} />

      <DockField label="Project">
        <input
          value={project.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => saveCurrentProject(project)}
          placeholder="Untitled"
          className="glass-panel h-8 w-40 rounded px-2 text-[12px] outline-none focus:border-accent/60"
        />
      </DockField>

      <DockGroup>
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
          <select value={resolutionMatchIdx === -1 ? "custom" : String(resolutionMatchIdx)} onChange={handleResolutionPreset} className={selectClass}>
            {resolutionMatchIdx === -1 && (
              <option value="custom" disabled>
                Custom
              </option>
            )}
            {RESOLUTION_PRESETS.map((preset, idx) => (
              <option key={preset.label} value={idx}>
                {preset.label}
              </option>
            ))}
          </select>
        </DockField>
      </DockGroup>

      <DockGroup>
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
          <select value={gridMatchIdx === -1 ? "custom" : String(gridMatchIdx)} onChange={handleGridPreset} className={selectClass}>
            {gridMatchIdx === -1 && (
              <option value="custom" disabled>
                Custom
              </option>
            )}
            {GRID_PRESETS.map((preset, idx) => (
              <option key={preset.label} value={idx}>
                {preset.label}
              </option>
            ))}
          </select>
        </DockField>
      </DockGroup>

      <div className="mx-1 h-9 w-px" style={{ background: "rgb(var(--chrome-border) / 0.2)" }} />

      <DockButton onClick={() => setUploadDialogOpen(true)} icon={<UploadIcon />}>
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
