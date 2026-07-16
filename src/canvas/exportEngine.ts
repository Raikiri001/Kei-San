import { FONT_STACKS } from "@/constants/fonts";
import { loadImage } from "@/utils/fileToDataUrl";
import { computeCoverSourceRect } from "@/utils/coverFit";
import type { ImageElement, ProjectState, TextAlign, TextElement } from "@/store/types";
import { drawVerticalText } from "@/canvas/verticalText";
import { drawHalftone, resolveInkColor } from "@/canvas/halftone";
import { drawEdgeGlow, getEdgeAverageColor } from "@/canvas/edgeBlend";
import { edgeColorCache } from "@/canvas/analysisCaches";

/** Left-aligns words within `width`, stretching inter-word gaps so the line's edges land
 * flush at both ends — canvas has no native "justify", so this distributes the leftover
 * space by hand. Single-word lines (nothing to stretch) and the last line of a paragraph
 * (standard typographic convention: the final line stays ragged, not stretched) fall back
 * to a plain left-aligned draw instead. */
function drawJustifiedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  leftX: number,
  y: number,
  width: number,
  isLastLine: boolean,
) {
  const words = line.split(" ").filter(Boolean);
  if (words.length <= 1 || isLastLine) {
    ctx.textAlign = "left";
    ctx.fillText(line, leftX, y);
    return;
  }
  const wordsWidth = words.reduce((sum, word) => sum + ctx.measureText(word).width, 0);
  const gap = (width - wordsWidth) / (words.length - 1);
  ctx.textAlign = "left";
  let cursorX = leftX;
  words.forEach((word) => {
    ctx.fillText(word, cursorX, y);
    cursorX += ctx.measureText(word).width + gap;
  });
}

/** `ctx.fillText` ignores "\n", so multi-line paragraphs need each line drawn separately.
 * `x` is the box's own center (matching the DOM preview's centered box); left/right/justify
 * measure the widest line to find that box's edges, so short lines align against the same
 * edge a browser would wrap them to, not against the anchor point itself. */
function drawMultilineText(
  ctx: CanvasRenderingContext2D,
  content: string,
  x: number,
  y: number,
  fontSize: number,
  align: TextAlign,
) {
  const lines = content.split("\n");
  const lineHeight = fontSize * 1.2;
  const totalHeight = lineHeight * Math.max(lines.length - 1, 0);
  const startY = y - totalHeight / 2;

  if (align === "center") {
    ctx.textAlign = "center";
    lines.forEach((line, idx) => ctx.fillText(line, x, startY + idx * lineHeight));
    return;
  }

  const maxWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const leftX = x - maxWidth / 2;

  if (align === "justify") {
    lines.forEach((line, idx) =>
      drawJustifiedLine(ctx, line, leftX, startY + idx * lineHeight, maxWidth, idx === lines.length - 1),
    );
    return;
  }

  ctx.textAlign = align === "left" ? "left" : "right";
  const anchorX = align === "left" ? leftX : x + maxWidth / 2;
  lines.forEach((line, idx) => ctx.fillText(line, anchorX, startY + idx * lineHeight));
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

  ctx.fillStyle = project.backgroundColor;
  ctx.fillRect(0, 0, project.width, project.height);

  const inkColor = resolveInkColor(project.backgroundColor);
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
      const drawX = image.x - image.displayWidth / 2;
      const drawY = image.y - image.displayHeight / 2;

      if (image.edgeBlend) {
        const edgeColor = edgeColorCache.get(image.dataUrl) ?? getEdgeAverageColor(img);
        drawEdgeGlow(ctx, edgeColor, drawX, drawY, image.displayWidth, image.displayHeight, image.edgeBlendMargin);
      }

      if (image.circleMask) {
        drawHalftone(
          ctx,
          img,
          drawX,
          drawY,
          image.displayWidth,
          image.displayHeight,
          image.halftoneMode,
          inkColor,
          image.halftoneDotPitch,
        );
      } else {
        const src = computeCoverSourceRect(img.naturalWidth, img.naturalHeight, image.displayWidth, image.displayHeight);
        ctx.drawImage(img, src.x, src.y, src.width, src.height, drawX, drawY, image.displayWidth, image.displayHeight);
      }
    } else {
      const text = entry.el;
      ctx.font = `${text.fontSize}px ${FONT_STACKS[text.fontFamily]}`;
      ctx.fillStyle = text.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (text.orientation === "vertical") {
        drawVerticalText(ctx, text.content, text.x, text.y, text.fontSize);
      } else {
        drawMultilineText(ctx, text.content, text.x, text.y, text.fontSize, text.align);
      }
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
