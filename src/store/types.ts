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
  /** Shared stacking order across images and texts — higher paints on top. */
  zIndex: number;
}

export type TextOrientation = "horizontal" | "vertical";

export interface TextElement {
  id: string;
  content: string;
  fontFamily: FontFamilyKey;
  fontSize: number;
  orientation: TextOrientation;
  color: string;
  /** Center-anchored, true canvas px */
  x: number;
  /** Center-anchored, true canvas px */
  y: number;
  /** Corner-drag stretch factors on top of fontSize, default 1 — see TextElementView. */
  scaleX: number;
  scaleY: number;
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

export type RadialMenuContext = "canvas" | "image" | "text";

export interface RadialMenuState {
  open: boolean;
  x: number;
  y: number;
  context: RadialMenuContext;
  targetId: string | null;
}
