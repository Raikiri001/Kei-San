import { useCallback, useId, useRef } from "react";
import { EffectPreviewStage } from "@/components/EffectsDrawer/EffectPreviewStage";
import { InfoTooltip } from "@/components/InfoTooltip";
import type { EffectLayer } from "@/store/types";

const STAGE_W = 280;
const STAGE_H = 210;
const HANDLE_RADIUS = 6;
const ROTATION_HANDLE_OFFSET_PX = 18;
/** Placing the rotation handle at a diagonal offset from the ellipse's own 0deg/90deg
 * axes keeps it visually distinct from the radiusX/radiusY handles instead of
 * overlapping whichever one happens to be longer. */
const ROTATION_HANDLE_ANGLE_OFFSET = 45;

type DragTarget = "center" | "radiusX" | "radiusY" | "rotation" | null;

interface CircleRegionEditorProps {
  label: string;
  loadedImg: HTMLImageElement | null;
  /** In the same shape `EffectPreviewStage` takes — an empty array previews the
   * plain image (Mask's own editor, which visualizes where a mask applies rather
   * than re-rendering whatever effect it happens to be attached to). */
  previewLayers: EffectLayer[];
  centerX: number;
  centerY: number;
  /** Both in "fraction of min(image width, image height)" units — the same
   * convention `LayerMask.radius` already uses, so no unit conversion is needed at
   * that integration point. Pass equal values for a plain circle. */
  radiusX: number;
  radiusY: number;
  /** Degrees. Omit (or leave at 0 with `showRotation: false`) for shapes with no
   * rotation concept (a plain circle looks the same rotated or not). */
  rotation?: number;
  showRotation?: boolean;
  /** Dims everything outside the ellipse via a plain SVG mask cutout — Mask's own
   * editor uses this to visualize its region without needing to force the GL
   * render pipeline's own mask-debug tint through a synthetic preview layer. */
  dimOutside?: boolean;
  onChange: (patch: { centerX?: number; centerY?: number; radiusX?: number; radiusY?: number; rotation?: number }) => void;
}

/**
 * A live-preview ellipse editor — center-drag, independent radiusX/radiusY drag
 * handles (along the shape's own, possibly-rotated, local axes), and an optional
 * rotation handle. Shared by Mask (its center/radius/aspectStretch/rotation sliders),
 * Depth of Field's Iris shape, and Swirl/Pinch/Ripple's center+radius — each caller
 * adapts its own stored param shape to/from this component's plain radiusX/radiusY.
 */
export function CircleRegionEditor({
  label,
  loadedImg,
  previewLayers,
  centerX,
  centerY,
  radiusX,
  radiusY,
  rotation = 0,
  showRotation = true,
  dimOutside = false,
  onChange,
}: CircleRegionEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragTarget = useRef<DragTarget>(null);
  const maskId = useId();

  const minDim = Math.min(STAGE_W, STAGE_H);
  const centerPx = { x: centerX * STAGE_W, y: centerY * STAGE_H };
  const rotRad = (rotation * Math.PI) / 180;
  const axisX = { x: Math.cos(rotRad), y: Math.sin(rotRad) };
  const axisY = { x: Math.cos(rotRad + Math.PI / 2), y: Math.sin(rotRad + Math.PI / 2) };
  const radiusXPx = radiusX * minDim;
  const radiusYPx = radiusY * minDim;
  const radiusXHandle = { x: centerPx.x + axisX.x * radiusXPx, y: centerPx.y + axisX.y * radiusXPx };
  const radiusYHandle = { x: centerPx.x + axisY.x * radiusYPx, y: centerPx.y + axisY.y * radiusYPx };
  const rotationAngleRad = rotRad + (ROTATION_HANDLE_ANGLE_OFFSET * Math.PI) / 180;
  const rotationHandleDist = Math.max(radiusXPx, radiusYPx) + ROTATION_HANDLE_OFFSET_PX;
  const rotationHandle = {
    x: centerPx.x + Math.cos(rotationAngleRad) * rotationHandleDist,
    y: centerPx.y + Math.sin(rotationAngleRad) * rotationHandleDist,
  };

  const getLocalOffset = useCallback((clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = ((clientX - rect.left) / rect.width) * STAGE_W;
    const py = ((clientY - rect.top) / rect.height) * STAGE_H;
    return { dx: px - centerPx.x, dy: py - centerPx.y };
  }, [centerPx.x, centerPx.y]);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const target = dragTarget.current;
      if (!target) return;
      if (target === "center") {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect) return;
        const fracX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const fracY = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
        onChange({ centerX: fracX, centerY: fracY });
        return;
      }
      const offset = getLocalOffset(clientX, clientY);
      if (!offset) return;
      if (target === "rotation") {
        const angleDeg = (Math.atan2(offset.dy, offset.dx) * 180) / Math.PI - ROTATION_HANDLE_ANGLE_OFFSET;
        onChange({ rotation: ((angleDeg % 360) + 360) % 360 });
        return;
      }
      if (target === "radiusX") {
        const proj = offset.dx * axisX.x + offset.dy * axisX.y;
        onChange({ radiusX: Math.max(0.01, proj / minDim) });
        return;
      }
      const proj = offset.dx * axisY.x + offset.dy * axisY.y;
      onChange({ radiusY: Math.max(0.01, proj / minDim) });
    },
    [getLocalOffset, axisX.x, axisX.y, axisY.x, axisY.y, minDim, onChange],
  );

  const startDrag = useCallback(
    (target: DragTarget) => (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragTarget.current = target;
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGCircleElement>) => updateFromPointer(e.clientX, e.clientY), [updateFromPointer]);
  const handlePointerUp = useCallback(() => {
    dragTarget.current = null;
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
        <InfoTooltip
          text={`Drag the center to move, the white handles to resize${showRotation ? ", the green handle to rotate" : ""}.`}
          label={`About ${label}`}
        />
      </div>
      <div ref={stageRef}>
        <EffectPreviewStage loadedImg={loadedImg} layers={previewLayers} width={STAGE_W} height={STAGE_H}>
          {dimOutside && (
            <>
              <mask id={maskId}>
                <rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill="white" />
                <ellipse cx={centerPx.x} cy={centerPx.y} rx={radiusXPx} ry={radiusYPx} transform={`rotate(${rotation} ${centerPx.x} ${centerPx.y})`} fill="black" />
              </mask>
              <rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill="black" opacity={0.55} mask={`url(#${maskId})`} className="pointer-events-none" />
            </>
          )}
          <ellipse
            cx={centerPx.x}
            cy={centerPx.y}
            rx={radiusXPx}
            ry={radiusYPx}
            transform={`rotate(${rotation} ${centerPx.x} ${centerPx.y})`}
            fill="none"
            stroke="rgb(var(--color-accent-glow))"
            strokeWidth={1.5}
            className="pointer-events-none"
          />
          <line x1={centerPx.x} y1={centerPx.y} x2={radiusXHandle.x} y2={radiusXHandle.y} stroke="rgb(var(--color-accent-glow) / 0.5)" strokeWidth={1} />
          <line x1={centerPx.x} y1={centerPx.y} x2={radiusYHandle.x} y2={radiusYHandle.y} stroke="rgb(var(--color-accent-glow) / 0.5)" strokeWidth={1} />
          <circle
            cx={centerPx.x}
            cy={centerPx.y}
            r={HANDLE_RADIUS}
            fill="rgb(var(--color-accent-glow))"
            stroke="black"
            strokeWidth={1}
            className="cursor-move"
            onPointerDown={startDrag("center")}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          <circle
            cx={radiusXHandle.x}
            cy={radiusXHandle.y}
            r={HANDLE_RADIUS * 0.8}
            fill="white"
            stroke="black"
            strokeWidth={1}
            className="cursor-ew-resize"
            onPointerDown={startDrag("radiusX")}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          <circle
            cx={radiusYHandle.x}
            cy={radiusYHandle.y}
            r={HANDLE_RADIUS * 0.8}
            fill="white"
            stroke="black"
            strokeWidth={1}
            className="cursor-ns-resize"
            onPointerDown={startDrag("radiusY")}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          {showRotation && (
            <circle
              cx={rotationHandle.x}
              cy={rotationHandle.y}
              r={HANDLE_RADIUS * 0.7}
              fill="rgb(var(--status-active-rgb))"
              stroke="black"
              strokeWidth={1}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={startDrag("rotation")}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          )}
        </EffectPreviewStage>
      </div>
    </div>
  );
}
