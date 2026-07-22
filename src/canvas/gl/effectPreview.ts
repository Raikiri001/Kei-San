import { renderEffectStack } from "@/canvas/gl/glRenderer";
import { getGLCanvas } from "@/canvas/gl/glContext";
import { drawEdgeGlow, getEdgeAverageColor } from "@/canvas/edgeBlend";
import { renderAsciiOverlay } from "@/canvas/asciiOverlay";
import { drawBlobTrackerOverlay } from "@/canvas/blobTrackerOverlay";
import { createEffectLayer } from "@/canvas/gl/effectDefaults";
import type { EffectLayer, StackableEffectType } from "@/store/types";

/**
 * Renders a flat, already-ordered `layers` list applied to `img` into `ctx` at
 * (0,0,w,h) — shared by the Effects/Presets gallery cards' own live thumbnails so a
 * card's preview is never a second, drifting reimplementation of the main per-image
 * render path (see ImageElementView.tsx/exportEngine.ts, which this mirrors: enabled
 * Edge Blend layers draw their own glow first, then the GPU content chain runs on
 * everything else, or a plain draw when nothing is enabled).
 */
export function drawEffectPreview(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, layers: EffectLayer[]): void {
  ctx.clearRect(0, 0, w, h);

  const edgeBlendLayers = layers.filter((l) => l.type === "edgeBlend");
  if (edgeBlendLayers.length > 0) {
    const edgeColor = getEdgeAverageColor(img);
    for (const layer of edgeBlendLayers) {
      // Clamped to the thumbnail's own small bounds — at full size the glow is meant to
      // bleed past the image's box; a fixed-size card canvas has no "past its box" to
      // bleed into, so an unclamped margin would just look like a uniform wash.
      const margin = Math.min(layer.margin, Math.min(w, h) * 0.3);
      drawEdgeGlow(ctx, edgeColor, 0, 0, w, h, margin);
    }
  }

  const contentLayers = layers.filter((l) => l.type !== "edgeBlend" && l.type !== "ascii" && l.type !== "blobTracker");
  if (contentLayers.length > 0) {
    renderEffectStack(img, w, h, contentLayers, 1, 0, 0);
    ctx.drawImage(getGLCanvas(), 0, 0, w, h, 0, 0, w, h);
  } else {
    // No content transform — draw the plain image on top of any edge-blend glow above.
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, w, h);
  }

  // Always applied last, over whatever content was just drawn — same fixed structural
  // position as the main render path (see AsciiEffect's doc comment in store/types.ts).
  const asciiLayers = layers.filter((l): l is Extract<EffectLayer, { type: "ascii" }> => l.type === "ascii");
  if (asciiLayers.length > 0) {
    const asciiCanvas = renderAsciiOverlay(ctx.canvas, w, h, asciiLayers[asciiLayers.length - 1]);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(asciiCanvas, 0, 0, w, h);
  }

  // Blob Tracker samples whatever's already on ctx.canvas (content + ASCII, if any)
  // to place its reticles, then draws directly onto ctx with no rotation-safe detour
  // needed — this thumbnail canvas is never rotated — always last, same as ASCII.
  const blobTrackerLayers = layers.filter((l): l is Extract<EffectLayer, { type: "blobTracker" }> => l.type === "blobTracker");
  for (const layer of blobTrackerLayers) {
    drawBlobTrackerOverlay(ctx, ctx.canvas, 0, 0, w, h, layer, layer.id);
  }
}

/** A single fresh default-param instance, for an EffectCard's own "what does this
 * look like" preview — independent of anything actually in the image's own stack. */
export function previewSingleEffect(type: StackableEffectType): EffectLayer[] {
  return [createEffectLayer(type)];
}
