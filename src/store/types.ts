import type { FontFamilyKey } from "@/constants/fonts";

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
}

export type TextOrientation = "horizontal" | "vertical";

/** Horizontal alignment of wrapped/multi-line content within the text box — no effect on vertical orientation. */
export type TextAlign = "left" | "center" | "right" | "justify";

export interface TextElement {
  id: string;
  content: string;
  fontFamily: FontFamilyKey;
  fontSize: number;
  orientation: TextOrientation;
  align: TextAlign;
  color: string;
  /** Center-anchored, true canvas px */
  x: number;
  /** Center-anchored, true canvas px */
  y: number;
  /** Corner-drag stretch factors on top of fontSize, default 1 — see TextElementView. */
  scaleX: number;
  scaleY: number;
  /** Clockwise rotation in degrees around the element's own center. Default 0. */
  rotation: number;
  /** Shared stacking order across images and texts — higher paints on top. */
  zIndex: number;
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
  images: ImageElement[];
  texts: TextElement[];
  updatedAt: number;
}

export interface SavedDesign extends ProjectState {
  thumbnailDataUrl: string;
}

export type RadialMenuContext = "image" | "text";

export interface RadialMenuState {
  open: boolean;
  x: number;
  y: number;
  context: RadialMenuContext;
  targetId: string | null;
}
