import { useCallback, useRef } from "react";
import { snapLineToGrid } from "@/utils/grid";
import { useUIStore } from "@/store/uiStore";
import { RESIZE_SNAP_THRESHOLD_SCREEN_PX } from "@/constants/defaults";

export type ResizeHandleId = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

interface Box {
  /** Center-anchored, true canvas px (or, for text, "rendered px at current scale"). */
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseResizeDragOptions {
  handle: ResizeHandleId;
  /** Reads the element's current committed box at drag start. */
  getBox: () => Box;
  /** Reads the element's current committed rotation (degrees) at drag start —
   * resize deltas are rotated into this local frame before sizing math, then
   * the resulting center-offset is rotated back out, so dragging a corner/edge
   * on a rotated element tracks the cursor instead of drifting/fighting it. */
  getRotation: () => number;
  zoom: number;
  /** Forces uniform (aspect-locked) scaling regardless of Shift — OR'd with the live Shift
   * key each move. Only meaningful for corner handles; edge handles ignore this entirely
   * (see computeResizedBox's isEdge branch) and always resize a single axis. */
  aspectLocked: boolean;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  /** Canvas + grid dimensions for Canva-style "clip to the nearest column/row"
   * edge snapping. Optional — omit to disable snapping entirely (e.g. nothing
   * meaningful to snap to). Only applies at rotations within 0.5° of an exact
   * multiple of 90° — see applyGridSnap's doc comment for why other angles
   * skip it (a diagonal edge can't snap to a horizontal/vertical grid line). */
  snapGrid?: { canvasWidth: number; canvasHeight: number; cols: number; rows: number };
  /** Called continuously while dragging with a live, unclamped-except-by-min/max preview box. */
  onPreview: (box: Box) => void;
  /** Called once on release with the final box. */
  onCommit: (box: Box) => void;
}

const HANDLE_SIGN: Record<ResizeHandleId, { sx: -1 | 0 | 1; sy: -1 | 0 | 1 }> = {
  nw: { sx: -1, sy: -1 },
  ne: { sx: 1, sy: -1 },
  sw: { sx: -1, sy: 1 },
  se: { sx: 1, sy: 1 },
  n: { sx: 0, sy: -1 },
  s: { sx: 0, sy: 1 },
  e: { sx: 1, sy: 0 },
  w: { sx: -1, sy: 0 },
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Resizes `box0` by dragging `handle` a canvas-px `(deltaX, deltaY)`, keeping the
 * opposite corner/edge fixed in canvas space.
 *
 * Corner handles (nw/ne/sw/se): in `uniform` mode the scale factor is derived
 * from the drag's diagonal distance (so it responds naturally to any drag
 * direction) and applied equally to both axes from the original aspect ratio;
 * otherwise width/height change independently.
 *
 * Edge handles (n/s/e/w): ALWAYS single-axis, regardless of `uniform` — Shift
 * and the aspect-lock toggle are deliberately ignored here (standard
 * Illustrator/Figma convention: only corners support uniform scaling). The
 * unconstrained axis is held fixed at its current size.
 */
function computeResizedBox(
  handle: ResizeHandleId,
  box0: Box,
  deltaX: number,
  deltaY: number,
  uniform: boolean,
  minW: number,
  maxW: number,
  minH: number,
  maxH: number,
): Box {
  const { sx, sy } = HANDLE_SIGN[handle];
  const isEdge = sx === 0 || sy === 0;
  const anchorX = box0.x - sx * (box0.w / 2);
  const anchorY = box0.y - sy * (box0.h / 2);

  if (isEdge) {
    let w = box0.w;
    let h = box0.h;
    if (sx !== 0) {
      const newCornerX = box0.x + sx * (box0.w / 2) + deltaX;
      w = clamp(Math.abs(newCornerX - anchorX), minW, maxW);
    } else if (sy !== 0) {
      const newCornerY = box0.y + sy * (box0.h / 2) + deltaY;
      h = clamp(Math.abs(newCornerY - anchorY), minH, maxH);
    }
    return { x: anchorX + sx * (w / 2), y: anchorY + sy * (h / 2), w, h };
  }

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
 * Snaps whichever edge(s) `handle` actually moves to the nearest grid
 * column/row line, Canva-style — so the user doesn't have to be pixel-precise
 * to land exactly on a line.
 *
 * Only applies at rotations within 0.5° of an exact multiple of 90° — at any
 * other angle the box's edges are diagonal in world space and simply don't
 * correspond to a single horizontal/vertical grid line, so snapping is
 * skipped rather than doing something visually wrong. At 90°/270° though, the
 * box's edges ARE still axis-aligned in world space — they're just swapped:
 * what `computeResizedBox` calls "width" now runs along the world *Y* axis,
 * and "height" along world X. `cos`/`sin` here are the exact (-1/0/1) values
 * for whichever of the 4 cardinal rotations this is, derived from the
 * quadrant index rather than `Math.cos/sin` so there's no float drift feeding
 * into the snap math; multiplying them through the same forward-rotation
 * formula `resolve()` uses to place the box (`worldDX/DY` above) gives the
 * *actual* world-space position of the moving edge/corner and the fixed
 * anchor, on whichever world axis this handle's motion actually lands on.
 */
function applyGridSnap(
  handle: ResizeHandleId,
  box0: Box,
  result: Box,
  rotationDeg: number,
  snapGrid: { canvasWidth: number; canvasHeight: number; cols: number; rows: number },
  thresholdPx: number,
  minW: number,
  maxW: number,
  minH: number,
  maxH: number,
  dense: boolean,
): Box {
  const quadrantRaw = Math.round(rotationDeg / 90);
  if (Math.abs(rotationDeg - quadrantRaw * 90) > 0.5) return result;
  const quadrant = ((quadrantRaw % 4) + 4) % 4;
  const cos = [1, 0, -1, 0][quadrant];
  const sin = [0, 1, 0, -1][quadrant];

  const { sx, sy } = HANDLE_SIGN[handle];
  const { x, y, w, h } = result;

  // World position of the fixed anchor (opposite corner/edge, from the box's
  // pre-drag size) and the moving point (this handle's corner/edge, from the
  // freshly-resized w/h) — both via the same local-offset-from-center ->
  // world rotation `resolve()` uses, so these are the box's *actual* rendered
  // positions on screen, not a rotation-naive approximation.
  const anchorWorldX = box0.x - sx * (box0.w / 2) * cos + sy * (box0.h / 2) * sin;
  const anchorWorldY = box0.y - sx * (box0.w / 2) * sin - sy * (box0.h / 2) * cos;
  const movingWorldX = x + sx * (w / 2) * cos - sy * (h / 2) * sin;
  const movingWorldY = y + sx * (w / 2) * sin + sy * (h / 2) * cos;

  let newW = w;
  let newH = h;
  const swapped = quadrant % 2 === 1;

  if (sx !== 0) {
    if (!swapped) {
      const snapped = snapLineToGrid(movingWorldX, snapGrid.canvasWidth, snapGrid.cols, thresholdPx, dense);
      if (snapped !== movingWorldX) newW = clamp(Math.abs(snapped - anchorWorldX), minW, maxW);
    } else {
      const snapped = snapLineToGrid(movingWorldY, snapGrid.canvasHeight, snapGrid.rows, thresholdPx, dense);
      if (snapped !== movingWorldY) newW = clamp(Math.abs(snapped - anchorWorldY), minW, maxW);
    }
  }
  if (sy !== 0) {
    if (!swapped) {
      const snapped = snapLineToGrid(movingWorldY, snapGrid.canvasHeight, snapGrid.rows, thresholdPx, dense);
      if (snapped !== movingWorldY) newH = clamp(Math.abs(snapped - anchorWorldY), minH, maxH);
    } else {
      const snapped = snapLineToGrid(movingWorldX, snapGrid.canvasWidth, snapGrid.cols, thresholdPx, dense);
      if (snapped !== movingWorldX) newH = clamp(Math.abs(snapped - anchorWorldX), minH, maxH);
    }
  }

  if (newW === w && newH === h) return result;

  // Reconstruct the world center from the fixed anchor for the (possibly)
  // snapped w/h, using the same anchor + rotated-half-extent relation as above.
  const newX = anchorWorldX + sx * (newW / 2) * cos - sy * (newH / 2) * sin;
  const newY = anchorWorldY + sx * (newW / 2) * sin + sy * (newH / 2) * cos;
  return { x: newX, y: newY, w: newW, h: newH };
}

/**
 * Anchor-relative corner/edge resize — a sibling to useDrag, not built on it, since the
 * math (opposite-corner-fixed sizing, optional live-Shift uniform scaling, rotation
 * compensation) is fundamentally different from a simple delta-translate move.
 */
export function useResizeDrag({
  handle,
  getBox,
  getRotation,
  zoom,
  aspectLocked,
  minW,
  maxW,
  minH,
  maxH,
  snapGrid,
  onPreview,
  onCommit,
}: UseResizeDragOptions) {
  const dragState = useRef<{ startScreenX: number; startScreenY: number; box0: Box; rotation: number } | null>(null);
  // Same lattice the anchor dots show/hide with — toggling them off also
  // drops resize-edge snapping down to whole-cell (row/column/edge) lines only.
  const dense = useUIStore((s) => s.showAnchors);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      dragState.current = {
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        box0: getBox(),
        rotation: getRotation(),
      };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [getBox, getRotation],
  );

  const resolve = useCallback(
    (e: React.PointerEvent, uniform: boolean) => {
      const state = dragState.current!;
      const deltaX = (e.clientX - state.startScreenX) / zoom;
      const deltaY = (e.clientY - state.startScreenY) / zoom;

      const theta = (state.rotation * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      // World-space delta -> the element's local (unrotated) frame.
      const localDeltaX = deltaX * cos + deltaY * sin;
      const localDeltaY = -deltaX * sin + deltaY * cos;

      // Compute against an origin-centered local box so the result's x/y is
      // purely "how far did the center move, in local units" — verified
      // algebraically to reduce to the original (non-rotated) formula at theta=0.
      const localResult = computeResizedBox(
        handle,
        { x: 0, y: 0, w: state.box0.w, h: state.box0.h },
        localDeltaX,
        localDeltaY,
        uniform,
        minW,
        maxW,
        minH,
        maxH,
      );

      // Local center-offset -> world frame.
      const worldDX = localResult.x * cos - localResult.y * sin;
      const worldDY = localResult.x * sin + localResult.y * cos;

      const result = { x: state.box0.x + worldDX, y: state.box0.y + worldDY, w: localResult.w, h: localResult.h };
      if (!snapGrid) return result;
      const thresholdPx = RESIZE_SNAP_THRESHOLD_SCREEN_PX / zoom;
      return applyGridSnap(handle, state.box0, result, state.rotation, snapGrid, thresholdPx, minW, maxW, minH, maxH, dense);
    },
    [handle, zoom, minW, maxW, minH, maxH, snapGrid, dense],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      // Read shiftKey live (not just at drag-start) so it can be toggled mid-drag.
      // Meaningless for edge handles — see computeResizedBox's isEdge branch.
      const uniform = aspectLocked || e.shiftKey;
      onPreview(resolve(e, uniform));
    },
    [aspectLocked, onPreview, resolve],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      const uniform = aspectLocked || e.shiftKey;
      const box = resolve(e, uniform);
      dragState.current = null;
      onCommit(box);
    },
    [aspectLocked, onCommit, resolve],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
