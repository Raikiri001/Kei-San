import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { HEADER_HEIGHT, RAIL_WIDTH } from "@/constants/defaults";
import { RailIconButton } from "@/components/ToolRail/RailIconButton";
import {
  CanvasSettingsIcon,
  FolderIcon,
  GlowIcon,
  GridLayoutIcon,
  ImageEffectsIcon,
  PaletteIcon,
  TextContentIcon,
  UploadIcon,
} from "@/components/RadialMenu/icons";

function RailDivider() {
  return <div className="my-1 h-px w-10 shrink-0" style={{ background: "rgb(var(--bar-border) / 0.14)" }} />;
}

/**
 * The left tool rail: content-adding tools and canvas configuration, docked
 * below the header — the same split Canva (Elements/Text/Uploads/Projects)
 * and Illustrator (Tools panel) both use. Document-level actions (name,
 * undo/redo, save/export) live in the header; "things you reach for while
 * building" live here, instead of every action being mixed into one flat bar.
 *
 * Every button that opens something (Upload, Image FX, Text FX, Canvas,
 * Color, Designs) opens the exact same way now: a left-docked panel that
 * pushes the ruler/canvas over (see uiStore's activeLeftPanel and
 * LeftDockPanel.tsx) — no more popovers or centered dialogs, one consistent
 * expand pattern for every rail trigger.
 */
export function ToolRail() {
  const addText = useProjectStore((s) => s.addText);
  const autoLayoutImages = useProjectStore((s) => s.autoLayoutImages);
  const images = useProjectStore((s) => s.project.images);
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const setEditingTextId = useUIStore((s) => s.setEditingTextId);
  const activeLeftPanel = useUIStore((s) => s.activeLeftPanel);
  const openLeftPanel = useUIStore((s) => s.openLeftPanel);
  const openEffectsDrawer = useUIStore((s) => s.openEffectsDrawer);
  const closeLeftPanel = useUIStore((s) => s.closeLeftPanel);

  function handleAddText() {
    const id = addText();
    setSelectedElementId(id);
    setEditingTextId(id);
  }

  // Targets whichever selected elements are actually images — same fallback
  // as opening the panel with nothing selected (it shows "Select an image
  // first" on its own), so this button works whether or not anything's
  // selected yet.
  function handleOpenImageEffects() {
    if (activeLeftPanel === "effects") {
      closeLeftPanel();
      return;
    }
    const imageIds = new Set(images.map((i) => i.id));
    openEffectsDrawer(selectedElementIds.filter((id) => imageIds.has(id)));
  }

  return (
    <nav
      // z-45: above the push-docked left panels (z-40) — a closed panel's
      // translated position still technically overlaps the rail's screen
      // region, so the rail needs to stay stacked on top there so it isn't
      // briefly painted over. Below the true floating overlays (radial menu,
      // dialogs — z-50), which should still appear above the rail.
      className="chrome-bar rail-bar fixed left-0 z-[45] flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden py-4"
      style={{ top: HEADER_HEIGHT, bottom: 0, width: RAIL_WIDTH }}
    >
      <RailIconButton
        onClick={() => openLeftPanel("upload")}
        icon={<UploadIcon />}
        label="Upload"
        active={activeLeftPanel === "upload"}
        ariaExpanded={activeLeftPanel === "upload"}
      />
      <RailIconButton onClick={autoLayoutImages} icon={<GridLayoutIcon />} label="Auto-Fill" />
      <RailIconButton
        onClick={handleOpenImageEffects}
        icon={<ImageEffectsIcon />}
        label="Image FX"
        active={activeLeftPanel === "effects"}
        ariaExpanded={activeLeftPanel === "effects"}
      />

      <RailDivider />

      <RailIconButton onClick={handleAddText} icon={<TextContentIcon />} label="Text" />
      <RailIconButton
        onClick={() => openLeftPanel("textEffects")}
        icon={<GlowIcon />}
        label="Text FX"
        active={activeLeftPanel === "textEffects"}
        ariaExpanded={activeLeftPanel === "textEffects"}
      />

      <RailDivider />

      <RailIconButton
        onClick={() => openLeftPanel("canvasSettings")}
        icon={<CanvasSettingsIcon />}
        label="Canvas"
        active={activeLeftPanel === "canvasSettings"}
        ariaExpanded={activeLeftPanel === "canvasSettings"}
      />
      <RailIconButton
        onClick={() => openLeftPanel("backgroundColor")}
        icon={<PaletteIcon />}
        label="Color"
        active={activeLeftPanel === "backgroundColor"}
        ariaExpanded={activeLeftPanel === "backgroundColor"}
      />

      <RailDivider />

      <RailIconButton
        onClick={() => openLeftPanel("designs")}
        icon={<FolderIcon />}
        label="Designs"
        active={activeLeftPanel === "designs"}
        ariaExpanded={activeLeftPanel === "designs"}
      />
    </nav>
  );
}
