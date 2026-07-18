import { useCallback, useRef } from "react";
import { ROTATION_SNAP_DEGREES } from "@/constants/defaults";

interface UseRotateDragOptions {
  /** On-screen (viewport) center of the element, read once at drag-start.
   * A center point is invariant under rotation-around-itself, so a single
   * measurement at pointerdown is enough — no re-measurement mid-drag needed. */
  getScreenCenter: () => { x: number; y: number };
  getRotation: () => number;
  onPreview: (rotationDeg: number) => void;
  onCommit: (rotationDeg: number) => void;
}

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function angleAt(center: { x: number; y: number }, e: { clientX: number; clientY: number }): number {
  return (Math.atan2(e.clientY - center.y, e.clientX - center.x) * 180) / Math.PI;
}

/**
 * Rotates around the element's own center by tracking the pointer's angle
 * relative to that center. A sibling to useResizeDrag/useDrag, not built on
 * either — angle-from-center math is its own thing.
 *
 * Shift here means "snap the *result* to the nearest ROTATION_SNAP_DEGREES
 * increment" — not free rotation while held — matching Illustrator's
 * constrain-angle behavior. This is a third, independent meaning of the same
 * physical key: see useResizeDrag.ts for corner/edge drags' two other meanings.
 */
export function useRotateDrag({ getScreenCenter, getRotation, onPreview, onCommit }: UseRotateDragOptions) {
  const dragState = useRef<{ center: { x: number; y: number }; startPointerAngle: number; startRotation: number } | null>(
    null,
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const center = getScreenCenter();
      dragState.current = { center, startPointerAngle: angleAt(center, e), startRotation: getRotation() };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [getScreenCenter, getRotation],
  );

  const resolve = useCallback((e: React.PointerEvent) => {
    const state = dragState.current!;
    const pointerAngle = angleAt(state.center, e);
    let rotation = state.startRotation + (pointerAngle - state.startPointerAngle);
    if (e.shiftKey) rotation = Math.round(rotation / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES;
    return normalizeDeg(rotation);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      onPreview(resolve(e));
    },
    [onPreview, resolve],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      const rotation = resolve(e);
      dragState.current = null;
      onCommit(rotation);
    },
    [onCommit, resolve],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
