export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Replicates CSS `object-fit: cover` cropping math for canvas drawImage's 9-arg
 * source-rect form, so canvas-drawn images crop identically to the DOM `<img>`
 * preview (which gets `object-cover` for free from CSS) instead of stretching.
 */
export function computeCoverSourceRect(naturalW: number, naturalH: number, boxW: number, boxH: number): Rect {
  const naturalRatio = naturalW / naturalH;
  const boxRatio = boxW / boxH;

  const width = naturalRatio > boxRatio ? naturalH * boxRatio : naturalW;
  const height = naturalRatio > boxRatio ? naturalH : naturalW / boxRatio;

  return {
    x: (naturalW - width) / 2,
    y: (naturalH - height) / 2,
    width,
    height,
  };
}
