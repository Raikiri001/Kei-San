import { useCallback, useRef } from "react";
import { EffectPreviewStage } from "@/components/EffectsDrawer/EffectPreviewStage";
import { InfoTooltip } from "@/components/InfoTooltip";
import { MESH_GRID_SIZE } from "@/canvas/gl/effects/elasticGrid";
import type { EffectLayer } from "@/store/types";

const STAGE_W = 280;
const STAGE_H = 210;
const HANDLE_RADIUS = 5;
// Allows a strong warp (handles dragged well outside the unit square) without
// letting the mesh fold over on itself uncontrollably.
const DRAG_MIN = -0.5;
const DRAG_MAX = 1.5;

interface MeshWarpEditorProps {
  label: string;
  loadedImg: HTMLImageElement | null;
  previewLayers: EffectLayer[];
  /** Exactly MESH_GRID_SIZE^2 entries, row-major, normalized fractions of width/height. */
  points: { dx: number; dy: number }[];
  onChange: (points: { dx: number; dy: number }[]) => void;
}

function restPosition(index: number): { x: number; y: number } {
  const row = Math.floor(index / MESH_GRID_SIZE);
  const col = index % MESH_GRID_SIZE;
  return { x: col / (MESH_GRID_SIZE - 1), y: row / (MESH_GRID_SIZE - 1) };
}

/**
 * The real draggable mesh warp (free-form deformation, Sederberg & Parry 1986) — a
 * 5x5 grid of individually draggable control points, each reporting its own
 * displacement from its rest position. See elasticGrid.ts for the bilinear
 * interpolation that turns these 25 points into a smooth per-pixel warp.
 */
export function MeshWarpEditor({ label, loadedImg, previewLayers, points, onChange }: MeshWarpEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);

  const displayPositions = points.map((p, i) => {
    const rest = restPosition(i);
    return { x: (rest.x + p.dx) * STAGE_W, y: (rest.y + p.dy) * STAGE_H };
  });

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const index = dragIndex.current;
      if (index === null) return;
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fracX = Math.min(DRAG_MAX, Math.max(DRAG_MIN, (clientX - rect.left) / rect.width));
      const fracY = Math.min(DRAG_MAX, Math.max(DRAG_MIN, (clientY - rect.top) / rect.height));
      const rest = restPosition(index);
      onChange(points.map((p, i) => (i === index ? { dx: fracX - rest.x, dy: fracY - rest.y } : p)));
    },
    [points, onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGCircleElement>, index: number) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragIndex.current = index;
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer],
  );
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGCircleElement>) => updateFromPointer(e.clientX, e.clientY), [updateFromPointer]);
  const handlePointerUp = useCallback(() => {
    dragIndex.current = null;
  }, []);
  const handleReset = useCallback(() => {
    onChange(points.map(() => ({ dx: 0, dy: 0 })));
  }, [points, onChange]);

  const rowLines: string[] = [];
  const colLines: string[] = [];
  for (let row = 0; row < MESH_GRID_SIZE; row++) {
    rowLines.push(
      Array.from({ length: MESH_GRID_SIZE }, (_, col) => displayPositions[row * MESH_GRID_SIZE + col])
        .map((p) => `${p.x},${p.y}`)
        .join(" "),
    );
  }
  for (let col = 0; col < MESH_GRID_SIZE; col++) {
    colLines.push(
      Array.from({ length: MESH_GRID_SIZE }, (_, row) => displayPositions[row * MESH_GRID_SIZE + col])
        .map((p) => `${p.x},${p.y}`)
        .join(" "),
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
          <InfoTooltip text="Drag any grid point to warp the image around it." label={`About ${label}`} />
        </div>
        <button type="button" onClick={handleReset} className="press-scale rounded border border-[rgb(var(--chrome-border)/0.3)] px-2 py-0.5 text-[10px] uppercase tracking-wide opacity-70 hover:opacity-100">
          Reset
        </button>
      </div>
      <div ref={stageRef}>
        <EffectPreviewStage loadedImg={loadedImg} layers={previewLayers} width={STAGE_W} height={STAGE_H}>
          {rowLines.map((pts, i) => (
            <polyline key={`row${i}`} points={pts} fill="none" stroke="rgb(var(--color-accent-glow) / 0.5)" strokeWidth={1} className="pointer-events-none" />
          ))}
          {colLines.map((pts, i) => (
            <polyline key={`col${i}`} points={pts} fill="none" stroke="rgb(var(--color-accent-glow) / 0.5)" strokeWidth={1} className="pointer-events-none" />
          ))}
          {displayPositions.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={HANDLE_RADIUS}
              fill="rgb(var(--color-accent-glow))"
              stroke="black"
              strokeWidth={1}
              className="cursor-move"
              onPointerDown={(e) => handlePointerDown(e, i)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          ))}
        </EffectPreviewStage>
      </div>
    </div>
  );
}
