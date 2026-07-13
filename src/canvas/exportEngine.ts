import { FONT_STACKS } from "@/constants/fonts";
import { loadImage } from "@/utils/fileToDataUrl";
import { computeCoverSourceRect } from "@/utils/coverFit";
import type { ProjectState } from "@/store/types";
import { drawVerticalText } from "@/canvas/verticalText";
import { drawHalftone, resolveInkColor } from "@/canvas/halftone";
import { drawEdgeGlow, getEdgeAverageColor } from "@/canvas/edgeBlend";
import { edgeColorCache } from "@/canvas/analysisCaches";

/**
 * Draws the given project onto a fresh, never-attached canvas at its true pixel
 * dimensions. Shared by both the full-resolution download and thumbnail
 * generation so the two never drift out of sync with each other.
 */
export async function renderProjectToCanvas(project: ProjectState): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = project.backgroundColor;
  ctx.fillRect(0, 0, project.width, project.height);

  if (project.images.length) {
    const inkColor = resolveInkColor(project.backgroundColor);
    const loaded = await Promise.all(
      project.images.map(async (image) => ({ image, img: await loadImage(image.dataUrl) })),
    );

    for (const { image, img } of loaded) {
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
    }
  }

  for (const text of project.texts) {
    ctx.font = `${text.fontSize}px ${FONT_STACKS[text.fontFamily]}`;
    ctx.fillStyle = text.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (text.orientation === "vertical") {
      drawVerticalText(ctx, text.content, text.x, text.y, text.fontSize);
    } else {
      ctx.fillText(text.content, text.x, text.y);
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
