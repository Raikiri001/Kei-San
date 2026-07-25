import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { HEADER_HEIGHT, RAIL_WIDTH } from "@/constants/defaults";
import { CanvasSettingsPopover } from "@/components/ControlDock/CanvasSettingsPopover";
import { BackgroundColorPopover } from "@/components/ControlDock/BackgroundColorPopover";
import { RailIconButton } from "@/components/ToolRail/RailIconButton";
import { FolderIcon, GridLayoutIcon, TextContentIcon, UploadIcon } from "@/components/RadialMenu/icons";

function RailDivider() {
  return <div className="my-1 h-px w-10 shrink-0" style={{ background: "rgb(var(--chrome-border) / 0.14)" }} />;
}

/**
 * The left tool rail: content-adding tools and canvas configuration, docked
 * below the header — the same split Canva (Elements/Text/Uploads/Projects)
 * and Illustrator (Tools panel) both use. Document-level actions (name,
 * undo/redo, save/export) live in the header; "things you reach for while
 * building" live here, instead of every action being mixed into one flat bar.
 */
export function ToolRail() {
  const addText = useProjectStore((s) => s.addText);
  const autoLayoutImages = useProjectStore((s) => s.autoLayoutImages);
  const setUploadDialogOpen = useUIStore((s) => s.setUploadDialogOpen);
  const setDesignsDrawerOpen = useUIStore((s) => s.setDesignsDrawerOpen);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const setEditingTextId = useUIStore((s) => s.setEditingTextId);

  function handleAddText() {
    const id = addText();
    setSelectedElementId(id);
    setEditingTextId(id);
  }

  return (
    <nav
      className="glass-panel rail-bar fixed left-0 z-40 flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden py-4"
      style={{ top: HEADER_HEIGHT, bottom: 0, width: RAIL_WIDTH }}
    >
      <RailIconButton onClick={() => setUploadDialogOpen(true)} icon={<UploadIcon />} label="Upload" />
      <RailIconButton onClick={autoLayoutImages} icon={<GridLayoutIcon />} label="Auto-Fill" />
      <RailIconButton onClick={handleAddText} icon={<TextContentIcon />} label="Text" />

      <RailDivider />

      <CanvasSettingsPopover />
      <BackgroundColorPopover />

      <RailDivider />

      <RailIconButton onClick={() => setDesignsDrawerOpen(true)} icon={<FolderIcon />} label="Designs" />
    </nav>
  );
}
