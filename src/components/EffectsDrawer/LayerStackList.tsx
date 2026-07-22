import { Reorder } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { LayerRow } from "@/components/EffectsDrawer/LayerRow";
import { GroupLayerRow } from "@/components/EffectsDrawer/GroupLayerRow";
import { MixLayerRow } from "@/components/EffectsDrawer/MixLayerRow";
import type { ImageElement } from "@/store/types";

interface LayerStackListProps {
  image: ImageElement;
  selectedLayerId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The full top-level layer stack — every effect/group/mix layer, regardless of
 * enabled state (a disabled layer stays visible with its toggle off, rather than
 * disappearing, so it can be re-enabled or deleted later) — draggable via `motion`'s
 * `Reorder.Group`. Lists topmost-composited-first (index 0 in `image.layers` renders
 * first/at the bottom, the last index renders last/on top — see glRenderer.ts's
 * renderEffectStack — but every real layers panel, Photoshop included, shows the
 * *visual* top of the stack at the *top* of the list), so the displayed order is the
 * reverse of the storage order: reversed for `localOrder`, un-reversed again before
 * calling `setLayerOrder`. Mirrors this app's existing preview-then-commit
 * convention (resize/rotate/crop): `localOrder` is local state so the drag animation
 * works, flushed to the store only on drag end so the GPU recompute doesn't thrash
 * mid-drag.
 */
export function LayerStackList({ image, selectedLayerId, onSelect }: LayerStackListProps) {
  const setLayerOrder = useProjectStore((s) => s.setLayerOrder);
  const updateEffectLayer = useProjectStore((s) => s.updateEffectLayer);
  const updateGroupLayer = useProjectStore((s) => s.updateGroupLayer);
  const updateMixLayer = useProjectStore((s) => s.updateMixLayer);
  const addBranchEffectLayer = useProjectStore((s) => s.addBranchEffectLayer);
  const setBranchLayerOrder = useProjectStore((s) => s.setBranchLayerOrder);
  const deleteLayer = useProjectStore((s) => s.deleteLayer);

  const [localOrder, setLocalOrder] = useState(() => [...image.layers].reverse().map((l) => l.id));
  const localOrderRef = useRef(localOrder);
  localOrderRef.current = localOrder;

  useEffect(() => {
    setLocalOrder([...image.layers].reverse().map((l) => l.id));
  }, [image.layers]);

  if (image.layers.length === 0) {
    return <p className="text-[11px] opacity-50">No effects added yet — click one below to add it here.</p>;
  }

  const byId = new Map(image.layers.map((l) => [l.id, l]));
  const commitOrder = () => setLayerOrder([image.id], [...localOrderRef.current].reverse());

  return (
    <Reorder.Group axis="y" values={localOrder} onReorder={setLocalOrder} className="flex flex-col gap-2">
      {localOrder.map((id) => {
        const layer = byId.get(id);
        if (!layer) return null;
        const dragHandle = <span className="cursor-grab px-1 opacity-40 active:cursor-grabbing">⠿</span>;

        if (layer.kind === "group") {
          return (
            <Reorder.Item key={id} value={id} onDragEnd={commitOrder}>
              <GroupLayerRow
                group={layer}
                dragHandle={dragHandle}
                onToggleEnabled={() => updateGroupLayer([image.id], layer.id, { enabled: !layer.enabled })}
                onToggleExpanded={() => updateGroupLayer([image.id], layer.id, { expanded: !layer.expanded })}
                onDelete={() => deleteLayer([image.id], layer.id)}
                onToggleChildEnabled={(childId) => {
                  const child = layer.children.find((c) => c.id === childId);
                  if (child) updateEffectLayer([image.id], childId, { enabled: !child.enabled });
                }}
                onDeleteChild={(childId) => deleteLayer([image.id], childId)}
                onSelectChild={onSelect}
                selectedLayerId={selectedLayerId}
              />
            </Reorder.Item>
          );
        }

        if (layer.kind === "mix") {
          return (
            <Reorder.Item key={id} value={id} onDragEnd={commitOrder}>
              <MixLayerRow
                mix={layer}
                dragHandle={dragHandle}
                onToggleEnabled={() => updateMixLayer([image.id], layer.id, { enabled: !layer.enabled })}
                onToggleExpanded={() => updateMixLayer([image.id], layer.id, { expanded: !layer.expanded })}
                onDelete={() => deleteLayer([image.id], layer.id)}
                onAddToBranch={(branch, type) => addBranchEffectLayer([image.id], layer.id, branch, type)}
                onReorderBranch={(branch, order) => setBranchLayerOrder([image.id], layer.id, branch, order)}
                onToggleChild={(childId) => {
                  const child = [...layer.branchA, ...layer.branchB].find((c) => c.id === childId);
                  if (child) updateEffectLayer([image.id], childId, { enabled: !child.enabled });
                }}
                onDeleteChild={(childId) => deleteLayer([image.id], childId)}
                onSelect={onSelect}
                selectedLayerId={selectedLayerId}
              />
            </Reorder.Item>
          );
        }

        return (
          <Reorder.Item key={id} value={id} onDragEnd={commitOrder}>
            <LayerRow
              layer={layer}
              dragHandle={dragHandle}
              selected={layer.id === selectedLayerId}
              onSelect={() => onSelect(layer.id)}
              onToggleEnabled={() => updateEffectLayer([image.id], layer.id, { enabled: !layer.enabled })}
              onDelete={() => deleteLayer([image.id], layer.id)}
            />
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}
