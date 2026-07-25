import { Reorder } from "motion/react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { DeleteIcon } from "@/components/RadialMenu/icons";
import { LayerRow } from "@/components/EffectsDrawer/LayerRow";
import { BRANCH_EFFECT_TYPES, EFFECT_LABELS } from "@/components/EffectsDrawer/effectLabels";
import { InfoTooltip } from "@/components/InfoTooltip";
import type { EffectLayer, MixLayer, StackableEffectType } from "@/store/types";

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

function AddEffectPicker({ onAdd }: { onAdd: (type: StackableEffectType) => void }) {
  return (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value) onAdd(e.target.value as StackableEffectType);
        e.target.value = "";
      }}
      className="w-full rounded border border-[rgb(var(--chrome-border)/0.3)] bg-transparent px-2 py-1.5 text-[11px] uppercase tracking-wide opacity-70"
    >
      <option value="" className="bg-black text-white">
        + Add Effect
      </option>
      {BRANCH_EFFECT_TYPES.map((type) => (
        <option key={type} value={type} className="bg-black text-white">
          {EFFECT_LABELS[type]}
        </option>
      ))}
    </select>
  );
}

interface BranchListProps {
  label: string;
  layers: EffectLayer[];
  onReorder: (newOrder: string[]) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedLayerId: string | null;
  onAdd: (type: StackableEffectType) => void;
}

/** One of a Layer Mix's two branches — its own small reorderable mini-stack, mirroring
 * LayerStackList's own local-state-then-commit-on-drag-end pattern so a branch's drag
 * animation doesn't thrash the store (and the GPU recompute it triggers) mid-drag.
 * Lists topmost-composited-first, same reversed convention as the top-level Active
 * Stack (see LayerStackList.tsx) — reversed for display, un-reversed before committing. */
function BranchList({ label, layers, onReorder, onToggle, onDelete, onSelect, selectedLayerId, onAdd }: BranchListProps) {
  const [localOrder, setLocalOrder] = useState(() => [...layers].reverse().map((l) => l.id));
  const localOrderRef = useRef(localOrder);
  localOrderRef.current = localOrder;

  useEffect(() => {
    setLocalOrder([...layers].reverse().map((l) => l.id));
  }, [layers]);

  const byId = new Map(layers.map((l) => [l.id, l]));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-wide opacity-45">{label}</span>
      {layers.length === 0 ? (
        <p className="text-[10px] opacity-40">Empty. {label === "Branch B" ? "Passes the pre-mix image through unchanged." : "Add an effect below."}</p>
      ) : (
        <Reorder.Group axis="y" values={localOrder} onReorder={setLocalOrder} className="flex flex-col gap-2">
          {localOrder.map((id) => {
            const layer = byId.get(id);
            if (!layer) return null;
            const dragHandle = <span className="cursor-grab px-1 opacity-40 active:cursor-grabbing">⠿</span>;
            return (
              <Reorder.Item key={id} value={id} onDragEnd={() => onReorder([...localOrderRef.current].reverse())}>
                <LayerRow
                  layer={layer}
                  nested
                  dragHandle={dragHandle}
                  selected={layer.id === selectedLayerId}
                  onSelect={() => onSelect(layer.id)}
                  onToggleEnabled={() => onToggle(layer.id)}
                  onDelete={() => onDelete(layer.id)}
                />
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      )}
      <AddEffectPicker onAdd={onAdd} />
    </div>
  );
}

interface MixLayerRowProps {
  mix: MixLayer;
  dragHandle?: React.ReactNode;
  onToggleEnabled: () => void;
  onToggleExpanded: () => void;
  onDelete: () => void;
  onAddToBranch: (branch: "a" | "b", type: StackableEffectType) => void;
  onReorderBranch: (branch: "a" | "b", newOrder: string[]) => void;
  onToggleChild: (childId: string) => void;
  onDeleteChild: (childId: string) => void;
  onSelect: (id: string) => void;
  selectedLayerId: string | null;
}

/** A Layer Mix's row in the Active Stack panel — unlike a normal effect (one
 * transform) or a preset group (a flat set of children), this renders two
 * independent, independently-editable mini effect-chains ("Branch A"/"Branch B").
 * The mix node's own row is itself selectable (opens the Inspector showing how the
 * two branches combine — see MixLayer's doc comment in store/types.ts); each
 * branch's own children are independently selectable too. */
export function MixLayerRow({
  mix,
  dragHandle,
  onToggleEnabled,
  onToggleExpanded,
  onDelete,
  onAddToBranch,
  onReorderBranch,
  onToggleChild,
  onDeleteChild,
  onSelect,
  selectedLayerId,
}: MixLayerRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={clsx(
          "group glass-panel flex items-center gap-2 rounded-xl p-3 transition-colors",
          mix.id === selectedLayerId &&
            "border-accent bg-[rgb(var(--color-accent-glow)/0.12)] shadow-[0_0_0_1px_var(--color-accent)]",
        )}
      >
        {dragHandle}
        <button type="button" onClick={onToggleExpanded} aria-label={mix.expanded ? "Collapse" : "Expand"} className="press-scale flex h-5 w-5 items-center justify-center">
          <ChevronIcon expanded={mix.expanded} />
        </button>
        <button
          type="button"
          onClick={() => onSelect(mix.id)}
          className={clsx(
            "flex-1 truncate text-left text-[12.5px] font-medium",
            mix.id === selectedLayerId && "text-accent",
          )}
        >
          Layer Mix
        </button>
        <button
          type="button"
          onClick={onToggleEnabled}
          aria-label={mix.enabled ? "Disable" : "Enable"}
          className={clsx(
            "h-4 w-8 shrink-0 rounded-full border transition-colors",
            mix.enabled ? "border-[rgb(var(--status-active-rgb)/0.7)] bg-[rgb(var(--status-active-rgb)/0.3)]" : "border-white/20 bg-white/5",
          )}
        >
          <span
            className={clsx(
              "block h-3 w-3 rounded-full bg-current transition-transform",
              mix.enabled ? "translate-x-4 text-[rgb(var(--status-active-rgb))]" : "translate-x-0.5 text-white/40",
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

      {mix.expanded && (
        <div className="glass-panel ml-5 flex flex-col gap-4 rounded-2xl border-l-2 border-l-accent/30 p-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide opacity-45">Branches</span>
            <InfoTooltip text='Select "Layer Mix" above to set how Branch A combines over Branch B.' label="About Branches" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <BranchList
              label="Branch A"
              layers={mix.branchA}
              onReorder={(order) => onReorderBranch("a", order)}
              onToggle={onToggleChild}
              onDelete={onDeleteChild}
              onSelect={onSelect}
              selectedLayerId={selectedLayerId}
              onAdd={(type) => onAddToBranch("a", type)}
            />
            <BranchList
              label="Branch B"
              layers={mix.branchB}
              onReorder={(order) => onReorderBranch("b", order)}
              onToggle={onToggleChild}
              onDelete={onDeleteChild}
              onSelect={onSelect}
              selectedLayerId={selectedLayerId}
              onAdd={(type) => onAddToBranch("b", type)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
