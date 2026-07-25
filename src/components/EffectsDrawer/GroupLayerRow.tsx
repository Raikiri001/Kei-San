import clsx from "clsx";
import type { ReactNode } from "react";
import { DeleteIcon } from "@/components/RadialMenu/icons";
import { LayerRow } from "@/components/EffectsDrawer/LayerRow";
import type { PresetGroupLayer } from "@/store/types";

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={clsx("h-3.5 w-3.5 shrink-0 transition-transform", expanded && "rotate-90")}
    >
      <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface GroupLayerRowProps {
  group: PresetGroupLayer;
  dragHandle?: ReactNode;
  onToggleEnabled: () => void;
  onToggleExpanded: () => void;
  onDelete: () => void;
  onToggleChildEnabled: (childId: string) => void;
  onDeleteChild: (childId: string) => void;
  onSelectChild: (childId: string) => void;
  selectedLayerId: string | null;
}

/** A preset group's row in the Active Stack panel — collapsible (chevron) to reveal
 * its own constituent effect layers, each independently toggleable/deletable/
 * selectable (for the Inspector) via LayerRow, matching the reference product's
 * expandable "Xerox > Threshold, Noise, Noise" layer-group pattern. The group's own
 * enabled toggle is a master switch over every child at once; deleting the group
 * removes it and all its children together. Children list topmost-composited-first,
 * same reversed convention as the top-level Active Stack (see LayerStackList.tsx). */
export function GroupLayerRow({
  group,
  dragHandle,
  onToggleEnabled,
  onToggleExpanded,
  onDelete,
  onToggleChildEnabled,
  onDeleteChild,
  onSelectChild,
  selectedLayerId,
}: GroupLayerRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="group glass-panel flex items-center gap-2 rounded-xl p-3">
        {dragHandle}
        <button type="button" onClick={onToggleExpanded} aria-label={group.expanded ? "Collapse" : "Expand"} className="press-scale flex h-5 w-5 items-center justify-center">
          <ChevronIcon expanded={group.expanded} />
        </button>
        <span className="flex-1 text-[12.5px] font-medium">{group.name}</span>
        <button
          type="button"
          onClick={onToggleEnabled}
          aria-label={group.enabled ? "Disable" : "Enable"}
          className={clsx(
            "h-4 w-8 shrink-0 rounded-full border transition-colors",
            group.enabled ? "border-[rgb(var(--status-active-rgb)/0.7)] bg-[rgb(var(--status-active-rgb)/0.3)]" : "border-white/20 bg-white/5",
          )}
        >
          <span
            className={clsx(
              "block h-3 w-3 rounded-full bg-current transition-transform",
              group.enabled ? "translate-x-4 text-[rgb(var(--status-active-rgb))]" : "translate-x-0.5 text-white/40",
            )}
          />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete preset"
          className="press-scale flex h-6 w-6 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
        >
          <DeleteIcon />
        </button>
      </div>

      {group.expanded && (
        <div className="flex flex-col gap-2">
          {[...group.children].reverse().map((child) => (
            <LayerRow
              key={child.id}
              layer={child}
              nested
              selected={child.id === selectedLayerId}
              onSelect={() => onSelectChild(child.id)}
              onToggleEnabled={() => onToggleChildEnabled(child.id)}
              onDelete={() => onDeleteChild(child.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
