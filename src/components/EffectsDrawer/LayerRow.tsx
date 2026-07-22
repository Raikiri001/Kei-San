import clsx from "clsx";
import type { ReactNode } from "react";
import { DeleteIcon } from "@/components/RadialMenu/icons";
import { EFFECT_LABELS } from "@/components/EffectsDrawer/effectLabels";
import type { EffectLayer } from "@/store/types";

interface LayerRowProps {
  layer: EffectLayer;
  onToggleEnabled: () => void;
  onDelete: () => void;
  /** Opens this layer's settings in the Inspector panel — clicking the row's own
   * name/body, not its toggle/delete/drag-handle. */
  onSelect: () => void;
  selected: boolean;
  /** Rendered as a child inside a preset group or Layer Mix branch: indented, no drag handle. */
  nested?: boolean;
  /** Drag-handle element — only top-level rows are draggable within the Active Stack. */
  dragHandle?: ReactNode;
}

/** One effect layer's row in the Active Stack panel — just its name, enabled toggle,
 * and a hover-revealed delete button. Its actual settings never show inline anymore
 * (matching a real layers panel, which only ever lists layers) — clicking the row
 * opens them in the separate Inspector panel instead (see LayerInspectorPanel.tsx). */
export function LayerRow({ layer, onToggleEnabled, onDelete, onSelect, selected, nested, dragHandle }: LayerRowProps) {
  return (
    <div
      className={clsx(
        "group glass-panel flex items-center gap-2 p-3 transition-colors",
        nested && "ml-5 border-l-2 border-l-accent/30",
        selected && "border-accent/60",
      )}
    >
      {dragHandle}
      <button type="button" onClick={onSelect} className="flex-1 truncate text-left text-[12px] uppercase tracking-wide">
        {EFFECT_LABELS[layer.type]}
      </button>
      <button
        type="button"
        onClick={onToggleEnabled}
        aria-label={layer.enabled ? "Disable" : "Enable"}
        className={clsx(
          "h-4 w-8 shrink-0 rounded-full border transition-colors",
          layer.enabled ? "border-[rgb(var(--status-active-rgb)/0.7)] bg-[rgb(var(--status-active-rgb)/0.3)]" : "border-white/20 bg-white/5",
        )}
      >
        <span
          className={clsx(
            "block h-3 w-3 rounded-full bg-current transition-transform",
            layer.enabled ? "translate-x-4 text-[rgb(var(--status-active-rgb))]" : "translate-x-0.5 text-white/40",
          )}
        />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete layer"
        className="press-scale flex h-6 w-6 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
      >
        <DeleteIcon />
      </button>
    </div>
  );
}
