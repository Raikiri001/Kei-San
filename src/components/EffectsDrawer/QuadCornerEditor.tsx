import { useCallback, useRef } from "react";
import { EffectPreviewStage } from "@/components/EffectsDrawer/EffectPreviewStage";
import type { EffectLayer } from "@/store/types";

const STAGE_W = 280;
const STAGE_H = 210;
const HANDLE_RADIUS = 7;
// Allows a strong perspective drag (corners well outside the unit square) without
// letting the quad fold over on itself into a degenerate/inverted shape.
const CORNER_MIN = -0.5;
const CORNER_MAX = 1.5;

interface QuadCornerEditorProps {
  label: string;
  loadedImg: HTMLImageElement | null;
  previewLayers: EffectLayer[];
  /** Exactly 4 entries, normalized 0-1 (before dragging), order TL/TR/BR/BL. */
  corners: { x: number; y: number }[];
  onChange: (corners: { x: number; y: number }[]) => void;
}

/**
 * 4 independently draggable corners — Perspective's real Photoshop-style Free
 * Transform corner-pin, not an abstract slider pair. The stored data model *is*
 * these 4 points (see perspective.ts's Heckbert homography solve), so dragging here
 * writes directly to the effect's own params with no intermediate conversion.
 */
export function QuadCornerEditor({ label, loadedImg, previewLayers, corners, onChange }: QuadCornerEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);

  const toStagePx = (p: { x: number; y: number }) => ({ x: p.x * STAGE_W, y: p.y * STAGE_H });
  const points = corners.map(toStagePx);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const index = dragIndex.current;
      if (index === null) return;
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fracX = Math.min(CORNER_MAX, Math.max(CORNER_MIN, (clientX - rect.left) / rect.width));
      const fracY = Math.min(CORNER_MAX, Math.max(CORNER_MIN, (clientY - rect.top) / rect.height));
      onChange(corners.map((c, i) => (i === index ? { x: fracX, y: fracY } : c)));
    },
    [corners, onChange],
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

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
      <div ref={stageRef}>
        <EffectPreviewStage loadedImg={loadedImg} layers={previewLayers} width={STAGE_W} height={STAGE_H}>
          <polygon points={polygonPoints} fill="none" stroke="rgb(var(--color-accent-glow))" strokeWidth={1.5} className="pointer-events-none" />
          {points.map((p, i) => (
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
      <p className="text-[10px] opacity-40">Drag a corner to reshape the perspective.</p>
    </div>
  );
}
