import { useEffectThumbnail } from "@/components/EffectsDrawer/useEffectThumbnail";
import { drawEffectPreview } from "@/canvas/gl/effectPreview";
import type { EffectLayer } from "@/store/types";

interface EffectPreviewStageProps {
  loadedImg: HTMLImageElement | null;
  /** The layer(s) to preview, in the same shape `drawEffectPreview` already takes —
   * an empty array just shows the plain image (used by Mask's own editor, which
   * previews the region a mask applies to rather than re-rendering some other
   * layer's own effect). */
  layers: EffectLayer[];
  width: number;
  height: number;
  children?: React.ReactNode;
}

/**
 * The shared shell behind every direct-manipulation editor in this drawer (mask
 * region, mesh warp, distort centers/corners): a real, live GL-rendered preview of
 * `layer` applied to the actual image — the same `drawEffectPreview` machinery
 * `EffectCard.tsx` uses for gallery thumbnails, just bigger and interactive — with an
 * absolutely-positioned SVG overlay slot for draggable handles. `onPointerDown` stops
 * propagation on the SVG itself so a drag here never leaks into the Active Stack
 * row's own drag recognizer (same reasoning as every other drag control in this app).
 * Every control built on this stays inside the Inspector side panel rather than
 * overlaying the live main canvas — a deliberately smaller, lower-risk scope than
 * wiring real coordinate mapping through the canvas's own pan/zoom/rotation.
 */
export function EffectPreviewStage({ loadedImg, layers, width, height, children }: EffectPreviewStageProps) {
  const canvasRef = useEffectThumbnail(loadedImg, width, height, (ctx, img, w, h) => drawEffectPreview(ctx, img, w, h, layers), [JSON.stringify(layers)]);

  return (
    <div className="relative overflow-hidden rounded border border-[rgb(var(--chrome-border)/0.3)]" style={{ width, height }}>
      {loadedImg ? (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-[10px] opacity-40">No image yet</div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full cursor-crosshair"
        onPointerDown={(e) => e.stopPropagation()}
        style={{ touchAction: "none" }}
      >
        {children}
      </svg>
    </div>
  );
}
