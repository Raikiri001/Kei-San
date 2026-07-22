import { useState } from "react";
import clsx from "clsx";
import { SliderField } from "@/components/EffectsDrawer/SliderField";
import { CircleRegionEditor } from "@/components/EffectsDrawer/CircleRegionEditor";
import type { EffectLayer, LayerMask } from "@/store/types";

/** Converts a `CircleRegionEditor` drag patch (plain radiusX/radiusY) into `LayerMask`'s
 * own `radius`+`aspectStretch` pair (see compositeShared.ts's mask shader: radiusX is
 * always `radius`, radiusY is always `radius*aspectStretch`) — only ever one of
 * radiusX/radiusY arrives per drag (whichever handle moved), so the other axis's
 * current value is preserved exactly. */
function regionPatchToMaskPatch(mask: LayerMask, patch: { centerX?: number; centerY?: number; radiusX?: number; radiusY?: number; rotation?: number }): Partial<LayerMask> {
  const next: Partial<LayerMask> = {};
  if (patch.centerX !== undefined) next.centerX = patch.centerX;
  if (patch.centerY !== undefined) next.centerY = patch.centerY;
  if (patch.rotation !== undefined) next.rotation = patch.rotation;
  if (patch.radiusX !== undefined) {
    const currentRadiusY = mask.radius * mask.aspectStretch;
    next.radius = patch.radiusX;
    next.aspectStretch = currentRadiusY / patch.radiusX;
  }
  if (patch.radiusY !== undefined) {
    next.aspectStretch = patch.radiusY / mask.radius;
  }
  return next;
}

/** The universal soft-edged radial mask every layer carries — restricts where its
 * effect applies (see LayerMask's doc comment in store/types.ts). Collapsed by
 * default; the detailed knobs only show once the mask is actually enabled, so the
 * common case (mask off) stays a single row. Center/radius/aspect/rotation are a
 * single direct-manipulation `CircleRegionEditor` over a live preview (dimmed
 * outside the mask region) rather than 4 disconnected sliders — `falloff` (a blur
 * amount, not a position) stays a slider alongside it. */
export function MaskFields({
  mask,
  loadedImg,
  previewLayers,
  onUpdate,
}: {
  mask: LayerMask;
  loadedImg: HTMLImageElement | null;
  previewLayers: EffectLayer[];
  onUpdate: (patch: Partial<LayerMask>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-t border-[rgb(var(--chrome-border)/0.15)] pt-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
        <button type="button" onClick={() => setExpanded((v) => !v)} className="flex-1 text-left">
          Mask {expanded ? "▲" : "▼"}
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ enabled: !mask.enabled })}
          aria-label={mask.enabled ? "Disable mask" : "Enable mask"}
          className={clsx(
            "h-4 w-8 shrink-0 rounded-full border transition-colors",
            mask.enabled ? "border-[rgb(var(--status-active-rgb)/0.7)] bg-[rgb(var(--status-active-rgb)/0.3)]" : "border-white/20 bg-white/5",
          )}
        >
          <span
            className={clsx(
              "block h-3 w-3 rounded-full bg-current transition-transform",
              mask.enabled ? "translate-x-4 text-[rgb(var(--status-active-rgb))]" : "translate-x-0.5 text-white/40",
            )}
          />
        </button>
      </div>

      {expanded && mask.enabled && (
        <div className="flex flex-col gap-3 pt-1">
          <CircleRegionEditor
            label="Region"
            loadedImg={loadedImg}
            previewLayers={previewLayers}
            centerX={mask.centerX}
            centerY={mask.centerY}
            radiusX={mask.radius}
            radiusY={mask.radius * mask.aspectStretch}
            rotation={mask.rotation}
            dimOutside
            onChange={(patch) => onUpdate(regionPatchToMaskPatch(mask, patch))}
          />
          <SliderField label="Falloff" value={mask.falloff} min={0} max={1} step={0.01} decimals={2} onChange={(falloff) => onUpdate({ falloff })} />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-wide opacity-70">
              <input type="checkbox" checked={mask.invert} onChange={(e) => onUpdate({ invert: e.target.checked })} />
              Invert
            </label>
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-wide opacity-70">
              <input type="checkbox" checked={mask.debug} onChange={(e) => onUpdate({ debug: e.target.checked })} />
              Debug View
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
