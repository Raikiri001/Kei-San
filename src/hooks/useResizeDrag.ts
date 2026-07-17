import { useCallback, useRef } from "react";

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
  onPreview,
  onCommit,
}: UseResizeDragOptions) {
  const dragState = useRef<{ startScreenX: number; startScreenY: number; box0: Box; rotation: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
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

      return { x: state.box0.x + worldDX, y: state.box0.y + worldDY, w: localResult.w, h: localResult.h };
    },
    [handle, zoom, minW, maxW, minH, maxH],
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
