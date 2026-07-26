import { useUIStore } from "@/store/uiStore";
import { LeftDockPanel } from "@/components/LeftDockPanel";
import { SectionHeading } from "@/components/EffectsDrawer/SectionHeading";
import { TEXT_EFFECTS_PANEL_WIDTH } from "@/constants/defaults";

/**
 * Text Effects' left-docked panel — same shared shell and split layout as
 * Image Effects (Active Stack on top, Presets/Effects below, each half the
 * panel's height with its own scroll), but with no actual effects wired up
 * yet: the button + working open/close/push/split behavior is the whole
 * scope for now, real content comes later.
 */
export function TextEffectsDrawer() {
  const open = useUIStore((s) => s.activeLeftPanel === "textEffects");
  const closeLeftPanel = useUIStore((s) => s.closeLeftPanel);

  return (
    <LeftDockPanel open={open} onClose={closeLeftPanel} title="Text Effects" width={TEXT_EFFECTS_PANEL_WIDTH}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="bar-card flex min-h-0 flex-1 flex-col rounded-2xl p-4">
          <div className="mb-4 shrink-0">
            <SectionHeading hint="Everything applied to the selected text, newest on top first.">Active Stack</SectionHeading>
          </div>
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
            <p className="text-[11px] opacity-50">No effects added yet.</p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-4 shrink-0">
            <SectionHeading hint="Browse and add text presets and effects.">Presets &amp; Effects</SectionHeading>
          </div>
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
            <p className="text-[12px] opacity-50">Text effects are coming soon.</p>
          </div>
        </div>
      </div>
    </LeftDockPanel>
  );
}
