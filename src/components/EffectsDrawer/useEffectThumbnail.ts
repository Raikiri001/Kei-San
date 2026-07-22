import { useEffect, useRef } from "react";

/** Sizes a canvas to `w x h` and re-runs `draw` whenever `loadedImg` or `deps` change —
 * the shared plumbing behind every EffectCard/PresetCard thumbnail (each supplies its
 * own `draw`, e.g. one that isolates a single effect vs. one that applies a whole preset). */
export function useEffectThumbnail(
  loadedImg: HTMLImageElement | null,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) => void,
  deps: unknown[],
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!loadedImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    draw(ctx, loadedImg, w, h);
    // `draw` itself is re-created per render (it closes over effect params) — depending on
    // the caller's own explicit `deps` instead avoids re-running on every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedImg, w, h, ...deps]);

  return canvasRef;
}
