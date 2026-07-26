import { useEffect, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useProjectStore } from "@/store/projectStore";
import { deleteDesign, loadDesignsHistory } from "@/store/persistence";
import { DesignCard } from "@/components/DesignsDrawer/DesignCard";
import { LeftDockPanel } from "@/components/LeftDockPanel";
import { DESIGNS_PANEL_WIDTH } from "@/constants/defaults";
import type { SavedDesign } from "@/store/types";

/**
 * My Designs' left-docked panel — previously a right-docked floating dialog,
 * now the same shared push/expand shell as every other rail panel (Image
 * Effects, Upload, Canvas Settings, Background Color).
 */
export function DesignsDrawer() {
  const open = useUIStore((s) => s.activeLeftPanel === "designs");
  const closeLeftPanel = useUIStore((s) => s.closeLeftPanel);
  const guardDirty = useUIStore((s) => s.guardDirty);
  const loadProject = useProjectStore((s) => s.loadProject);

  const [designs, setDesigns] = useState<SavedDesign[]>([]);

  useEffect(() => {
    if (open) setDesigns(loadDesignsHistory());
  }, [open]);

  function handleSelect(design: SavedDesign) {
    guardDirty(() => {
      loadProject(design);
      closeLeftPanel();
    }, `Discard unsaved changes and load "${design.name || "Untitled"}"?`);
  }

  function handleDelete(id: string) {
    deleteDesign(id);
    setDesigns(loadDesignsHistory());
  }

  return (
    <LeftDockPanel open={open} onClose={closeLeftPanel} title="My Designs" width={DESIGNS_PANEL_WIDTH}>
      {designs.length === 0 ? (
        <p className="mt-8 text-center text-[12px] opacity-50">No saved designs yet.</p>
      ) : (
        <div className="thin-scroll -mx-6 flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-6 pb-4">
          {designs.map((design) => (
            <DesignCard key={design.id} design={design} onSelect={() => handleSelect(design)} onDelete={() => handleDelete(design.id)} />
          ))}
        </div>
      )}
    </LeftDockPanel>
  );
}
