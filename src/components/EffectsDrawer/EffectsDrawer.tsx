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
import { SearchIcon } from "@/components/EffectsDrawer/icons";
import { SectionHeading, SectionDivider } from "@/components/EffectsDrawer/SectionHeading";
import { LeftDockPanel } from "@/components/LeftDockPanel";
import { ALL_EFFECT_TYPES, CATEGORY_ORDER, EFFECT_CATEGORIES, EFFECT_LABELS } from "@/components/EffectsDrawer/effectLabels";
import { HEADER_HEIGHT, LAYER_INSPECTOR_WIDTH, PANEL_PUSH_TRANSITION } from "@/constants/defaults";
import type { StackableEffectType } from "@/store/types";

/** Below this width the Presets/Effects grids show 2 columns, at/above it 3 — driven
 * directly off the same store width value the resize handle updates, so no separate
 * CSS container query is needed. */
const THREE_COLUMN_THRESHOLD = 560;

/** One entry per category that currently has at least one effect, in
 * CATEGORY_ORDER's fixed display order — a category with nothing in it yet simply
 * produces no entry, rather than an empty section. */
const EFFECTS_BY_CATEGORY: { category: string; types: StackableEffectType[] }[] = CATEGORY_ORDER.map((category) => ({
  category,
  types: ALL_EFFECT_TYPES.filter((type) => EFFECT_CATEGORIES[type] === category),
})).filter((group) => group.types.length > 0);

export function EffectsDrawer() {
  const open = useUIStore((s) => s.activeLeftPanel === "effects");
  const closeLeftPanel = useUIStore((s) => s.closeLeftPanel);
  const targetIds = useUIStore((s) => s.effectsDrawerTargetIds);
  const stackWidth = useUIStore((s) => s.effectsPanelWidth);
  const setStackWidth = useUIStore((s) => s.setEffectsPanelWidth);
  const selectedLayerId = useUIStore((s) => s.effectsSelectedLayerId);
  const setSelectedLayerId = useUIStore((s) => s.setEffectsSelectedLayerId);
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

  // Drawer-internal navigation state — the live search query resets naturally each
  // time the drawer opens and nothing outside this drawer ever needs to read it, so
  // it stays local (unlike selectedLayerId/stackWidth above, which App.tsx's layout
  // needs to read too — see uiStore).
  const [query, setQuery] = useState("");
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      resizeRef.current = { startX: e.clientX, startWidth: stackWidth };
    },
    [stackWidth],
  );
  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!resizeRef.current || e.buttons !== 1) return;
      // Handle sits on the panel's own right edge (the panel docks to the
      // rail's right edge), so dragging right grows it.
      const dx = e.clientX - resizeRef.current.startX;
      setStackWidth(resizeRef.current.startWidth + dx);
    },
    [setStackWidth],
  );
  const handleResizePointerUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  const selectedLayer = image && selectedLayerId ? findLayerById(image.layers, selectedLayerId) : null;
  const gridCols = stackWidth >= THREE_COLUMN_THRESHOLD ? "grid-cols-3" : "grid-cols-2";
  const inspectorOpen = !!(image && selectedLayer);

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
      <LeftDockPanel
        open={open}
        onClose={closeLeftPanel}
        title="Image Effects"
        width={stackWidth}
        resizeHandle={
          <div
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            className="group absolute -right-1 top-0 z-10 flex h-full w-2 cursor-ew-resize items-center justify-center"
            style={{ touchAction: "none" }}
            aria-hidden="true"
          >
            {/* A visible grip, not just an invisible hit-region — the old
                purely-invisible strip had no affordance at all. Drawn in
                bar-fg so it stays visible against this panel's own
                (theme-adaptive) surface in either theme. */}
            <span className="h-10 w-[3px] rounded-full bg-[rgb(var(--bar-fg)/0.28)] transition-colors group-hover:bg-[rgb(var(--bar-fg)/0.6)]" />
          </div>
        }
      >
        {!image ? (
          <p className="mt-8 text-center text-[12px] opacity-50">Select an image first.</p>
        ) : (
          // Two independently-scrolling halves, each exactly half the panel's
          // remaining height (flex-1 + flex-1 in a flex-col, min-h-0 so each
          // can actually shrink and scroll its own overflow instead of
          // stretching the whole panel) — Active Stack on top, search +
          // Presets/Effects on the bottom, rather than one shared scroll
          // region with Active Stack pinned via `sticky`.
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="bar-card flex min-h-0 flex-1 flex-col rounded-2xl p-4">
              <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
                <SectionHeading hint="Everything applied to this image, newest on top first, matching the order it's composited. Drag to reorder, toggle to hide, or click a name to edit its settings.">
                  Active Stack
                </SectionHeading>
                <button
                  type="button"
                  onClick={() => addMixLayer(targetIds)}
                  className="bar-glow-hover press-scale shrink-0 whitespace-nowrap rounded-full border border-[rgb(var(--bar-border)/0.3)] px-3 py-1.5 text-[11px] font-medium opacity-80 hover:opacity-100"
                >
                  + Layer Mix
                </button>
              </div>
              <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
                <LayerStackList image={image} selectedLayerId={selectedLayerId} onSelect={setSelectedLayerId} />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <label className="relative block shrink-0">
                <span className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search presets and effects"
                  aria-label="Search presets and effects"
                  className="h-10 w-full rounded-full border border-[rgb(var(--bar-border)/0.14)] bg-[rgb(var(--bar-fg)/0.05)] py-2 pl-10 pr-4 text-[12px] outline-none focus:border-[rgb(var(--bar-border)/0.3)]"
                />
              </label>

              <div className="thin-scroll -mx-6 mt-6 min-h-0 flex-1 overflow-y-auto px-6">
                {noResults ? (
                  <p className="text-[12px] opacity-50">No presets or effects match "{query}".</p>
                ) : (
                  <div className="flex flex-col gap-12 pb-6">
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
                              <h4 className="mb-3 border-b border-[rgb(var(--bar-border)/0.18)] pb-2 text-[13px] font-semibold opacity-90">
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
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </LeftDockPanel>

      {/* Customization panel — docks flush against the screen's own right
          edge, full height like the rail, slides in right-to-left. Its own
          open state (image + selectedLayer both set) is independent of the
          stack panel's — App.tsx pushes the canvas's right edge in by
          LAYER_INSPECTOR_WIDTH whenever this is open. */}
      <div
        role="dialog"
        aria-label={selectedLayer ? `Customize ${selectedLayer.kind === "mix" ? "Layer Mix" : selectedLayer.type}` : "Layer settings"}
        className="fixed right-0 z-40"
        style={{
          top: HEADER_HEIGHT,
          bottom: 0,
          width: LAYER_INSPECTOR_WIDTH,
          transform: `translateX(${inspectorOpen ? "0" : "100%"})`,
          transition: `transform ${PANEL_PUSH_TRANSITION}`,
          pointerEvents: inspectorOpen ? "auto" : "none",
        }}
      >
        {image && selectedLayer && (
          <LayerInspectorPanel
            layer={selectedLayer}
            width={LAYER_INSPECTOR_WIDTH}
            loadedImg={loadedImg}
            onClose={() => setSelectedLayerId(null)}
            onUpdate={handleInspectorUpdate}
          />
        )}
      </div>
    </>
  );
}
