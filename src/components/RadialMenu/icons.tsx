/** Minimal geometric line icons matching the HUD aesthetic — no external icon library. */

export function DeleteIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 6h12M8 6V4.5h4V6M6 6l.6 10h6.8L14 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HalftoneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" stroke="none">
      <circle cx="5" cy="5" r="2.6" />
      <circle cx="12.5" cy="5" r="1.9" />
      <circle cx="5" cy="12.5" r="1.9" />
      <circle cx="12.5" cy="12.5" r="1.2" />
      <circle cx="17" cy="8" r="0.9" />
      <circle cx="8" cy="17" r="0.9" />
    </svg>
  );
}

export function ImageEffectsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10 3.5 12 8l4.5 0.7-3.3 3.1.8 4.4L10 14l-4 2.2.8-4.4-3.3-3.1L8 8Z" strokeLinejoin="round" />
    </svg>
  );
}

export function EdgeGlowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="10" r="3.2" />
      <circle cx="10" cy="10" r="6.5" opacity="0.5" strokeDasharray="1.5 2" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10 13V4M6.5 7.5 10 4l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 14.5V16h11v-1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path
        d="M3.5 6h4l1.4 1.6H16.5v8.4h-13V6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NewDesignIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M5.5 3.5h6l3 3v10h-9Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 9v4M8 11h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10 4v9M6.5 9.5 10 13l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5H15.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="10" r="3" />
      <path
        d="M10 3v1.5M10 15.5V17M17 10h-1.5M4.5 10H3M15 5l-1 1M6 14l-1 1M15 15l-1-1M6 6 5 5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" stroke="none">
      <path d="M14.5 12.8A6 6 0 0 1 7.2 5.5a6.3 6.3 0 1 0 7.3 7.3Z" />
    </svg>
  );
}

export function FontIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M4 15 8 5l4 10M5.2 12h5.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 15V8.5h3.5M13 11.5h3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OrientationIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 10h12M13 6.5 16.5 10 13 13.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4v12M6.5 6 10 4l3.5 2" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
    </svg>
  );
}

export function SizeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 15V5M16 15V5M4 5h4M4 15h4M12 15h4M12 5h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Distinct from SizeIcon (a generic ruler-bracket glyph reused for font size etc.) —
 * this one reads specifically as "a box with both dimensions," for the combined
 * Width+Height stacked pill so it doesn't visually collide with unrelated
 * size controls that happen to share the ring. */
export function DimensionsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="5" y="5" width="10" height="10" rx="0.8" />
      {/* Dimension-line brackets on all 4 sides, symmetric about the center —
          the old version only bracketed the top+left, which pulled the whole
          icon's visual weight into that corner and read as off-center. */}
      <path d="M5 2.5h10M5 17.5h10" strokeLinecap="round" />
      <path d="M5 1.7v1.6M15 1.7v1.6M5 16.7v1.6M15 16.7v1.6" strokeLinecap="round" />
      <path d="M2.5 5v10M17.5 5v10" strokeLinecap="round" />
      <path d="M1.7 5h1.6M1.7 15h1.6M16.7 5h1.6M16.7 15h1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Photoshop/Illustrator-style crop-tool glyph: two overlapping L-shaped corner
 * brackets, distinct in silhouette from the plain resize-handle dots. */
export function CropIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M6.5 3v9.5a1 1 0 0 0 1 1H17" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 17V7.5a1 1 0 0 0-1-1H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BoldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" stroke="none">
      <path d="M6 4h5.2a3.3 3.3 0 0 1 1.9 6 3.5 3.5 0 0 1-1.6 6.5H6Zm2.6 2.3v3.6h2.5a1.8 1.8 0 0 0 0-3.6Zm0 5.9v3.5h3a1.75 1.75 0 0 0 0-3.5Z" />
    </svg>
  );
}

export function ItalicIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M11.5 4h4M4.5 16h4M13 4 7 16" strokeLinecap="round" />
    </svg>
  );
}

export function UnderlineIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M6 4v6a4 4 0 0 0 8 0V4" strokeLinecap="round" />
      <path d="M4.5 16h11" strokeLinecap="round" />
    </svg>
  );
}

/** Reads as "stretch the content, not the frame" — a rectangle (the box) with
 * arrows pulling past its own edges, distinct from DimensionsIcon's plain
 * box-with-ticks (which is the frame/layout size itself, not this decorative
 * distortion effect layered on top of it). */
export function WarpIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="6" y="6" width="8" height="8" rx="0.6" />
      <path d="M2.5 10h2M15.5 10h2M4 8.7 2.5 10l1.5 1.3M16 8.7 17.5 10 16 11.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 2.5v2M10 15.5v2M8.7 4 10 2.5l1.3 1.5M8.7 16l1.3 1.5 1.3-1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ResetIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M15.5 10a5.5 5.5 0 1 1-1.8-4.1" strokeLinecap="round" />
      <path d="M15.5 3.5v3.6h-3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RotateIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4.5 10a5.5 5.5 0 1 0 1.9-4.15" strokeLinecap="round" />
      <path d="M3.5 3.5v3.6h3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlignLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 5.5h12M4 10h8M4 14.5h10" strokeLinecap="round" />
    </svg>
  );
}

export function AlignCenterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 5.5h12M6 10h8M5 14.5h10" strokeLinecap="round" />
    </svg>
  );
}

export function AlignRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 5.5h12M8 10h8M6 14.5h10" strokeLinecap="round" />
    </svg>
  );
}

export function AlignJustifyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 5.5h12M4 10h12M4 14.5h12" strokeLinecap="round" />
    </svg>
  );
}

export function TextContentIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 6h12M4 10h12M4 14h7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Group-pill glyph for the text ring's "Layout" submenu (orientation, align,
 * dimensions, warp) — a frame divided into quadrants, distinct from
 * DimensionsIcon's plain ticked box (which is the specific box-size control
 * nested one level inside this group, not the group itself). */
export function LayoutIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="3.5" y="3.5" width="13" height="13" rx="0.8" />
      <path d="M3.5 9.5h13M9.5 3.5v13" strokeLinecap="round" />
    </svg>
  );
}

export function BackChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 5 7 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M12.3 4.3 15.7 7.7 7 16.4 3.5 16.5 3.6 13 Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.8 5.8 14.2 9.2" strokeLinecap="round" />
    </svg>
  );
}

export function LayersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10 3.5 16.5 7 10 10.5 3.5 7Z" strokeLinejoin="round" />
      <path d="M3.5 10.5 10 14l6.5-3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <path d="M3.5 13.5 10 17l6.5-3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
    </svg>
  );
}

export function BringToFrontIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="3.5" y="7.5" width="8" height="8" rx="1" opacity="0.4" />
      <rect x="8.5" y="4.5" width="8" height="8" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SendToBackIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="3.5" y="7.5" width="8" height="8" rx="1" fill="currentColor" stroke="none" />
      <rect x="8.5" y="4.5" width="8" height="8" rx="1" opacity="0.4" />
    </svg>
  );
}

export function BringForwardIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="3.5" y="8.5" width="8" height="8" rx="1" opacity="0.4" />
      <rect x="8.5" y="5.5" width="8" height="8" rx="1" fill="currentColor" stroke="none" />
      <path d="M7.5 4v-1.5M6.2 3.7 7.5 2.5l1.3 1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SendBackwardIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="3.5" y="6.5" width="8" height="8" rx="1" fill="currentColor" stroke="none" />
      <rect x="8.5" y="3.5" width="8" height="8" rx="1" opacity="0.4" />
      <path d="M7.5 16v1.5M6.2 16.3 7.5 17.5l1.3-1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Four inward-pointing corner brackets — "fit to view"/"reset view" glyph,
 * distinct from ResetIcon's circular-arrow (that one reverts a *value*, this
 * one reverts the *viewport*). */
export function ResetViewIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 7V4.5a1.5 1.5 0 0 1 1.5-1.5H7M17 7V4.5A1.5 1.5 0 0 0 15.5 3H13M3 13v2.5A1.5 1.5 0 0 0 4.5 17H7M17 13v2.5a1.5 1.5 0 0 1-1.5 1.5H13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HandIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path
        d="M7 10.5V4.8a1.1 1.1 0 0 1 2.2 0V9M9.2 9V4a1.1 1.1 0 0 1 2.2 0v5M11.4 9V4.9a1.1 1.1 0 0 1 2.2 0V9M13.6 9.2v-2a1.1 1.1 0 0 1 2.2 0v6.3c0 2.5-1.8 4.5-4.6 4.5h-1.6c-1.6 0-2.5-.5-3.4-1.6L3 12.6a1.15 1.15 0 0 1 1.6-1.6L7 13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="5" y="9" width="10" height="7.5" rx="1.2" strokeLinejoin="round" />
      <path d="M6.8 9V6.5a3.2 3.2 0 0 1 6.4 0V9" strokeLinecap="round" />
    </svg>
  );
}

export function UnlockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="5" y="9" width="10" height="7.5" rx="1.2" strokeLinejoin="round" />
      <path d="M6.8 9V6.5a3.2 3.2 0 0 1 6.2-1" strokeLinecap="round" />
    </svg>
  );
}

export function CanvasSettingsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="3.5" y="3.5" width="13" height="13" rx="1.2" strokeLinejoin="round" />
      <path d="M3.5 8.2h13M3.5 12.2h13M8.2 3.5v13" strokeLinecap="round" />
    </svg>
  );
}

export function SaveIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4.5 3.5h8.6L15.5 6v10.5h-11v-13Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.7 3.5v4h5.3v-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.7 16.5v-5.2h6.6v5.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Pipette/eyedropper glyph — diagonal barrel + a small droplet dot at the tip,
 * distinct in silhouette from PencilIcon (which reads as "edit", not "sample"). */
export function EyedropperIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M12.5 3.8 16.2 7.5 8.8 14.9 5.1 11.2Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.9 5.4 14.6 9.1" strokeLinecap="round" />
      <path d="M5.1 11.2 3.3 15.4a0.9 0.9 0 0 0 1.2 1.2l4.2-1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="4" cy="16" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
  );
}

/** Half-filled circle over a checker swatch — reads as "opacity/transparency"
 * distinct from HalftoneIcon's dot-grid pattern. */
export function OpacityIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5a6.5 6.5 0 0 1 0 13Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GlowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="10" r="3" />
      <path
        d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.6 4.6l1.4 1.4M13.9 13.9l1.4 1.4M4.6 15.4l1.4-1.4M13.9 6.1l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PaletteIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10 3.5a6.5 6.5 0 1 0 0 13c.8 0 1.3-.6 1.3-1.3 0-.35-.15-.66-.36-.9a1.2 1.2 0 0 1-.3-.8c0-.65.55-1.2 1.2-1.2h1.4a2.9 2.9 0 0 0 2.9-2.9c0-3.3-3-5.9-6.14-5.9Z" />
      <circle cx="7" cy="8" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="10" cy="6.3" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="13" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TagIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10.5 3.5H5.5a2 2 0 0 0-2 2v5l7.6 7.6a1.4 1.4 0 0 0 2 0l4-4a1.4 1.4 0 0 0 0-2L10.5 3.5Z" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GridLayoutIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="3" y="3" width="6" height="14" rx="0.8" />
      <rect x="11" y="3" width="6" height="6.2" rx="0.8" />
      <rect x="11" y="10.8" width="6" height="6.2" rx="0.8" />
    </svg>
  );
}
