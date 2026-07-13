export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const DEFAULT_ROWS = 4;
export const DEFAULT_COLS = 4;
export const DEFAULT_BACKGROUND = "#121212";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;

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
