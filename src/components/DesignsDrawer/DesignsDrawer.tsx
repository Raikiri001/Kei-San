import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useProjectStore } from "@/store/projectStore";
import { deleteDesign, loadDesignsHistory } from "@/store/persistence";
import { DesignCard } from "@/components/DesignsDrawer/DesignCard";
import type { SavedDesign } from "@/store/types";

export function DesignsDrawer() {
  const open = useUIStore((s) => s.designsDrawerOpen);
  const setOpen = useUIStore((s) => s.setDesignsDrawerOpen);
  const guardDirty = useUIStore((s) => s.guardDirty);
  const loadProject = useProjectStore((s) => s.loadProject);

  const [designs, setDesigns] = useState<SavedDesign[]>([]);

  useEffect(() => {
    if (open) setDesigns(loadDesignsHistory());
  }, [open]);

  function handleSelect(design: SavedDesign) {
    guardDirty(() => {
      loadProject(design);
      setOpen(false);
    }, `Discard unsaved changes and load "${design.name || "Untitled"}"?`);
  }

  function handleDelete(id: string) {
    deleteDesign(id);
    setDesigns(loadDesignsHistory());
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        {/* Fixed neutral scrim (not a --chrome-* token) is intentional: its job is
            universal page-dimming behind the drawer regardless of theme — tokenizing it
            to the light theme's near-white --chrome-bg would make it disappear. */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content
          className="glass-panel corner-frame fixed right-0 top-0 z-50 h-full w-[320px] overflow-y-auto p-4 shadow-2xl outline-none data-[state=open]:animate-[slide-in-right_200ms_ease-out]"
        >
          <span className="corner-tl" />
          <span className="corner-bl" />
          <Dialog.Title className="mb-4 text-[12px] uppercase tracking-wide">My Designs</Dialog.Title>

          {designs.length === 0 ? (
            <p className="mt-8 text-center text-[12px] opacity-50">No saved designs yet.</p>
          ) : (
            <div className="thin-scroll flex flex-col gap-3 overflow-y-auto pb-4">
              {designs.map((design) => (
                <DesignCard
                  key={design.id}
                  design={design}
                  onSelect={() => handleSelect(design)}
                  onDelete={() => handleDelete(design.id)}
                />
              ))}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
