import { useCallback, useRef } from "react";

interface XYPadProps {
  label: string;
  x: number;
  y: number;
  xRange: [number, number];
  yRange: [number, number];
  onChange: (x: number, y: number) => void;
}

const MAX_DIMENSION = 180;
const MIN_DIMENSION = 60;
const HANDLE_RADIUS = 6;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * A literal 2-axis vector pad — unlike DirectionPad (angle+magnitude derived via
 * atan2 from a square dial), this reports the two axes' raw values directly, each
 * with its own independent range, and draws itself as a rectangle proportioned to
 * match those ranges (matching effect.app's own Motion-Trails-style "direction"
 * control: -4..4 horizontal, -1..1 vertical, a wide rectangle — not a circle).
 */
export function XYPad({ label, x, y, xRange, yRange, onChange }: XYPadProps) {
  const padRef = useRef<HTMLDivElement>(null);

  const xSpan = xRange[1] - xRange[0];
  const ySpan = yRange[1] - yRange[0];
  const aspect = xSpan / ySpan;
  const width = aspect >= 1 ? MAX_DIMENSION : Math.max(MIN_DIMENSION, MAX_DIMENSION * aspect);
  const height = aspect >= 1 ? Math.max(MIN_DIMENSION, MAX_DIMENSION / aspect) : MAX_DIMENSION;

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = padRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fracX = clamp((clientX - rect.left) / rect.width, 0, 1);
      // Screen fracY is 0 at the pad's top / 1 at its bottom, but Y here follows
      // Cartesian "up is positive" convention (matching how the underlying effect
      // interprets +Y as "up") — so the top of the pad maps to yRange's max, not
      // its min.
      const fracY = clamp((clientY - rect.top) / rect.height, 0, 1);
      const nextX = xRange[0] + fracX * xSpan;
      const nextY = yRange[1] - fracY * ySpan;
      onChange(nextX, nextY);
    },
    [xRange, yRange, xSpan, ySpan, onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // See DirectionPad's own note: without this, dragging here also drags the
      // Active Stack row underneath via Reorder.Item's drag recognizer.
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons !== 1) return;
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer],
  );

  const fracX = (clamp(x, xRange[0], xRange[1]) - xRange[0]) / xSpan;
  // Inverse of updateFromPointer's flip: higher Y (up) renders nearer the pad's top.
  const fracY = (yRange[1] - clamp(y, yRange[0], yRange[1])) / ySpan;
  const handleX = fracX * width;
  const handleY = fracY * height;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative cursor-crosshair rounded border border-[rgb(var(--chrome-border)/0.3)] bg-white/5"
        style={{ width, height, touchAction: "none" }}
      >
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[rgb(var(--chrome-border)/0.25)]" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[rgb(var(--chrome-border)/0.25)]" />
        <span
          className="absolute rounded-full bg-accent"
          style={{ width: HANDLE_RADIUS * 2, height: HANDLE_RADIUS * 2, left: handleX - HANDLE_RADIUS, top: handleY - HANDLE_RADIUS }}
        />
      </div>
      <span className="text-[10px] tabular-nums opacity-60">
        {x.toFixed(1)} {y.toFixed(1)}
      </span>
    </div>
  );
}
