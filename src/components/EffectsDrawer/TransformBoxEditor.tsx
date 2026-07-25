import { useCallback, useRef } from "react";
import { EffectPreviewStage } from "@/components/EffectsDrawer/EffectPreviewStage";
import { InfoTooltip } from "@/components/InfoTooltip";
import type { EffectLayer } from "@/store/types";

const STAGE_W = 280;
const STAGE_H = 210;
const HANDLE_RADIUS = 6;
// Fraction of the way from center to the NE corner — strictly inside the box (unlike
// a handle protruding beyond an edge) so it stays reachable at the very common
// scale-1 identity case, where the box already fills the whole stage and anything
// drawn outside it would be clipped by EffectPreviewStage's own overflow-hidden.
const ROTATE_HANDLE_INSET = 0.7;
const ROTATION_SNAP_DEGREES = 15;
const SCALE_MIN = 0.1;
const SCALE_MAX = 3;
const TRANSLATE_MIN = -0.5;
const TRANSLATE_MAX = 1.5;

type Sign = -1 | 0 | 1;
interface HandleDef {
  id: string;
  signX: Sign;
  signY: Sign;
  cursor: string;
}
const HANDLES: HandleDef[] = [
  { id: "nw", signX: -1, signY: -1, cursor: "nwse-resize" },
  { id: "n", signX: 0, signY: -1, cursor: "ns-resize" },
  { id: "ne", signX: 1, signY: -1, cursor: "nesw-resize" },
  { id: "e", signX: 1, signY: 0, cursor: "ew-resize" },
  { id: "se", signX: 1, signY: 1, cursor: "nwse-resize" },
  { id: "s", signX: 0, signY: 1, cursor: "ns-resize" },
  { id: "sw", signX: -1, signY: 1, cursor: "nesw-resize" },
  { id: "w", signX: -1, signY: 0, cursor: "ew-resize" },
];

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

type DragMode = "scale" | "rotate" | "translate";
interface DragState {
  mode: DragMode;
  signX: Sign;
  signY: Sign;
  startCenter: { x: number; y: number };
  startHalfW: number;
  startHalfH: number;
  startRotation: number;
  startPointerStage: { x: number; y: number };
  startPointerAngleDeg: number;
}

interface TransformBoxEditorProps {
  label: string;
  loadedImg: HTMLImageElement | null;
  previewLayers: EffectLayer[];
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  onChange: (patch: { translateX?: number; translateY?: number; scaleX?: number; scaleY?: number; rotation?: number }) => void;
}

/**
 * The Transform effect's box editor — mirrors this app's own element resize/rotate
 * interaction (useResizeDrag.ts/useRotateDrag.ts): corner drag = uniform scale via
 * diagonal-ratio, edge drag = single-axis scale, both keeping the OPPOSITE corner
 * fixed (so the box resizes the way Free Transform actually does, which means scale
 * and translate both update together from a corner/edge drag); a rotate handle with
 * the same atan2-delta-from-start + 15°-Shift-snap drag; dragging the box body
 * translates it directly (a rotated object's world-space translation needs no
 * rotation compensation, unlike scale).
 */
export function TransformBoxEditor({ label, loadedImg, previewLayers, translateX, translateY, scaleX, scaleY, rotation, onChange }: TransformBoxEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);

  const centerPx = { x: STAGE_W / 2 + translateX * STAGE_W, y: STAGE_H / 2 + translateY * STAGE_H };
  const halfW = (STAGE_W / 2) * scaleX;
  const halfH = (STAGE_H / 2) * scaleY;
  const minHalfW = (STAGE_W / 2) * SCALE_MIN;
  const maxHalfW = (STAGE_W / 2) * SCALE_MAX;
  const minHalfH = (STAGE_H / 2) * SCALE_MIN;
  const maxHalfH = (STAGE_H / 2) * SCALE_MAX;

  const stagePointFromClient = useCallback((clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: ((clientX - rect.left) / rect.width) * STAGE_W, y: ((clientY - rect.top) / rect.height) * STAGE_H };
  }, []);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number, shiftKey: boolean) => {
      const state = dragState.current;
      const stagePoint = stagePointFromClient(clientX, clientY);
      if (!state || !stagePoint) return;

      if (state.mode === "translate") {
        const newCenterX = state.startCenter.x + (stagePoint.x - state.startPointerStage.x);
        const newCenterY = state.startCenter.y + (stagePoint.y - state.startPointerStage.y);
        onChange({
          translateX: clamp((newCenterX - STAGE_W / 2) / STAGE_W, TRANSLATE_MIN, TRANSLATE_MAX),
          translateY: clamp((newCenterY - STAGE_H / 2) / STAGE_H, TRANSLATE_MIN, TRANSLATE_MAX),
        });
        return;
      }

      if (state.mode === "rotate") {
        const angleDeg = (Math.atan2(stagePoint.y - state.startCenter.y, stagePoint.x - state.startCenter.x) * 180) / Math.PI;
        let nextRotation = state.startRotation + (angleDeg - state.startPointerAngleDeg);
        if (shiftKey) nextRotation = Math.round(nextRotation / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES;
        onChange({ rotation: ((nextRotation % 360) + 360) % 360 });
        return;
      }

      // Scale: rotate the raw world-space drag delta into the box's own local
      // (unrotated) frame before applying it, exactly the compensation
      // useResizeDrag.ts already does for canvas elements.
      const worldDeltaX = stagePoint.x - state.startPointerStage.x;
      const worldDeltaY = stagePoint.y - state.startPointerStage.y;
      const rotRad = (-state.startRotation * Math.PI) / 180;
      const cosR = Math.cos(rotRad);
      const sinR = Math.sin(rotRad);
      const localDeltaX = worldDeltaX * cosR - worldDeltaY * sinR;
      const localDeltaY = worldDeltaX * sinR + worldDeltaY * cosR;

      let newHalfW = state.startHalfW;
      let newHalfH = state.startHalfH;
      const isCorner = state.signX !== 0 && state.signY !== 0;
      if (isCorner) {
        const oldDiagX = 2 * state.signX * state.startHalfW;
        const oldDiagY = 2 * state.signY * state.startHalfH;
        const oldDiagLen = Math.hypot(oldDiagX, oldDiagY) || 1;
        const newDiagLen = Math.hypot(oldDiagX + localDeltaX, oldDiagY + localDeltaY);
        const ratio = newDiagLen / oldDiagLen;
        newHalfW = clamp(state.startHalfW * ratio, minHalfW, maxHalfW);
        newHalfH = clamp(state.startHalfH * ratio, minHalfH, maxHalfH);
      } else {
        if (state.signX !== 0) newHalfW = clamp(state.startHalfW + state.signX * localDeltaX, minHalfW, maxHalfW);
        if (state.signY !== 0) newHalfH = clamp(state.startHalfH + state.signY * localDeltaY, minHalfH, maxHalfH);
      }

      // Keeping the OPPOSITE corner fixed means the center shifts by half of
      // whatever the dragged axis/axes grew or shrank by.
      const newCenterX = state.startCenter.x + state.signX * (newHalfW - state.startHalfW);
      const newCenterY = state.startCenter.y + state.signY * (newHalfH - state.startHalfH);

      onChange({
        scaleX: clamp((2 * newHalfW) / STAGE_W, SCALE_MIN, SCALE_MAX),
        scaleY: clamp((2 * newHalfH) / STAGE_H, SCALE_MIN, SCALE_MAX),
        translateX: clamp((newCenterX - STAGE_W / 2) / STAGE_W, TRANSLATE_MIN, TRANSLATE_MAX),
        translateY: clamp((newCenterY - STAGE_H / 2) / STAGE_H, TRANSLATE_MIN, TRANSLATE_MAX),
      });
    },
    [stagePointFromClient, onChange, minHalfW, maxHalfW, minHalfH, maxHalfH],
  );

  const startDrag = useCallback(
    (mode: DragMode, signX: Sign, signY: Sign) => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const stagePoint = stagePointFromClient(e.clientX, e.clientY);
      if (!stagePoint) return;
      const startPointerAngleDeg = mode === "rotate" ? (Math.atan2(stagePoint.y - centerPx.y, stagePoint.x - centerPx.x) * 180) / Math.PI : 0;
      dragState.current = {
        mode,
        signX,
        signY,
        startCenter: { x: centerPx.x, y: centerPx.y },
        startHalfW: halfW,
        startHalfH: halfH,
        startRotation: rotation,
        startPointerStage: stagePoint,
        startPointerAngleDeg,
      };
    },
    [stagePointFromClient, centerPx.x, centerPx.y, halfW, halfH, rotation],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => updateFromPointer(e.clientX, e.clientY, e.shiftKey), [updateFromPointer]);
  const handlePointerUp = useCallback(() => {
    dragState.current = null;
  }, []);
  const handleReset = useCallback(() => {
    onChange({ translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0 });
  }, [onChange]);

  const rotateHandlePos = { x: centerPx.x + halfW * ROTATE_HANDLE_INSET, y: centerPx.y - halfH * ROTATE_HANDLE_INSET };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
          <InfoTooltip text="Drag a corner/edge to scale, the green handle to rotate (Shift snaps 15°), the box body to move." label={`About ${label}`} />
        </div>
        <button type="button" onClick={handleReset} className="press-scale rounded border border-[rgb(var(--chrome-border)/0.3)] px-2 py-0.5 text-[10.5px] font-medium opacity-70 hover:opacity-100">
          Reset
        </button>
      </div>
      <div ref={stageRef}>
        <EffectPreviewStage loadedImg={loadedImg} layers={previewLayers} width={STAGE_W} height={STAGE_H}>
          <g transform={`rotate(${rotation} ${centerPx.x} ${centerPx.y})`}>
            <line x1={centerPx.x} y1={centerPx.y} x2={rotateHandlePos.x} y2={rotateHandlePos.y} stroke="rgb(var(--status-active-rgb) / 0.6)" strokeWidth={1} className="pointer-events-none" />
            <rect
              x={centerPx.x - halfW}
              y={centerPx.y - halfH}
              width={halfW * 2}
              height={halfH * 2}
              fill="transparent"
              stroke="rgb(var(--color-accent-glow))"
              strokeWidth={1.5}
              className="cursor-move"
              onPointerDown={startDrag("translate", 0, 0)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
            {HANDLES.map((h) => {
              const hx = centerPx.x + h.signX * halfW;
              const hy = centerPx.y + h.signY * halfH;
              return (
                <circle
                  key={h.id}
                  cx={hx}
                  cy={hy}
                  r={HANDLE_RADIUS * 0.8}
                  fill="white"
                  stroke="black"
                  strokeWidth={1}
                  style={{ cursor: h.cursor }}
                  onPointerDown={startDrag("scale", h.signX, h.signY)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
              );
            })}
            <circle
              cx={rotateHandlePos.x}
              cy={rotateHandlePos.y}
              r={HANDLE_RADIUS * 0.7}
              fill="rgb(var(--status-active-rgb))"
              stroke="black"
              strokeWidth={1}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={startDrag("rotate", 0, 0)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          </g>
        </EffectPreviewStage>
      </div>
    </div>
  );
}
