import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { HEADER_HEIGHT, LAYER_INSPECTOR_WIDTH, PANEL_PUSH_TRANSITION, RAIL_WIDTH } from "@/constants/defaults";
import type { StackableEffectType } from "@/store/types";

/** Both docked panels sit flush against the header (no ruler-lane gap to
 * leave clear anymore: opening either one now pushes the ruler/canvas over
 * instead of floating on top of them — see App.tsx) and span the full
 * remaining height, same as the left tool rail. */
const PANEL_TOP = HEADER_HEIGHT;
/** The stack panel docks immediately against the rail's own right edge. */
const STACK_PANEL_LEFT = RAIL_WIDTH;

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

/** Bold, high-contrast, accent-marked heading — deliberately much louder than
 * a typical small uppercase label so the drawer's sections (and their
 * meaning) are unmistakable at a glance. */
function SectionHeading({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-3.5 w-1 shrink-0 rounded-full" style={{ background: "var(--color-accent)" }} />
      <h3 className="text-[13px] font-semibold tracking-wide">{children}</h3>
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
      className="accent-glow-hover press-scale flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--chrome-border)/0.3)] opacity-70 hover:opacity-100"
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center">
        <CloseIcon />
      </span>
    </button>
  );
}

/** Escape closes an open docked panel — the one bit of the old Radix Dialog
 * behavior worth keeping now that these are plain always-mounted divs
 * (translated on/off screen) instead of actual Dialog.Content. */
function useEscapeToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);
}

export function EffectsDrawer() {
  const open = useUIStore((s) => s.effectsDrawerOpen);
  const setOpen = useUIStore((s) => s.setEffectsDrawerOpen);
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

  useEscapeToClose(open, () => setOpen(false));

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
      {/* Gallery/stack panel — docks flush against the rail's right edge,
          full height like the rail itself, and slides in left-to-right by a
          plain transform. Permanently mounted (not conditionally rendered
          like the old Dialog.Content) so it can push-animate in lockstep
          with the canvas/ruler — see App.tsx, which reads this same
          open/width state to shift the canvas's left edge over by exactly
          this panel's width. */}
      <div
        role="dialog"
        aria-label="Image Effects"
        className="glass-panel stack-panel-bar fixed z-40 flex flex-col p-6"
        style={{
          width: stackWidth,
          left: STACK_PANEL_LEFT,
          top: PANEL_TOP,
          bottom: 0,
          transform: `translateX(${open ? "0" : "-100%"})`,
          transition: `transform ${PANEL_PUSH_TRANSITION}`,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="group absolute -right-1 top-0 z-10 flex h-full w-2 cursor-ew-resize items-center justify-center"
          style={{ touchAction: "none" }}
          aria-hidden="true"
        >
          {/* A visible grip, not just an invisible hit-region — the old
              purely-invisible strip had no affordance at all, which read as
              "impossible to see where to grab," especially against a canvas
              that can now be either light or dark theme right next to it.
              Drawn on the panel's own always-dark surface, so it stays
              equally visible regardless of what's on the other side. */}
          <span className="h-10 w-[3px] rounded-full bg-[rgb(var(--chrome-text)/0.28)] transition-colors group-hover:bg-[rgb(var(--chrome-text)/0.6)]" />
        </div>

        <div className="mb-6 flex shrink-0 items-center justify-between">
          <h2 className="text-[16px] font-semibold">Image Effects</h2>
          <PanelCloseButton onClick={() => setOpen(false)} label="Close Image Effects" />
        </div>

        {!image ? (
          <p className="mt-8 text-center text-[12px] opacity-50">Select an image first.</p>
        ) : (
          <div className="thin-scroll -mx-6 flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6">
            {/* Sticky: stays pinned at the top of the scroll area while
                Presets/Effects scroll underneath it — the one section
                you're always mid-editing, so it never scrolls out of
                reach. */}
            <section className="stack-sticky sticky top-0 z-10 shrink-0 pb-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <SectionHeading hint="Everything applied to this image, newest on top first, matching the order it's composited. Drag to reorder, toggle to hide, or click a name to edit its settings.">
                  Active Stack
                </SectionHeading>
                <button
                  type="button"
                  onClick={() => addMixLayer(targetIds)}
                  className="accent-glow-hover press-scale shrink-0 whitespace-nowrap rounded-full border border-[rgb(var(--chrome-border)/0.3)] px-3 py-1.5 text-[11px] font-medium opacity-80 hover:opacity-100"
                >
                  + Layer Mix
                </button>
              </div>
              <LayerStackList image={image} selectedLayerId={selectedLayerId} onSelect={setSelectedLayerId} />
              <div className="mt-5 border-b border-[rgb(var(--chrome-border)/0.15)]" />
            </section>

            <div className="flex flex-col gap-12 pt-9">
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
                            <h4 className="mb-3 border-b border-[rgb(var(--chrome-border)/0.18)] pb-2 text-[13px] font-semibold opacity-90">
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
      </div>

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
          top: PANEL_TOP,
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
