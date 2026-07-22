import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useProjectStore } from "@/store/projectStore";
import { useLoadedImage } from "@/hooks/useLoadedImage";
import { findLayerById } from "@/store/imageEffects";
import { BUILT_IN_PRESETS } from "@/presets/builtInPresets";
import { EffectCard } from "@/components/EffectsDrawer/EffectCard";
import { PresetCard } from "@/components/EffectsDrawer/PresetCard";
import { LayerStackList } from "@/components/EffectsDrawer/LayerStackList";
import { LayerInspectorPanel } from "@/components/EffectsDrawer/LayerInspectorPanel";
import { ALL_EFFECT_TYPES, CATEGORY_ORDER, EFFECT_CATEGORIES } from "@/components/EffectsDrawer/effectLabels";
import type { StackableEffectType } from "@/store/types";

const MIN_STACK_WIDTH = 380;
const MAX_STACK_WIDTH = 760;
const DEFAULT_STACK_WIDTH = 420;
/** Below this width the Presets/Effects grids show 2 columns, at/above it 3 — driven
 * directly off the same JS width state the resize handle updates, so no separate
 * CSS container query is needed. */
const THREE_COLUMN_THRESHOLD = 560;

/** One entry per category that currently has at least one effect, in
 * CATEGORY_ORDER's fixed display order — a category with nothing in it yet simply
 * produces no entry, rather than an empty section. */
const EFFECTS_BY_CATEGORY: { category: string; types: StackableEffectType[] }[] = CATEGORY_ORDER.map((category) => ({
  category,
  types: ALL_EFFECT_TYPES.filter((type) => EFFECT_CATEGORIES[type] === category),
})).filter((group) => group.types.length > 0);

function SectionHeading({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-[11px] uppercase tracking-wide opacity-60">{children}</h3>
      {hint && <p className="mt-1 text-[10px] opacity-40">{hint}</p>}
    </div>
  );
}

/** A visible divider (not just a gap) between sections — plain whitespace alone read
 * as "too close together" even at a fairly generous gap size, so each section below
 * also gets a full-width rule to make the boundary unambiguous. */
function SectionDivider() {
  return <div className="my-2 h-px w-full bg-[rgb(var(--chrome-border)/0.15)]" />;
}

export function EffectsDrawer() {
  const open = useUIStore((s) => s.effectsDrawerOpen);
  const setOpen = useUIStore((s) => s.setEffectsDrawerOpen);
  const targetIds = useUIStore((s) => s.effectsDrawerTargetIds);
  const allImages = useProjectStore((s) => s.project.images);
  const addEffectLayer = useProjectStore((s) => s.addEffectLayer);
  const addPresetGroupLayer = useProjectStore((s) => s.addPresetGroupLayer);
  const addMixLayer = useProjectStore((s) => s.addMixLayer);
  const updateEffectLayer = useProjectStore((s) => s.updateEffectLayer);
  const updateMixLayer = useProjectStore((s) => s.updateMixLayer);

  // Anchor-element convention (same as the radial menu's own image context items):
  // "add" actions apply to every target id, but the gallery's own live previews read
  // from the first selected image.
  const image = allImages.find((i) => targetIds.includes(i.id));
  const loadedImg = useLoadedImage(image?.dataUrl ?? null);

  // Drawer-internal navigation state — which layer's settings the Inspector shows,
  // and how wide the Stack panel is. Neither belongs in the global uiStore: both
  // reset naturally each time the drawer opens, and nothing outside this drawer
  // ever needs to read them.
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [stackWidth, setStackWidth] = useState(DEFAULT_STACK_WIDTH);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      resizeRef.current = { startX: e.clientX, startWidth: stackWidth };
    },
    [stackWidth],
  );
  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current || e.buttons !== 1) return;
    // Handle sits on the panel's own left edge, so dragging left (negative dx) grows it.
    const dx = resizeRef.current.startX - e.clientX;
    setStackWidth(Math.min(MAX_STACK_WIDTH, Math.max(MIN_STACK_WIDTH, resizeRef.current.startWidth + dx)));
  }, []);
  const handleResizePointerUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  const selectedLayer = image && selectedLayerId ? findLayerById(image.layers, selectedLayerId) : null;
  const gridCols = stackWidth >= THREE_COLUMN_THRESHOLD ? "grid-cols-3" : "grid-cols-2";

  const handleInspectorUpdate = (patch: Record<string, unknown>) => {
    if (!image || !selectedLayer) return;
    if (selectedLayer.kind === "mix") updateMixLayer([image.id], selectedLayer.id, patch);
    else updateEffectLayer([image.id], selectedLayer.id, patch);
  };

  return (
    // Non-modal: matches a real editor's side panel, not a dialog — the canvas
    // behind it stays fully visible and interactive (pan/zoom/select) while this is
    // open, so there's no Dialog.Overlay at all (that's what would normally dim and
    // intercept clicks). onPointerDownOutside/onInteractOutside are suppressed so
    // clicking the canvas to interact with it doesn't also auto-close the drawer.
    <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
      <Dialog.Portal>
        <Dialog.Content
          className="fixed right-0 top-0 z-50 flex h-full max-w-[95vw] outline-none data-[state=open]:animate-[slide-in-right_200ms_ease-out]"
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {image && selectedLayer && (
            <LayerInspectorPanel layer={selectedLayer} width={340} loadedImg={loadedImg} onClose={() => setSelectedLayerId(null)} onUpdate={handleInspectorUpdate} />
          )}

          <div className="glass-panel corner-frame relative flex h-full flex-col p-5 shadow-2xl" style={{ width: stackWidth }}>
            <span className="corner-tl" />
            <span className="corner-bl" />
            <div
              onPointerDown={handleResizePointerDown}
              className="absolute -left-1 top-0 h-full w-2 cursor-ew-resize"
              style={{ touchAction: "none" }}
              aria-hidden="true"
            />
            <Dialog.Title className="mb-4 shrink-0 text-[13px] uppercase tracking-wide">Image Effects</Dialog.Title>

            {!image ? (
              <p className="mt-8 text-center text-[12px] opacity-50">Select an image first.</p>
            ) : (
              <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-4">
                <section>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <SectionHeading hint="Everything applied to this image, newest-on-top first — matching the order it's composited. Drag to reorder, toggle to hide, click a name to edit its settings.">
                      Active Stack
                    </SectionHeading>
                    <button
                      type="button"
                      onClick={() => addMixLayer(targetIds)}
                      className="press-scale shrink-0 whitespace-nowrap rounded border border-[rgb(var(--chrome-border)/0.3)] px-2.5 py-1.5 text-[10px] uppercase tracking-wide opacity-70 hover:opacity-100"
                    >
                      + Layer Mix
                    </button>
                  </div>
                  <LayerStackList image={image} selectedLayerId={selectedLayerId} onSelect={setSelectedLayerId} />
                </section>

                <SectionDivider />

                <section>
                  <SectionHeading hint="Click a preset to add its whole bundle as a new group — you can add the same preset more than once, and expand any group to tune its individual effects.">
                    Presets
                  </SectionHeading>
                  <div className={`grid ${gridCols} gap-3`}>
                    {BUILT_IN_PRESETS.map((preset) => (
                      <PresetCard key={preset.id} preset={preset} loadedImg={loadedImg} onAdd={() => addPresetGroupLayer(targetIds, preset.id)} />
                    ))}
                  </div>
                </section>

                <SectionDivider />

                <section>
                  <SectionHeading hint="Click an effect to add it to the stack above — add the same one more than once for extra intensity.">Effects</SectionHeading>
                  <div className="flex flex-col gap-5">
                    {EFFECTS_BY_CATEGORY.map(({ category, types }) => (
                      <div key={category}>
                        <h4 className="mb-2 text-[10px] uppercase tracking-wide opacity-45">{category}</h4>
                        <div className={`grid ${gridCols} gap-3`}>
                          {types.map((type) => (
                            <EffectCard key={type} type={type} loadedImg={loadedImg} onAdd={() => addEffectLayer(targetIds, type)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
