export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const DEFAULT_ROWS = 4;
export const DEFAULT_COLS = 4;
export const DEFAULT_BACKGROUND = "#121212";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;

export const DISPLAY_SIZE_MIN = 20;
export const DISPLAY_SIZE_MAX = 4000;
/** Flat px step for the independent Width/Height steppers (image size, text scaleX/scaleY-in-px). */
export const RESCALE_STEP_PX = 20;

/** Clamp range for an image's crop-mode zoom (1 = whole image squished to its frame, no crop). */
export const CROP_ZOOM_MIN = 1;
export const CROP_ZOOM_MAX = 6;
/** Wheel-to-crop-zoom sensitivity — deltaY (or trackpad-pinch deltaY, reported as a ctrl+wheel event) times this per tick. */
export const CROP_ZOOM_WHEEL_STEP = 0.0025;

export const ROTATION_SNAP_DEGREES = 15;
/** Visible resize-handle dot size — deliberately small; the actual pointer/touch
 * target is HANDLE_HIT_SIZE, an invisible padded zone around this dot (see
 * ResizeHandles.tsx), not a literally-enlarged visible square. */
export const HANDLE_VISUAL_SIZE = 12;
export const HANDLE_HIT_SIZE = 26;
export const ROTATE_HANDLE_VISUAL_SIZE = 12;
export const ROTATE_HANDLE_HIT_SIZE = 28;
/** Distance (CSS px, pre-counter-scale) the rotate handle sits above the top-center edge. */
export const ROTATE_HANDLE_OFFSET = 22;

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 400;

/** Clamp range for text elements' corner-drag scaleX/scaleY stretch factors. */
export const TEXT_SCALE_MIN = 0.2;
export const TEXT_SCALE_MAX = 5;

export const MAX_HISTORY_ENTRIES = 20;
export const HISTORY_STORAGE_KEY = "wallpaper-designs-history";

export interface ResolutionPreset {
  label: string;
  width: number;
  height: number;
}

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { label: "4K UHD (3840×2160)", width: 3840, height: 2160 },
  { label: "2K QHD (2560×1440)", width: 2560, height: 1440 },
  { label: "Full HD (1920×1080)", width: 1920, height: 1080 },
  { label: "Mobile Portrait (1080×1920)", width: 1080, height: 1920 },
  { label: "Square (2048×2048)", width: 2048, height: 2048 },
];

export interface GridPreset {
  label: string;
  cols: number;
  rows: number;
}

export const GRID_PRESETS: GridPreset[] = [
  { label: "2 × 2", cols: 2, rows: 2 },
  { label: "3 × 3", cols: 3, rows: 3 },
  { label: "4 × 4", cols: 4, rows: 4 },
  { label: "5 × 5", cols: 5, rows: 5 },
  { label: "6 × 6", cols: 6, rows: 6 },
];
