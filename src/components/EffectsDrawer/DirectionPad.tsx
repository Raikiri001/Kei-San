import { useCallback, useRef } from "react";

interface DirectionPadProps {
  label: string;
  /** Degrees, 0-360. */
  angle: number;
  /** 0-1 — only meaningful (and only rendered as varying handle distance) in
   * "angle-and-magnitude" mode. */
  magnitude?: number;
  mode?: "angle-only" | "angle-and-magnitude";
  onChange: (angle: number, magnitude: number) => void;
}

const PAD_SIZE = 84;
const HANDLE_RADIUS = 7;
const RING_RADIUS = PAD_SIZE / 2 - HANDLE_RADIUS - 4;

/**
 * A draggable square Cartesian pad (center crosshair + dot handle) for angle-based
 * params — angle measured from the pad's center, matching effect.app's own drag-pad
 * convention for direction/angle controls instead of a plain angle slider. Square
 * (not circular) to read as the same visual family as XYPad.tsx's rectangular 2-axis
 * vector pad, just for the simpler "one angle, no asymmetric range" case. In
 * "angle-and-magnitude" mode the handle's distance from center also reports a 0-1
 * magnitude (e.g. a jitter/shake strength) as one combined gesture; in "angle-only"
 * mode (the default) the handle stays on a fixed ring and only angle is reported.
 */
export function DirectionPad({ label, angle, magnitude = 1, mode = "angle-only", onChange }: DirectionPadProps) {
  const padRef = useRef<HTMLDivElement>(null);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = padRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const nextAngle = rawAngle < 0 ? rawAngle + 360 : rawAngle;
      if (mode === "angle-only") {
        onChange(nextAngle, 1);
        return;
      }
      const dist = Math.sqrt(dx * dx + dy * dy);
      onChange(nextAngle, Math.min(1, dist / RING_RADIUS));
    },
    [mode, onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Without this, the pointerdown bubbles up into the Active Stack row's own
      // Reorder.Item drag recognizer, dragging the whole row instead of the handle.
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

  const angleRad = (angle * Math.PI) / 180;
  const effectiveRadius = mode === "angle-only" ? RING_RADIUS : RING_RADIUS * magnitude;
  const handleX = PAD_SIZE / 2 + Math.cos(angleRad) * effectiveRadius;
  const handleY = PAD_SIZE / 2 + Math.sin(angleRad) * effectiveRadius;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative cursor-crosshair rounded border border-[rgb(var(--bar-border)/0.3)] bg-[rgb(var(--bar-fg)/0.05)]"
        style={{ width: PAD_SIZE, height: PAD_SIZE, touchAction: "none" }}
      >
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[rgb(var(--bar-border)/0.25)]" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[rgb(var(--bar-border)/0.25)]" />
        <span
          className="absolute rounded-full bg-[rgb(var(--bar-fg))]"
          style={{ width: HANDLE_RADIUS * 2, height: HANDLE_RADIUS * 2, left: handleX - HANDLE_RADIUS, top: handleY - HANDLE_RADIUS }}
        />
      </div>
      <span className="text-[10px] tabular-nums opacity-60">{Math.round(angle)}°</span>
    </div>
  );
}
