export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const DEFAULT_ROWS = 1;
export const DEFAULT_COLS = 1;
export const DEFAULT_BACKGROUND = "#121212";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;

/** Fixed top header bar height, true CSS px — document-level chrome only
 * (name, undo/redo, save/export). Shared by App.tsx (insets the canvas
 * viewport below it) and every floating side panel (EffectsDrawer,
 * DesignsDrawer, LayerInspectorPanel), which dock flush against its bottom
 * edge rather than leaving a gap. */
export const HEADER_HEIGHT = 64;
/** Fixed left tool rail width, true CSS px — content/canvas tools (Upload,
 * Auto-Fill, Add Text, Canvas Settings, Background Color, Designs). Docks
 * below the header, to the left of the ruler/canvas. Floating side panels
 * that open from the left (EffectsDrawer's stack panel) start clear of this
 * rail, not on top of it, so the rail stays usable while they're open. */
export const RAIL_WIDTH = 84;
/** Ruler bar thickness, true CSS px. The ruler sits in the gap between the
 * rail and the canvas (and between the header and the canvas), and floating
 * panels are deliberately NOT inset around it the way they're inset around
 * the rail: EffectsDrawer/DesignsDrawer dock flush against the header,
 * covering the top ruler's lane for their own width — only the *left* ruler
 * (which sits inside the rail's own gap, not the canvas's) stays clear. */
export const RULER_THICKNESS = 32;

/** Image Effects' left-docked "Active Stack" panel — user-resizable via its
 * own right-edge drag handle (see EffectsDrawer.tsx), stored in uiStore
 * (rather than local component state) so App.tsx's layout wrapper can read
 * it to push the canvas/ruler over by the same amount. */
export const EFFECTS_PANEL_MIN_WIDTH = 380;
export const EFFECTS_PANEL_MAX_WIDTH = 760;
export const EFFECTS_PANEL_DEFAULT_WIDTH = 420;
/** Text Effects' left-docked panel — fixed width, no resize handle (empty
 * placeholder content for now). */
export const TEXT_EFFECTS_PANEL_WIDTH = 320;
/** The right-docked "customize this layer" panel opened from the Active Stack. */
export const LAYER_INSPECTOR_WIDTH = 340;
/** Shared duration/easing for every panel-push transition (the docked
 * drawers sliding in/out AND the canvas/ruler being shifted over to make
 * room for them) — kept identical across both so they visibly move as one
 * synchronized motion rather than two independently-timed animations. */
export const PANEL_PUSH_TRANSITION = "320ms cubic-bezier(0.22, 1, 0.36, 1)";

export const DISPLAY_SIZE_MIN = 20;
export const DISPLAY_SIZE_MAX = 4000;
/** Flat px step for the independent Width/Height steppers (image displayWidth/Height, text boxWidth/Height). */
export const RESCALE_STEP_PX = 20;

/** A freshly-created text element's initial frame — content reflows/wraps to
 * fit this, and it's user-resizable afterward exactly like an image's frame. */
export const DEFAULT_TEXT_BOX_WIDTH = 400;
export const DEFAULT_TEXT_BOX_HEIGHT = 150;

/** Clamp range for an image's crop-mode zoom (1 = whole image squished to its
 * frame, no crop). Below 1 the image renders smaller than its frame — like
 * Illustrator's crop frame, the frame itself stays fixed and the image can
 * shrink inside it, revealing blank space around it rather than always
 * having to fully cover the frame. */
export const CROP_ZOOM_MIN = 0.2;
export const CROP_ZOOM_MAX = 6;
/** Wheel-to-crop-zoom sensitivity — deltaY (or trackpad-pinch deltaY, reported as a ctrl+wheel event) times this per tick. */
export const CROP_ZOOM_WHEEL_STEP = 0.0025;

/** How close (screen px, independent of zoom) a dragged resize edge must be to a
 * grid line before it snaps to it — Canva-style "clip to the nearest column/row". */
export const RESIZE_SNAP_THRESHOLD_SCREEN_PX = 10;

/** How close (screen px, independent of zoom) a free-form-moved element's own
 * center must be to a row/column line or the canvas mid-line before it snaps
 * and shows an alignment guide — Illustrator/InDesign-style smart guides,
 * used only while the anchor toggle is off (see showAnchors's doc comment). */
export const ALIGN_GUIDE_SNAP_THRESHOLD_SCREEN_PX = 8;

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

/** Text glow: an outer, blurred, colored halo around the glyphs — off by default. */
export const DEFAULT_GLOW_COLOR = "#ffffff";
export const GLOW_SIZE_MIN = 4;
export const GLOW_SIZE_MAX = 120;
export const DEFAULT_GLOW_SIZE = 24;

/** Shared opacity/alpha clamp range for images, text color, and canvas background. */
export const OPACITY_MIN = 0;
export const OPACITY_MAX = 1;

/** Clamp range for text elements' Warp tool (a fraction, 1 = 100% = no warp). */
export const WARP_MIN = 0.2;
export const WARP_MAX = 5;
/** Percentage-point step for the Warp X/Y steppers (displayed/edited as %, stored as a fraction). */
export const WARP_STEP_PERCENT = 10;

export const MAX_HISTORY_ENTRIES = 20;
export const HISTORY_STORAGE_KEY = "wallpaper-designs-history";

/** In-memory undo/redo stack depth (projectStore's past/future) — distinct from
 * MAX_HISTORY_ENTRIES above, which caps the persisted saved-designs list, not
 * live edit history. */
export const MAX_UNDO_ENTRIES = 60;

/** User-saved custom color swatches — a standalone preference, not tied to any one project. */
export const CUSTOM_SWATCHES_STORAGE_KEY = "wallpaper-custom-swatches";
export const MAX_CUSTOM_SWATCHES = 24;

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
  { label: "1 × 1", cols: 1, rows: 1 },
  { label: "2 × 2", cols: 2, rows: 2 },
  { label: "3 × 3", cols: 3, rows: 3 },
  { label: "4 × 4", cols: 4, rows: 4 },
  { label: "5 × 5", cols: 5, rows: 5 },
  { label: "6 × 6", cols: 6, rows: 6 },
];
