import { useEffectThumbnail } from "@/components/EffectsDrawer/useEffectThumbnail";
import { drawEffectPreview, previewSingleEffect } from "@/canvas/gl/effectPreview";
import { EFFECT_LABELS, EFFECT_DESCRIPTIONS } from "@/components/EffectsDrawer/effectLabels";
import type { StackableEffectType } from "@/store/types";

const THUMB_W = 220;
const THUMB_H = 165;

interface EffectCardProps {
  type: StackableEffectType;
  loadedImg: HTMLImageElement | null;
  onAdd: () => void;
}

/** One tile in the Effects gallery — a live thumbnail of the subject image with this
 * effect applied at its default settings (so what it does is visible before adding
 * it), its name and a one-line description. Clicking always ADDS a fresh instance to
 * the image's layer stack — browsing here never toggles/selects anything, so there's
 * no ambiguity about whether a click "did something." */
export function EffectCard({ type, loadedImg, onAdd }: EffectCardProps) {
  const canvasRef = useEffectThumbnail(
    loadedImg,
    THUMB_W,
    THUMB_H,
    (ctx, img, w, h) => drawEffectPreview(ctx, img, w, h, previewSingleEffect(type)),
    [type],
  );

  return (
    <button type="button" onClick={onAdd} className="corner-frame glass-panel press-scale group relative block overflow-hidden text-left">
      <span className="corner-tl" />
      <span className="corner-bl" />
      <span className="corner-br" />
      {loadedImg ? (
        <canvas ref={canvasRef} className="block aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-black/20 text-[10px] opacity-40">No image yet</div>
      )}
      {/* "+" overlay makes the always-adds click behavior legible without needing an
          extra label — appears on hover so the resting thumbnail stays uncluttered. */}
      <span className="accent-glow-hover glass-panel absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[14px] opacity-0 transition-opacity group-hover:opacity-100">
        +
      </span>
      <div className="px-3 py-2.5">
        <div className="text-[12px] uppercase tracking-wide">{EFFECT_LABELS[type]}</div>
        <div className="mt-0.5 text-[10px] opacity-60">{EFFECT_DESCRIPTIONS[type]}</div>
      </div>
    </button>
  );
}
