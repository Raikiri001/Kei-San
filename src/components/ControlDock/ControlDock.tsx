import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { downloadCanvas, renderProjectToCanvas } from "@/canvas/exportEngine";
import { saveCurrentProject } from "@/store/persistence";
import { CanvasSettingsPopover } from "@/components/ControlDock/CanvasSettingsPopover";
import { BackgroundColorPopover } from "@/components/ControlDock/BackgroundColorPopover";
import { ToolbarIconButton } from "@/components/ControlDock/ToolbarIconButton";
import {
  DownloadIcon,
  FolderIcon,
  GridLayoutIcon,
  NewDesignIcon,
  SaveIcon,
  TextContentIcon,
  UploadIcon,
} from "@/components/RadialMenu/icons";

/** Vertical rule between control groups — fixed at the row's own h-9 so it never
 * makes the toolbar taller than its shortest control, unlike the old per-section
 * dividers that were hand-tuned to whatever neighbor happened to be tallest. */
function DockDivider() {
  return <div className="h-9 w-px shrink-0" style={{ background: "rgb(var(--chrome-border) / 0.2)" }} />;
}

export function ControlDock() {
  const project = useProjectStore((s) => s.project);
  const setName = useProjectStore((s) => s.setName);
  const addText = useProjectStore((s) => s.addText);
  const resetToNewDesign = useProjectStore((s) => s.resetToNewDesign);
  const autoLayoutImages = useProjectStore((s) => s.autoLayoutImages);

  const guardDirty = useUIStore((s) => s.guardDirty);
  const markClean = useUIStore((s) => s.markClean);
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

  async function handleSave() {
    await saveCurrentProject(project);
    markClean();
  }

  function handleNewDesign() {
    guardDirty(() => resetToNewDesign(), "Discard unsaved changes and start a new design?");
  }

  return (
    <div className="pointer-events-auto relative flex flex-wrap items-center gap-3 px-5 py-3">
      {/* Decorative backdrop, not the content box: a clip-path'd element clips
          its whole rendered subtree, including children that intentionally
          escape via absolute positioning (Canvas Settings' dropdown). Keeping
          glass-panel/corner-frame on this separate -z-10 layer instead of the
          real content wrapper is what lets that dropdown render past the
          toolbar's own bottom edge instead of being clipped away to nothing. */}
      <div className="glass-panel corner-frame absolute inset-0 -z-10">
        <span className="corner-tl" />
        <span className="corner-bl" />
        <span className="corner-br" />
      </div>

      {/* Brand — single-line lockup, height-matched (h-9) to every control in the
          row so the toolbar reads as one uniform strip instead of a taller logo
          block sitting above shorter buttons. */}
      <div className="flex h-9 items-center gap-1 pr-1">
        <span
          className="text-[22px] font-black leading-none"
          style={{
            fontFamily: '"Noto Sans JP", sans-serif',
            color: "var(--color-accent)",
            textShadow: "0 0 16px rgb(var(--color-accent-glow) / 0.5)",
          }}
        >
          景
        </span>
        <span
          className="text-[13px] font-semibold leading-none opacity-80"
          style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
        >
          さん
        </span>
      </div>

      <DockDivider />

      {/* Project group: name, save, and export all act on the current project,
          so they live together — save persists it, export renders it out. */}
      <input
        value={project.name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => saveCurrentProject(project)}
        placeholder="Untitled Project"
        className="glass-panel h-9 w-40 rounded px-2 text-[12px] outline-none focus:border-accent/60"
      />
      <ToolbarIconButton onClick={handleSave} icon={<SaveIcon />} label="Save" />
      <ToolbarIconButton onClick={handleExport} icon={<DownloadIcon />} label="Export Wallpaper" />

      <DockDivider />

      {/* File group: create a new design or jump back into a saved one. */}
      <ToolbarIconButton onClick={handleNewDesign} icon={<NewDesignIcon />} label="New Design" />
      <ToolbarIconButton onClick={() => setDesignsDrawerOpen(true)} icon={<FolderIcon />} label="My Designs" />

      <DockDivider />

      {/* Canvas group: canvas-level configuration (size, grid, background). */}
      <CanvasSettingsPopover />
      <BackgroundColorPopover />

      <DockDivider />

      {/* Content group: tools that add elements to the canvas. Upload Image and
          Auto-Fill Layout stay adjacent — both act on the image workflow
          (bring images in, then auto-arrange them), unlike Add Text. */}
      <ToolbarIconButton onClick={() => setUploadDialogOpen(true)} icon={<UploadIcon />} label="Upload Image" />
      <ToolbarIconButton onClick={autoLayoutImages} icon={<GridLayoutIcon />} label="Auto-Fill Layout" />
      <ToolbarIconButton onClick={handleAddText} icon={<TextContentIcon />} label="Add Text" />
    </div>
  );
}
