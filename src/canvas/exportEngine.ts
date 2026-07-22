import { getFontStack } from "@/constants/fonts";
import { loadImage } from "@/utils/fileToDataUrl";
import { computeCropSourceRect } from "@/utils/coverFit";
import type { ImageElement, ProjectState, TextAlign, TextElement } from "@/store/types";
import { drawVerticalText } from "@/canvas/verticalText";
import { renderEffectStack } from "@/canvas/gl/glRenderer";
import { getGLCanvas } from "@/canvas/gl/glContext";
import { drawEdgeGlow, getEdgeAverageColor } from "@/canvas/edgeBlend";
import { renderAsciiOverlay } from "@/canvas/asciiOverlay";
import { drawBlobTrackerOverlay } from "@/canvas/blobTrackerOverlay";
import { edgeColorCache } from "@/canvas/analysisCaches";
import { hexToRgba } from "@/canvas/colorExtraction";
import { applyTextGlow } from "@/canvas/textGlow";
import { getEnabledContentLayers, getEnabledEdgeBlendLayers, getEnabledAsciiLayers, getEnabledBlobTrackerLayers } from "@/store/imageEffects";

/** Greedy word-wrap of a single authored line (already split on "\n") against
 * `maxWidth` — canvas has no native reflow, so this is what makes the export
 * match the DOM preview's real textbox wrapping (content reflows to the box's
 * boxWidth, independent of fontSize) instead of one un-wrapped line per "\n". */
function wrapLine(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): string[] {
  const words = line.split(" ");
  const wrapped: string[] = [];
  let current = words[0] ?? "";
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (current === "" || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      wrapped.push(current);
      current = words[i];
    }
  }
  wrapped.push(current);
  return wrapped;
}

/** Draws one line and, if `underline` is set, a manually-drawn rule beneath it —
 * canvas has no native text-decoration. Spans just the rendered line (not the
 * whole box), positioned using whatever `ctx.textAlign` is currently set to. */
function fillTextLine(ctx: CanvasRenderingContext2D, line: string, drawX: number, y: number, fontSize: number, underline: boolean) {
  ctx.fillText(line, drawX, y);
  if (!underline || line.length === 0) return;
  const width = ctx.measureText(line).width;
  const startX = ctx.textAlign === "center" ? drawX - width / 2 : ctx.textAlign === "right" ? drawX - width : drawX;
  // textBaseline is "middle" for the caller's whole draw pass, so `y` is the
  // glyph box's vertical center, not its baseline — this offset approximates
  // where the baseline (and so the underline a bit below it) actually falls.
  const underlineY = y + fontSize * 0.35;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = Math.max(1, fontSize * 0.06);
  ctx.beginPath();
  ctx.moveTo(startX, underlineY);
  ctx.lineTo(startX + width, underlineY);
  ctx.stroke();
  ctx.restore();
}

/** Left-aligns words within `width`, stretching inter-word gaps so the line's edges land
 * flush at both ends — canvas has no native "justify", so this distributes the leftover
 * space by hand. Single-word lines (nothing to stretch) and the last line of a paragraph
 * (standard typographic convention: the final line stays ragged, not stretched) fall back
 * to a plain left-aligned draw instead. Underline (if set) still spans the *full* box width
 * for a justified line, matching how a continuous rule reads under justified text. */
function drawJustifiedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  leftX: number,
  y: number,
  width: number,
  isLastLine: boolean,
  fontSize: number,
  underline: boolean,
) {
  const words = line.split(" ").filter(Boolean);
  ctx.textAlign = "left";
  if (words.length <= 1 || isLastLine) {
    fillTextLine(ctx, line, leftX, y, fontSize, underline);
    return;
  }
  const wordsWidth = words.reduce((sum, word) => sum + ctx.measureText(word).width, 0);
  const gap = (width - wordsWidth) / (words.length - 1);
  let cursorX = leftX;
  words.forEach((word) => {
    ctx.fillText(word, cursorX, y);
    cursorX += ctx.measureText(word).width + gap;
  });
  if (underline) {
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = Math.max(1, fontSize * 0.06);
    ctx.beginPath();
    ctx.moveTo(leftX, y + fontSize * 0.35);
    ctx.lineTo(leftX + width, y + fontSize * 0.35);
    ctx.stroke();
    ctx.restore();
  }
}

/** `ctx.fillText` ignores "\n", so multi-line paragraphs need each line drawn separately.
 * `x` is the box's own center (matching the DOM preview's centered box). Each authored
 * line is greedily word-wrapped against `boxWidth` first — a real textbox reflow, not one
 * unwrapped line per "\n" — and left/right/justify then align against that same boxWidth
 * (not just the widest rendered line), matching the DOM preview's actual container. */
function drawMultilineText(
  ctx: CanvasRenderingContext2D,
  content: string,
  x: number,
  y: number,
  fontSize: number,
  align: TextAlign,
  boxWidth: number,
  underline: boolean,
) {
  const lines = content.split("\n").flatMap((line) => wrapLine(ctx, line, boxWidth));
  const lineHeight = fontSize * 1.2;
  const totalHeight = lineHeight * Math.max(lines.length - 1, 0);
  const startY = y - totalHeight / 2;
  const leftX = x - boxWidth / 2;

  if (align === "center") {
    ctx.textAlign = "center";
    lines.forEach((line, idx) => fillTextLine(ctx, line, x, startY + idx * lineHeight, fontSize, underline));
    return;
  }

  if (align === "justify") {
    lines.forEach((line, idx) =>
      drawJustifiedLine(ctx, line, leftX, startY + idx * lineHeight, boxWidth, idx === lines.length - 1, fontSize, underline),
    );
    return;
  }

  ctx.textAlign = align === "left" ? "left" : "right";
  const anchorX = align === "left" ? leftX : x + boxWidth / 2;
  lines.forEach((line, idx) => fillTextLine(ctx, line, anchorX, startY + idx * lineHeight, fontSize, underline));
}

type OrderedElement = { kind: "image"; el: ImageElement } | { kind: "text"; el: TextElement };

/**
 * Draws the given project onto a fresh, never-attached canvas at its true pixel
 * dimensions. Shared by both the full-resolution download and thumbnail
 * generation so the two never drift out of sync with each other. Images and
 * texts are interleaved by their shared zIndex rather than drawn as two fixed
 * "all images then all texts" passes, matching the live canvas preview.
 */
export async function renderProjectToCanvas(project: ProjectState): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Guards against exporting before a just-selected/curated font weight has
  // finished downloading — more likely to matter now that there are 50 fonts
  // to choose from instead of 2.
  await document.fonts.ready;

  // backgroundAlpha === 0 leaves the canvas at its native transparent default
  // (skipping the fill entirely, not just filling with a 0-alpha color) so a
  // PNG export with a fully transparent background never picks up antialiasing
  // fringe from a technically-invisible-but-still-composited fill rect.
  if (project.backgroundAlpha > 0) {
    ctx.fillStyle = hexToRgba(project.backgroundColor, project.backgroundAlpha);
    ctx.fillRect(0, 0, project.width, project.height);
  }

  const loadedImages = new Map(
    await Promise.all(
      project.images.map(async (image) => [image.id, await loadImage(image.dataUrl)] as const),
    ),
  );

  const ordered: OrderedElement[] = [
    ...project.images.map((el) => ({ kind: "image" as const, el })),
    ...project.texts.map((el) => ({ kind: "text" as const, el })),
  ].sort((a, b) => a.el.zIndex - b.el.zIndex);

  for (const entry of ordered) {
    if (entry.kind === "image") {
      const image = entry.el;
      const img = loadedImages.get(image.id);
      if (!img) continue;
      const drawX = -image.displayWidth / 2;
      const drawY = -image.displayHeight / 2;

      ctx.save();
      ctx.translate(image.x, image.y);
      ctx.rotate((image.rotation * Math.PI) / 180);

      const edgeBlendLayers = getEnabledEdgeBlendLayers(image.layers);
      if (edgeBlendLayers.length > 0) {
        const edgeColor = edgeColorCache.get(image.dataUrl) ?? getEdgeAverageColor(img);
        for (const layer of edgeBlendLayers) {
          drawEdgeGlow(ctx, edgeColor, drawX, drawY, image.displayWidth, image.displayHeight, layer.margin);
        }
      }

      // Applied after the edge glow (not before) so the glow itself stays at
      // full strength regardless of the image's own transparency — matches
      // the live DOM preview, where opacity lives on the inner content div,
      // not the outer wrapper the edge-glow box-shadow is drawn on.
      ctx.globalAlpha = image.opacity;

      const contentLayers = getEnabledContentLayers(image.layers);
      const asciiLayers = getEnabledAsciiLayers(image.layers);
      const blobTrackerLayers = getEnabledBlobTrackerLayers(image.layers);
      const boxW = Math.ceil(image.displayWidth);
      const boxH = Math.ceil(image.displayHeight);
      // Both ASCII and Blob Tracker need real pixel access (getImageData), which
      // ignores the ctx.translate/rotate already applied above — so whenever either
      // is enabled, their shared box-local (0,0 origin, unrotated) content is built
      // in a scratch canvas first; the final drawImage below DOES respect the
      // current transform, same as every other branch in this function.
      const needsBoxCanvas = asciiLayers.length > 0 || blobTrackerLayers.length > 0;

      if (needsBoxCanvas) {
        const boxCanvas = document.createElement("canvas");
        boxCanvas.width = boxW;
        boxCanvas.height = boxH;
        const boxCtx = boxCanvas.getContext("2d")!;
        if (contentLayers.length > 0) {
          renderEffectStack(img, image.displayWidth, image.displayHeight, contentLayers, image.cropZoom, image.cropOffsetX, image.cropOffsetY);
          boxCtx.drawImage(getGLCanvas(), 0, 0, boxW, boxH);
        } else {
          const src = computeCropSourceRect(img.naturalWidth, img.naturalHeight, image.cropZoom, image.cropOffsetX, image.cropOffsetY);
          boxCtx.drawImage(img, src.x, src.y, src.width, src.height, 0, 0, boxW, boxH);
        }

        // Always applied last, over whatever content was just drawn — see AsciiEffect's
        // doc comment for why this is a structural fixed position, not stack-order-driven.
        let finalCanvas: HTMLCanvasElement = boxCanvas;
        if (asciiLayers.length > 0) {
          finalCanvas = renderAsciiOverlay(boxCanvas, boxW, boxH, asciiLayers[asciiLayers.length - 1]);
        }
        // Blob Tracker samples whatever's on `finalCanvas` (content + ASCII, if any)
        // to place its reticles, then draws directly onto that same box-local canvas
        // — also always last, after ASCII.
        for (const layer of blobTrackerLayers) {
          const finalCtx = finalCanvas.getContext("2d")!;
          drawBlobTrackerOverlay(finalCtx, finalCanvas, 0, 0, boxW, boxH, layer, layer.id);
        }
        ctx.drawImage(finalCanvas, 0, 0, boxW, boxH, drawX, drawY, image.displayWidth, image.displayHeight);
      } else if (contentLayers.length > 0) {
        renderEffectStack(
          img,
          image.displayWidth,
          image.displayHeight,
          contentLayers,
          image.cropZoom,
          image.cropOffsetX,
          image.cropOffsetY,
        );
        ctx.drawImage(getGLCanvas(), 0, 0, boxW, boxH, drawX, drawY, image.displayWidth, image.displayHeight);
      } else {
        const src = computeCropSourceRect(
          img.naturalWidth,
          img.naturalHeight,
          image.cropZoom,
          image.cropOffsetX,
          image.cropOffsetY,
        );
        ctx.drawImage(img, src.x, src.y, src.width, src.height, drawX, drawY, image.displayWidth, image.displayHeight);
      }

      ctx.restore();
    } else {
      const text = entry.el;
      ctx.save();
      ctx.translate(text.x, text.y);
      ctx.rotate((text.rotation * Math.PI) / 180);
      // Matches the live DOM render order (TextElementView.tsx): Warp is the
      // innermost stretch, applied before rotation wraps the already-stretched
      // shape as a rigid unit — a purely decorative effect now, independent of
      // the box's own boxWidth/boxHeight (which drive wrapping below), unlike
      // the old scaleX/scaleY this replaced (which conflated the two).
      ctx.scale(text.warpX, text.warpY);
      const fontStyle = text.italic ? "italic " : "";
      const fontWeight = text.bold ? "bold " : "";
      ctx.font = `${fontStyle}${fontWeight}${text.fontSize}px ${getFontStack(text.fontFamily)}`;
      ctx.fillStyle = hexToRgba(text.color, text.colorAlpha);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (text.glow) applyTextGlow(ctx, text.glowColor, text.glowSize);

      if (text.orientation === "vertical") {
        drawVerticalText(ctx, text.content, 0, 0, text.fontSize);
      } else {
        drawMultilineText(ctx, text.content, 0, 0, text.fontSize, text.align, text.boxWidth, text.underline);
      }
      ctx.restore();
    }
  }

  return canvas;
}

function resolveFilename(name: string): string {
  const trimmed = name.trim();
  return `${trimmed || `wallpaper-${Date.now()}`}.png`;
}

/** Triggers a PNG download from an already-rendered canvas. */
export async function downloadCanvas(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Failed to encode PNG");

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = resolveFilename(name);
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Convenience one-shot: render + download in a single call (no thumbnail/save). */
export async function exportWallpaper(project: ProjectState): Promise<void> {
  const canvas = await renderProjectToCanvas(project);
  await downloadCanvas(canvas, project.name);
}

const THUMBNAIL_WIDTH = 240;

/** Downscales an already-rendered canvas into a small preview thumbnail — no re-render. */
export function generateThumbnailFromCanvas(canvas: HTMLCanvasElement, project: ProjectState): string {
  const thumbHeight = Math.round((THUMBNAIL_WIDTH * project.height) / project.width);

  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = THUMBNAIL_WIDTH;
  thumbCanvas.height = thumbHeight;
  const ctx = thumbCanvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(canvas, 0, 0, project.width, project.height, 0, 0, THUMBNAIL_WIDTH, thumbHeight);
  return thumbCanvas.toDataURL("image/jpeg", 0.7);
}

/** Standalone thumbnail generation (renders its own canvas) — used when no pre-rendered canvas exists yet. */
export async function generateThumbnail(project: ProjectState): Promise<string> {
  const canvas = await renderProjectToCanvas(project);
  return generateThumbnailFromCanvas(canvas, project);
}
