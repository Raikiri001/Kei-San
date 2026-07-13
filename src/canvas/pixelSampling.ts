/** Draws `img` stretched into a small `dim x dim` offscreen canvas and reads it back once. Shared by color extraction and edge-blend sampling so both pay this cost only once per analysis. */
export function getDownsampledImageData(img: HTMLImageElement, dim: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, dim, dim);
  return ctx.getImageData(0, 0, dim, dim);
}
