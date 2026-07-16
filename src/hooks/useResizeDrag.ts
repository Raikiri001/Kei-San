import { useCallback, useRef } from "react";

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

interface Box {
  /** Center-anchored, true canvas px (or, for text, "rendered px at current scale"). */
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseResizeDragOptions {
  corner: ResizeCorner;
  /** Reads the element's current committed box at drag start. */
  getBox: () => Box;
  zoom: number;
  /** Forces uniform (aspect-locked) scaling regardless of Shift — OR'd with the live Shift key each move. */
  aspectLocked: boolean;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  /** Called continuously while dragging with a live, unclamped-except-by-min/max preview box. */
  onPreview: (box: Box) => void;
  /** Called once on release with the final box. */
  onCommit: (box: Box) => void;
}

const CORNER_SIGN: Record<ResizeCorner, { sx: 1 | -1; sy: 1 | -1 }> = {
  nw: { sx: -1, sy: -1 },
  ne: { sx: 1, sy: -1 },
  sw: { sx: -1, sy: 1 },
  se: { sx: 1, sy: 1 },
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Resizes `box0` by dragging `corner` a canvas-px `(deltaX, deltaY)`, keeping the
 * opposite corner fixed in canvas space. In `uniform` mode the scale factor is
 * derived from the drag's diagonal distance (so it responds naturally to any
 * drag direction) and applied equally to both axes from the original aspect
 * ratio; otherwise width/height change independently.
 */
function computeResizedBox(
  corner: ResizeCorner,
  box0: Box,
  deltaX: number,
  deltaY: number,
  uniform: boolean,
  minW: number,
  maxW: number,
  minH: number,
  maxH: number,
): Box {
  const { sx, sy } = CORNER_SIGN[corner];
  const anchorX = box0.x - sx * (box0.w / 2);
  const anchorY = box0.y - sy * (box0.h / 2);
  const cornerStartX = box0.x + sx * (box0.w / 2);
  const cornerStartY = box0.y + sy * (box0.h / 2);
  const newCornerX = cornerStartX + deltaX;
  const newCornerY = cornerStartY + deltaY;

  let w: number;
  let h: number;

  if (uniform) {
    const oldDiag = Math.hypot(box0.w, box0.h) || 1;
    const newDiag = Math.hypot(newCornerX - anchorX, newCornerY - anchorY);
    const scaleMin = Math.max(minW / box0.w, minH / box0.h);
    const scaleMax = Math.min(maxW / box0.w, maxH / box0.h);
    const scale = clamp(newDiag / oldDiag, scaleMin, scaleMax);
    w = box0.w * scale;
    h = box0.h * scale;
  } else {
    w = clamp(Math.abs(newCornerX - anchorX), minW, maxW);
    h = clamp(Math.abs(newCornerY - anchorY), minH, maxH);
  }

  return { x: anchorX + sx * (w / 2), y: anchorY + sy * (h / 2), w, h };
}

/**
 * Anchor-relative corner resize — a sibling to useDrag, not built on it, since the
 * math (opposite-corner-fixed sizing, optional live-Shift uniform scaling) is
 * fundamentally different from a simple delta-translate move.
 */
export function useResizeDrag({
  corner,
  getBox,
  zoom,
  aspectLocked,
  minW,
  maxW,
  minH,
  maxH,
  onPreview,
  onCommit,
}: UseResizeDragOptions) {
  const dragState = useRef<{ startScreenX: number; startScreenY: number; box0: Box } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      dragState.current = { startScreenX: e.clientX, startScreenY: e.clientY, box0: getBox() };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [getBox],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const state = dragState.current;
      if (!state) return;
      const deltaX = (e.clientX - state.startScreenX) / zoom;
      const deltaY = (e.clientY - state.startScreenY) / zoom;
      // Read shiftKey live (not just at drag-start) so it can be toggled mid-drag.
      const uniform = aspectLocked || e.shiftKey;
      onPreview(computeResizedBox(corner, state.box0, deltaX, deltaY, uniform, minW, maxW, minH, maxH));
    },
    [corner, zoom, aspectLocked, minW, maxW, minH, maxH, onPreview],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const state = dragState.current;
      dragState.current = null;
      if (!state) return;
      const deltaX = (e.clientX - state.startScreenX) / zoom;
      const deltaY = (e.clientY - state.startScreenY) / zoom;
      const uniform = aspectLocked || e.shiftKey;
      onCommit(computeResizedBox(corner, state.box0, deltaX, deltaY, uniform, minW, maxW, minH, maxH));
    },
    [corner, zoom, aspectLocked, minW, maxW, minH, maxH, onCommit],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
