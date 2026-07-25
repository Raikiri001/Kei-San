import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { HEADER_HEIGHT, RAIL_WIDTH } from "@/constants/defaults";
import { downloadCanvas, renderProjectToCanvas } from "@/canvas/exportEngine";
import { saveCurrentProject } from "@/store/persistence";
import { ToolbarIconButton } from "@/components/ControlDock/ToolbarIconButton";
import { DownloadIcon, NewDesignIcon, RedoIcon, SaveIcon, UndoIcon } from "@/components/RadialMenu/icons";

/** Vertical rule between control groups — fixed at the row's own h-6 so it never
 * makes the header taller than its shortest control. */
function DockDivider() {
  return <div className="mx-1 h-6 w-px shrink-0" style={{ background: "rgb(var(--bar-border) / 0.14)" }} />;
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
    // z-[45]: same reasoning as ToolRail — above the push-docked Image/Text
    // Effects panels (z-40) so a closed panel's translated position never
    // paints over the header, below true floating overlays (z-50).
    <header className="chrome-bar header-bar fixed inset-x-0 top-0 z-[45] flex items-center" style={{ height: HEADER_HEIGHT }}>
      {/* Logo column: exactly RAIL_WIDTH wide and centered within it, so it
          sits directly above the rail — same column, same alignment — rather
          than floating with the rest of the header's own padding. */}
      <div className="flex h-full shrink-0 items-center justify-center" style={{ width: RAIL_WIDTH }}>
        {/* Logo stays white regardless of theme (brand mark, not chrome
            text) — the dark outline is what keeps it legible once the bar
            itself goes light, instead of white-on-light-gray disappearing. */}
        <span
          className="text-[20px] font-black leading-none"
          style={{
            fontFamily: '"Noto Sans JP", sans-serif',
            color: "#ffffff",
            textShadow:
              "-1px -1px 0 rgb(0 0 0 / 0.55), 1px -1px 0 rgb(0 0 0 / 0.55), -1px 1px 0 rgb(0 0 0 / 0.55), 1px 1px 0 rgb(0 0 0 / 0.55), 0 2px 6px rgb(0 0 0 / 0.35)",
          }}
        >
          景さん
        </span>
      </div>

      <DockDivider />

      <div className="flex min-w-0 flex-1 items-center gap-5 px-6">
        <input
          value={project.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => saveCurrentProject(project)}
          placeholder="Untitled Project"
          className="h-9 w-48 shrink-0 rounded-lg border border-[rgb(var(--bar-border)/0.14)] bg-[rgb(var(--bar-fg)/0.05)] px-3 text-[12px] text-[rgb(var(--bar-fg))] outline-none transition-colors duration-150 placeholder:text-[rgb(var(--bar-fg-dim))] focus:border-[rgb(var(--bar-border)/0.3)]"
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
            className="bar-icon-btn press-scale flex h-9 w-9 items-center justify-center rounded-full disabled:pointer-events-none disabled:opacity-30"
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
            className="bar-icon-btn press-scale flex h-9 w-9 items-center justify-center rounded-full disabled:pointer-events-none disabled:opacity-30"
          >
            <span className="flex h-4 w-4 items-center justify-center">
              <RedoIcon />
            </span>
          </button>
        </div>

        <div className="min-w-0 flex-1" />

        {/* File lifecycle group, pushed fully to the header's own right edge.
            All three — New, Save, Export — now share the exact same calm
            outline toolbar-btn style: Export used to be the one filled,
            glowing pill in the bar, which read as a leftover neon accent
            rather than matching the rest of the (now much quieter) chrome. */}
        <div className="flex shrink-0 items-center gap-3">
          <ToolbarIconButton onClick={handleNewDesign} icon={<NewDesignIcon />} label="New" />
          <ToolbarIconButton onClick={handleSave} icon={<SaveIcon />} label="Save" />
          <ToolbarIconButton onClick={handleExport} icon={<DownloadIcon />} label="Export" />
        </div>
      </div>
    </header>
  );
}
