import { useEffectThumbnail } from "@/components/EffectsDrawer/useEffectThumbnail";
import { drawEffectPreview } from "@/canvas/gl/effectPreview";
import { previewPresetChildren } from "@/presets/instantiatePreset";
import { EFFECT_LABELS } from "@/components/EffectsDrawer/effectLabels";
import type { ImageEffectPreset } from "@/presets/types";

const THUMB_W = 220;
const THUMB_H = 165;

interface PresetCardProps {
  preset: ImageEffectPreset;
  loadedImg: HTMLImageElement | null;
  onAdd: () => void;
}

/** One tile in the Presets gallery — a live thumbnail of the subject image with the
 * whole preset bundle applied, its name, and the effects it bundles listed out (so
 * it's clear what adding it actually does). Clicking always ADDS a fresh, independent
 * copy of the whole bundle as a new group layer — never replaces anything already
 * applied, so presets and effects (and repeat applications of the same preset) freely
 * stack. */
export function PresetCard({ preset, loadedImg, onAdd }: PresetCardProps) {
  const previewChildren = previewPresetChildren(preset);
  const canvasRef = useEffectThumbnail(
    loadedImg,
    THUMB_W,
    THUMB_H,
    (ctx, img, w, h) => drawEffectPreview(ctx, img, w, h, previewChildren),
    [preset.id],
  );

  const bundleSummary = preset.entries.map((entry) => EFFECT_LABELS[entry.type]).join(" + ");

  return (
    <button type="button" onClick={onAdd} className="glass-panel press-scale group relative block overflow-hidden rounded-2xl text-left">
      {loadedImg ? (
        <canvas ref={canvasRef} className="block aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-black/20 text-[10px] opacity-40">No image yet</div>
      )}
      {/* Static, always visible — no hover-triggered reveal. A fixed "+" badge
          reads as calmer and more predictable than one that pops in on
          hover/focus. */}
      <span className="list-row absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[14px] opacity-80">+</span>
      <div className="px-3.5 py-3">
        <div className="text-[12.5px] font-medium">{preset.name}</div>
        <div className="mt-0.5 line-clamp-1 text-[10px] opacity-55">{bundleSummary}</div>
      </div>
    </button>
  );
}
