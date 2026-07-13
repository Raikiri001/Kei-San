import { useCallback, useRef } from "react";

const TAP_THRESHOLD_PX = 4;

interface UseDragOptions {
  /** Reads the element's current committed position (true canvas px) at drag start. */
  getPosition: () => { x: number; y: number };
  zoom: number;
  /** Called continuously while dragging with a live, unsnapped true-canvas-px position. */
  onPreview: (x: number, y: number) => void;
  /** Called once on release if the pointer moved beyond the tap threshold. */
  onCommit: (x: number, y: number) => void;
  /** Called once on release if the pointer barely moved — treat as a click/tap. */
  onTap?: (screenX: number, screenY: number) => void;
  /** Called continuously while actively dragging with the raw pointer screen coords (not canvas-space) — lets a caller keep something anchored to the cursor/element in sync, e.g. an already-open radial menu. */
  onDragMove?: (screenX: number, screenY: number) => void;
}

/**
 * Generic pointer-drag handler that converts screen-px deltas to true-canvas-px
 * (dividing by the current zoom factor) and distinguishes a drag from a tap so the
 * same pointerdown can either reposition an element or open its radial menu.
 */
export function useDrag({ getPosition, zoom, onPreview, onCommit, onTap, onDragMove }: UseDragOptions) {
  const dragState = useRef<{
    startScreenX: number;
    startScreenY: number;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      const { x, y } = getPosition();
      dragState.current = {
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startX: x,
        startY: y,
        dragging: false,
      };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [getPosition],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const state = dragState.current;
      if (!state) return;
      const deltaScreenX = e.clientX - state.startScreenX;
      const deltaScreenY = e.clientY - state.startScreenY;
      if (!state.dragging && Math.hypot(deltaScreenX, deltaScreenY) > TAP_THRESHOLD_PX) {
        state.dragging = true;
      }
      if (state.dragging) {
        onPreview(state.startX + deltaScreenX / zoom, state.startY + deltaScreenY / zoom);
        onDragMove?.(e.clientX, e.clientY);
      }
    },
    [zoom, onPreview, onDragMove],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const state = dragState.current;
      dragState.current = null;
      if (!state) return;
      const deltaScreenX = e.clientX - state.startScreenX;
      const deltaScreenY = e.clientY - state.startScreenY;
      if (state.dragging) {
        onCommit(state.startX + deltaScreenX / zoom, state.startY + deltaScreenY / zoom);
      } else {
        onTap?.(e.clientX, e.clientY);
      }
    },
    [zoom, onCommit, onTap],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
