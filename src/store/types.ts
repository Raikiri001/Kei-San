import type { FontId } from "@/constants/fonts";

export interface ImageElement {
  id: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  /** Center-anchored, true canvas px */
  x: number;
  /** Center-anchored, true canvas px */
  y: number;
  /** Renders as a halftone dot grid instead of a plain image when true (label: "Halftone"). */
  circleMask: boolean;
  /** Which halftone fill to use when circleMask is on. */
  halftoneMode: "color" | "ink";
  /** Halftone dot pitch in true canvas px — smaller = more/finer circles. */
  halftoneDotPitch: number;
  /** Soft glow, sampled from the image's own edge color, blended into the background. */
  edgeBlend: boolean;
  /** Edge-blend glow size in true canvas px, seeded from an auto-formula at upload then user-adjustable. */
  edgeBlendMargin: number;
  /** Clockwise rotation in degrees around the element's own center. Default 0. */
  rotation: number;
  /** Shared stacking order across images and texts — higher paints on top. */
  zIndex: number;
  /** Crop zoom (>=1) applied on top of the base squish-to-frame fit. 1 = no crop, whole image squished to fill displayWidth/displayHeight. Set via double-click crop mode. */
  cropZoom: number;
  /** Crop pan, each a fraction (-1..1) of the max pannable distance at the current cropZoom — not raw px, so it stays valid if the frame is later resized. */
  cropOffsetX: number;
  cropOffsetY: number;
  /** Overall element opacity/transparency, 0 (fully transparent) - 1 (fully opaque). */
  opacity: number;
  /** Blocks move/resize/rotate/delete while true; all other edits (style, crop, layer order) remain available. */
  locked: boolean;
}

export type TextOrientation = "horizontal" | "vertical";

/** Horizontal alignment of wrapped/multi-line content within the text box — no effect on vertical orientation. */
export type TextAlign = "left" | "center" | "right" | "justify";

export interface TextElement {
  id: string;
  content: string;
  fontFamily: FontId;
  fontSize: number;
  orientation: TextOrientation;
  align: TextAlign;
  color: string;
  /** Alpha (0-1) applied to the text's own fill color (and its glow, if on). */
  colorAlpha: number;
  /** Outer glow around the glyphs — a colored, blurred halo independent of the
   * fill color, off by default. */
  glow: boolean;
  glowColor: string;
  /** Glow blur radius, true canvas px. */
  glowSize: number;
  /** Center-anchored, true canvas px */
  x: number;
  /** Center-anchored, true canvas px */
  y: number;
  /** Explicit text-frame dimensions (true canvas px), set via the corner/edge
   * resize handles — a real textbox: content reflows/wraps to fit this width,
   * independent of fontSize (which only ever controls glyph size). Same
   * mechanism as an image's displayWidth/displayHeight. */
  boxWidth: number;
  boxHeight: number;
  /** Warp: a purely decorative glyph stretch (percentage-based, 1 = 100% = no
   * warp), layered on top of the properly-sized, properly-wrapping box above —
   * NOT a sizing mechanism itself, unlike the old scaleX/scaleY it replaces. */
  warpX: number;
  warpY: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Clockwise rotation in degrees around the element's own center. Default 0. */
  rotation: number;
  /** Shared stacking order across images and texts — higher paints on top. */
  zIndex: number;
  /** Blocks move/resize/rotate/delete while true; all other edits (style, layer order) remain available. */
  locked: boolean;
}

export type CanvasElement = ImageElement | TextElement;

export interface ProjectState {
  id: string;
  name: string;
  width: number;
  height: number;
  rows: number;
  cols: number;
  backgroundColor: string;
  /** Alpha (0-1) of the canvas background fill — 0 lets PNG export produce a
   * transparent background instead of a solid color. */
  backgroundAlpha: number;
  images: ImageElement[];
  texts: TextElement[];
  updatedAt: number;
}

export interface SavedDesign extends ProjectState {
  thumbnailDataUrl: string;
}

export type RadialMenuContext = "image" | "text" | "mixed";

export interface RadialMenuState {
  open: boolean;
  x: number;
  y: number;
  context: RadialMenuContext;
  targetIds: string[];
}
