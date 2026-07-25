import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { HEADER_HEIGHT, RAIL_WIDTH } from "@/constants/defaults";
import { CanvasSettingsPopover } from "@/components/ControlDock/CanvasSettingsPopover";
import { BackgroundColorPopover } from "@/components/ControlDock/BackgroundColorPopover";
import { RailIconButton } from "@/components/ToolRail/RailIconButton";
import { FolderIcon, GlowIcon, GridLayoutIcon, ImageEffectsIcon, TextContentIcon, UploadIcon } from "@/components/RadialMenu/icons";

function RailDivider() {
  return <div className="my-1 h-px w-10 shrink-0" style={{ background: "rgb(var(--bar-border) / 0.14)" }} />;
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
  const images = useProjectStore((s) => s.project.images);
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const setUploadDialogOpen = useUIStore((s) => s.setUploadDialogOpen);
  const setDesignsDrawerOpen = useUIStore((s) => s.setDesignsDrawerOpen);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const setEditingTextId = useUIStore((s) => s.setEditingTextId);
  const openEffectsDrawer = useUIStore((s) => s.openEffectsDrawer);
  const effectsDrawerOpen = useUIStore((s) => s.effectsDrawerOpen);
  const setEffectsDrawerOpen = useUIStore((s) => s.setEffectsDrawerOpen);
  const textEffectsDrawerOpen = useUIStore((s) => s.textEffectsDrawerOpen);
  const setTextEffectsDrawerOpen = useUIStore((s) => s.setTextEffectsDrawerOpen);

  function handleAddText() {
    const id = addText();
    setSelectedElementId(id);
    setEditingTextId(id);
  }

  // Targets whichever selected elements are actually images — same fallback
  // as opening the drawer with nothing selected (it shows "Select an image
  // first" on its own), so this button works whether or not anything's
  // selected yet.
  function handleOpenImageEffects() {
    if (effectsDrawerOpen) {
      setEffectsDrawerOpen(false);
      return;
    }
    const imageIds = new Set(images.map((i) => i.id));
    openEffectsDrawer(selectedElementIds.filter((id) => imageIds.has(id)));
  }

  return (
    <nav
      // z-45: above the push-docked Image/Text Effects panels (z-40) — those
      // panels' "closed" position is translated just off past the rail's own
      // width, which still technically overlaps the rail's screen region;
      // the rail needs to stay stacked on top there so it isn't briefly
      // painted over. Below the true floating overlays (radial menu,
      // popovers, dialogs — z-50), which should still appear above the rail.
      className="chrome-bar rail-bar fixed left-0 z-[45] flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden py-4"
      style={{ top: HEADER_HEIGHT, bottom: 0, width: RAIL_WIDTH }}
    >
      <RailIconButton onClick={() => setUploadDialogOpen(true)} icon={<UploadIcon />} label="Upload" />
      <RailIconButton onClick={autoLayoutImages} icon={<GridLayoutIcon />} label="Auto-Fill" />
      <RailIconButton onClick={handleOpenImageEffects} icon={<ImageEffectsIcon />} label="Image FX" active={effectsDrawerOpen} ariaExpanded={effectsDrawerOpen} />

      <RailDivider />

      <RailIconButton onClick={handleAddText} icon={<TextContentIcon />} label="Text" />
      <RailIconButton
        onClick={() => setTextEffectsDrawerOpen(!textEffectsDrawerOpen)}
        icon={<GlowIcon />}
        label="Text FX"
        active={textEffectsDrawerOpen}
        ariaExpanded={textEffectsDrawerOpen}
      />

      <RailDivider />

      <CanvasSettingsPopover />
      <BackgroundColorPopover />

      <RailDivider />

      <RailIconButton onClick={() => setDesignsDrawerOpen(true)} icon={<FolderIcon />} label="Designs" />
    </nav>
  );
}
