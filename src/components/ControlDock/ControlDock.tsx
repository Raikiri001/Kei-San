import type { ReactNode } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { downloadCanvas, renderProjectToCanvas } from "@/canvas/exportEngine";
import { saveCurrentProject } from "@/store/persistence";
import { CanvasSettingsPopover } from "@/components/ControlDock/CanvasSettingsPopover";
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

/** Single-row icon+label pill, height-matched to every other top-level dock control
 * (project name input, Canvas Settings trigger) so the toolbar reads as one
 * consistent row instead of a mix of stacked buttons and nested field panels. */
function DockButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="corner-frame glass-panel accent-glow-hover press-sweep group relative flex h-9 items-center gap-2 px-3 text-[11px] uppercase tracking-wide transition-colors hover:text-accent"
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
  const addText = useProjectStore((s) => s.addText);
  const resetToNewDesign = useProjectStore((s) => s.resetToNewDesign);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const guardDirty = useUIStore((s) => s.guardDirty);
  const setDesignsDrawerOpen = useUIStore((s) => s.setDesignsDrawerOpen);
  const setUploadDialogOpen = useUIStore((s) => s.setUploadDialogOpen);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const setEditingTextId = useUIStore((s) => s.setEditingTextId);

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

  return (
    <div className="glass-panel cut-corner pointer-events-auto relative flex flex-wrap items-end gap-3 px-5 py-3">
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
          className="glass-panel h-9 w-40 rounded px-2 text-[12px] outline-none focus:border-accent/60"
        />
      </DockField>

      <CanvasSettingsPopover />

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
