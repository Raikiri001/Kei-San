import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { HEADER_HEIGHT } from "@/constants/defaults";
import { downloadCanvas, renderProjectToCanvas } from "@/canvas/exportEngine";
import { saveCurrentProject } from "@/store/persistence";
import { ToolbarIconButton } from "@/components/ControlDock/ToolbarIconButton";
import { DownloadIcon, NewDesignIcon, RedoIcon, SaveIcon, UndoIcon } from "@/components/RadialMenu/icons";

/** Vertical rule between control groups — fixed at the row's own h-6 so it never
 * makes the header taller than its shortest control. */
function DockDivider() {
  return <div className="mx-1 h-6 w-px shrink-0" style={{ background: "rgb(var(--chrome-border) / 0.14)" }} />;
}

/**
 * The header: document-level chrome only — identity (logo/name), edit history
 * (undo/redo), and file lifecycle (new/save/export). Content-adding tools and
 * canvas configuration live in the left ToolRail instead (see its own doc
 * comment for why), the same split Canva and Illustrator both use. Fixed,
 * full-width, permanently at its full size — no idle-collapse, no hover-to-
 * expand; the ruler and canvas both dock below it (see App.tsx).
 */
export function ControlDock() {
  const project = useProjectStore((s) => s.project);
  const setName = useProjectStore((s) => s.setName);
  const resetToNewDesign = useProjectStore((s) => s.resetToNewDesign);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);

  const guardDirty = useUIStore((s) => s.guardDirty);
  const markClean = useUIStore((s) => s.markClean);

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
    <header className="glass-panel header-bar fixed inset-x-0 top-0 z-40 flex items-center" style={{ height: HEADER_HEIGHT }}>
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-5 px-8">
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="text-[20px] font-black leading-none"
            style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              color: "var(--color-accent)",
              textShadow: "0 0 16px rgb(var(--color-accent-glow) / 0.5)",
            }}
          >
            景さん
          </span>
        </div>

        <DockDivider />

        <input
          value={project.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => saveCurrentProject(project)}
          placeholder="Untitled Project"
          className="glass-panel h-10 w-48 shrink-0 rounded-full px-4 text-[12px] outline-none transition-colors duration-150 focus:border-accent/60"
        />

        {/* Edit history — undo/redo are frequent, glance-and-click actions in
            every real design app's header, so they get compact icon-only
            buttons rather than the wordier icon+label toolbar-btn style. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            aria-label="Undo"
            className="accent-glow-hover press-scale flex h-9 w-9 items-center justify-center rounded-full border border-transparent opacity-80 transition-opacity duration-150 hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
          >
            <span className="flex h-4 w-4 items-center justify-center">
              <UndoIcon />
            </span>
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo"
            className="accent-glow-hover press-scale flex h-9 w-9 items-center justify-center rounded-full border border-transparent opacity-80 transition-opacity duration-150 hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
          >
            <span className="flex h-4 w-4 items-center justify-center">
              <RedoIcon />
            </span>
          </button>
        </div>

        <div className="min-w-0 flex-1" />

        {/* File lifecycle group, right-aligned: New/Save stay in the calm
            outline style, Export is the one filled accent button — same role
            as Canva's purple Share button, the single loud action in the bar. */}
        <div className="flex shrink-0 items-center gap-3">
          <ToolbarIconButton onClick={handleNewDesign} icon={<NewDesignIcon />} label="New" />
          <ToolbarIconButton onClick={handleSave} icon={<SaveIcon />} label="Save" />
          <button
            type="button"
            onClick={handleExport}
            className="accent-btn press-scale flex h-10 items-center gap-2 rounded-full px-5"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              <DownloadIcon />
            </span>
            <span className="shrink-0 whitespace-nowrap text-[12px] font-semibold">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
}
