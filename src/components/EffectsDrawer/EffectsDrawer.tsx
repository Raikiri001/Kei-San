import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useMemo, useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useProjectStore } from "@/store/projectStore";
import { useLoadedImage } from "@/hooks/useLoadedImage";
import { findLayerById } from "@/store/imageEffects";
import { BUILT_IN_PRESETS } from "@/presets/builtInPresets";
import { EffectCard } from "@/components/EffectsDrawer/EffectCard";
import { PresetCard } from "@/components/EffectsDrawer/PresetCard";
import { LayerStackList } from "@/components/EffectsDrawer/LayerStackList";
import { LayerInspectorPanel } from "@/components/EffectsDrawer/LayerInspectorPanel";
import { CloseIcon, SearchIcon } from "@/components/EffectsDrawer/icons";
import { InfoTooltip } from "@/components/InfoTooltip";
import { ALL_EFFECT_TYPES, CATEGORY_ORDER, EFFECT_CATEGORIES, EFFECT_LABELS } from "@/components/EffectsDrawer/effectLabels";
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

/** Bold, high-contrast, accent-marked heading — deliberately much louder than
 * a typical small uppercase label so the drawer's sections (and their
 * meaning) are unmistakable at a glance. */
function SectionHeading({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: "var(--color-accent)" }} />
      <h3 className="text-[16px] font-bold tracking-wide">{children}</h3>
      {hint && <InfoTooltip text={hint} label={`About ${children}`} side="bottom" />}
    </div>
  );
}

/** A visible divider (not just a gap) between sections — plain whitespace alone read
 * as "too close together" even at a fairly generous gap size, so each section below
 * also gets a full-width rule to make the boundary unambiguous. */
function SectionDivider() {
  return <div className="my-2 h-px w-full bg-[rgb(var(--chrome-border)/0.15)]" />;
}

/** Shared circular close control — identical in both the stack panel and the
 * customization panel, so the two independently-floating panels still read
 * as one consistent system. */
function PanelCloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press-scale flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--chrome-border)/0.3)] opacity-70 hover:opacity-100"
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center">
        <CloseIcon />
      </span>
    </button>
  );
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
  // how wide the Stack panel is, and the live search query. None of this belongs in
  // the global uiStore: all three reset naturally each time the drawer opens, and
  // nothing outside this drawer ever needs to read them.
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [stackWidth, setStackWidth] = useState(DEFAULT_STACK_WIDTH);
  const [query, setQuery] = useState("");
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
    // Handle sits on the panel's own right edge (the panel docks to the
    // screen's left edge), so dragging right grows it.
    const dx = e.clientX - resizeRef.current.startX;
    setStackWidth(Math.min(MAX_STACK_WIDTH, Math.max(MIN_STACK_WIDTH, resizeRef.current.startWidth + dx)));
  }, []);
  const handleResizePointerUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  const selectedLayer = image && selectedLayerId ? findLayerById(image.layers, selectedLayerId) : null;
  const gridCols = stackWidth >= THREE_COLUMN_THRESHOLD ? "grid-cols-3" : "grid-cols-2";

  // One search box, scoped across both galleries — a simple case-insensitive
  // substring match on each item's display name. Presets and effect categories
  // with zero remaining matches are dropped entirely rather than shown empty,
  // so a search always reads as "these are the matches, grouped."
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPresets = useMemo(
    () => (normalizedQuery ? BUILT_IN_PRESETS.filter((p) => p.name.toLowerCase().includes(normalizedQuery)) : BUILT_IN_PRESETS),
    [normalizedQuery],
  );
  const filteredEffectsByCategory = useMemo(() => {
    if (!normalizedQuery) return EFFECTS_BY_CATEGORY;
    return EFFECTS_BY_CATEGORY.map(({ category, types }) => ({
      category,
      types: types.filter((type) => EFFECT_LABELS[type].toLowerCase().includes(normalizedQuery)),
    })).filter((group) => group.types.length > 0);
  }, [normalizedQuery]);
  const noResults = normalizedQuery.length > 0 && filteredPresets.length === 0 && filteredEffectsByCategory.length === 0;

  const handleInspectorUpdate = (patch: Record<string, unknown>) => {
    if (!image || !selectedLayer) return;
    if (selectedLayer.kind === "mix") updateMixLayer([image.id], selectedLayer.id, patch);
    else updateEffectLayer([image.id], selectedLayer.id, patch);
  };

  return (
    <>
      {/* Gallery/stack panel — docks to the screen's own left edge, slides in
          left-to-right. Non-modal: matches a real editor's side panel, not a
          dialog — the canvas behind it stays fully visible and interactive
          (pan/zoom/select) while this is open, so there's no Dialog.Overlay
          at all. onPointerDownOutside/onInteractOutside are suppressed so
          clicking the canvas doesn't also auto-close it — the explicit close
          button is the intended way to dismiss it. */}
      <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
        <Dialog.Portal>
          <Dialog.Content
            className="glass-panel fixed left-0 top-0 z-50 flex h-full max-w-[95vw] flex-col rounded-r-3xl p-7 shadow-2xl outline-none data-[state=open]:animate-[slide-in-left_200ms_ease-out] data-[state=closed]:animate-[slide-out-left_150ms_ease-out]"
            style={{ width: stackWidth }}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <div
              onPointerDown={handleResizePointerDown}
              className="absolute -right-1 top-0 h-full w-2 cursor-ew-resize"
              style={{ touchAction: "none" }}
              aria-hidden="true"
            />
            <div className="mb-5 flex shrink-0 items-center justify-between">
              <Dialog.Title className="text-[15px] font-bold uppercase tracking-wide">Image Effects</Dialog.Title>
              <Dialog.Close asChild>
                <PanelCloseButton onClick={() => {}} label="Close Image Effects" />
              </Dialog.Close>
            </div>

            {!image ? (
              <p className="mt-8 text-center text-[12px] opacity-50">Select an image first.</p>
            ) : (
              <div className="thin-scroll -mx-7 flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pb-4">
                {/* Sticky: stays pinned at the top of the scroll area while
                    Presets/Effects scroll underneath it — the one section
                    you're always mid-editing, so it never scrolls out of
                    reach. Its own background matches the panel's tint
                    (rather than re-blurring) since it's already inside the
                    blurred glass panel. */}
                <section
                  className="sticky top-0 z-10 shrink-0 pb-5"
                  style={{ background: "rgb(var(--chrome-bg))" }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <SectionHeading hint="Everything applied to this image, newest on top first, matching the order it's composited. Drag to reorder, toggle to hide, or click a name to edit its settings.">
                      Active Stack
                    </SectionHeading>
                    <button
                      type="button"
                      onClick={() => addMixLayer(targetIds)}
                      className="press-scale shrink-0 whitespace-nowrap rounded-full border border-[rgb(var(--chrome-border)/0.3)] px-3 py-1.5 text-[10px] uppercase tracking-wide opacity-70 hover:opacity-100"
                    >
                      + Layer Mix
                    </button>
                  </div>
                  <LayerStackList image={image} selectedLayerId={selectedLayerId} onSelect={setSelectedLayerId} />
                  <div className="mt-5 border-b border-[rgb(var(--chrome-border)/0.15)]" />
                </section>

                <div className="flex flex-col gap-10 pt-8">
                  <label className="relative block">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50">
                      <SearchIcon />
                    </span>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search presets and effects"
                      aria-label="Search presets and effects"
                      className="glass-panel h-10 w-full rounded-full py-2 pl-10 pr-4 text-[12px] outline-none focus:border-accent/60"
                    />
                  </label>

                  {noResults ? (
                    <p className="text-[12px] opacity-50">No presets or effects match "{query}".</p>
                  ) : (
                    <>
                      {filteredPresets.length > 0 && (
                        <section>
                          <div className="mb-4">
                            <SectionHeading hint="Click a preset to add its whole bundle as a new group. You can add the same preset more than once, and expand any group to tune its individual effects.">
                              Presets
                            </SectionHeading>
                          </div>
                          <div className={`grid ${gridCols} gap-4`}>
                            {filteredPresets.map((preset) => (
                              <PresetCard key={preset.id} preset={preset} loadedImg={loadedImg} onAdd={() => addPresetGroupLayer(targetIds, preset.id)} />
                            ))}
                          </div>
                        </section>
                      )}

                      {filteredPresets.length > 0 && filteredEffectsByCategory.length > 0 && <SectionDivider />}

                      {filteredEffectsByCategory.length > 0 && (
                        <section>
                          <div className="mb-4">
                            <SectionHeading hint="Click an effect to add it to the stack above. Add the same one more than once for extra intensity.">
                              Effects
                            </SectionHeading>
                          </div>
                          <div className="flex flex-col gap-8">
                            {filteredEffectsByCategory.map(({ category, types }) => (
                              <div key={category}>
                                <h4 className="mb-3 border-b border-[rgb(var(--chrome-border)/0.18)] pb-2 text-[13px] font-semibold uppercase tracking-wide opacity-90">
                                  {category}
                                </h4>
                                <div className={`grid ${gridCols} gap-4`}>
                                  {types.map((type) => (
                                    <EffectCard key={type} type={type} loadedImg={loadedImg} onAdd={() => addEffectLayer(targetIds, type)} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Customization panel — a fully separate floating panel docked to the
          screen's own right edge, slides in right-to-left. Deliberately not
          adjacent to the stack panel above: its own Dialog.Root/open state
          (driven by "is a layer selected", not by the stack panel's own open
          state) so it can appear/disappear independently. */}
      <Dialog.Root
        open={!!(image && selectedLayer)}
        onOpenChange={(next) => {
          if (!next) setSelectedLayerId(null);
        }}
        modal={false}
      >
        <Dialog.Portal>
          <Dialog.Content
            className="fixed right-0 top-0 z-50 flex h-full outline-none data-[state=open]:animate-[slide-in-right_200ms_ease-out] data-[state=closed]:animate-[slide-out-right_150ms_ease-out]"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            {image && selectedLayer && (
              <LayerInspectorPanel
                layer={selectedLayer}
                width={340}
                loadedImg={loadedImg}
                onClose={() => setSelectedLayerId(null)}
                onUpdate={handleInspectorUpdate}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
