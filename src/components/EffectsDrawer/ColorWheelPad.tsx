import { useCallback, useRef } from "react";

interface ColorWheelPadProps {
  label: string;
  /** Degrees, 0-360. */
  hue: number;
  /** 0-100. */
  saturation: number;
  onChange: (hue: number, saturation: number) => void;
}

const PAD_SIZE = 96;
const HANDLE_RADIUS = 7;
const RING_RADIUS = PAD_SIZE / 2 - HANDLE_RADIUS - 4;

// `from 90deg` aligns the wheel's own displayed hue with the atan2-based angle math
// below (atan2's 0deg = east/right, increasing clockwise since screen +Y is down;
// CSS conic-gradient's 0deg = north, also clockwise — the 90deg offset reconciles
// the two so dragging to a given angle shows the same hue the wheel paints there).
const HUE_WHEEL_BACKGROUND =
  "conic-gradient(from 90deg, hsl(0,100%,50%) 0%, hsl(60,100%,50%) 16.66%, hsl(120,100%,50%) 33.33%, hsl(180,100%,50%) 50%, hsl(240,100%,50%) 66.66%, hsl(300,100%,50%) 83.33%, hsl(360,100%,50%) 100%)";
const SATURATION_OVERLAY_BACKGROUND = "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * A circular hue(angle)/saturation(radius) drag pad — Color Grading's per-zone color
 * pick, the modern hue-wheel input model (Lightroom Classic's Color Grading panel,
 * DaVinci Resolve's color wheels) as opposed to Color Balance's linear CMY-axis
 * sliders. Same drag mechanics as DirectionPad's angle-and-magnitude mode (pointer
 * capture, `stopPropagation` from the start so the gesture doesn't leak into the
 * Active Stack row's own drag recognizer), but rendered over a real hue-wheel
 * background since this represents an actual color, not an abstract direction.
 */
export function ColorWheelPad({ label, hue, saturation, onChange }: ColorWheelPadProps) {
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
      const nextHue = rawAngle < 0 ? rawAngle + 360 : rawAngle;
      const dist = Math.sqrt(dx * dx + dy * dy);
      onChange(nextHue, clamp(dist / RING_RADIUS, 0, 1) * 100);
    },
    [onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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

  const angleRad = (hue * Math.PI) / 180;
  const effectiveRadius = RING_RADIUS * clamp(saturation / 100, 0, 1);
  const handleX = PAD_SIZE / 2 + Math.cos(angleRad) * effectiveRadius;
  const handleY = PAD_SIZE / 2 + Math.sin(angleRad) * effectiveRadius;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative cursor-crosshair rounded-full border border-[rgb(var(--chrome-border)/0.3)]"
        style={{ width: PAD_SIZE, height: PAD_SIZE, touchAction: "none", background: HUE_WHEEL_BACKGROUND }}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full" style={{ background: SATURATION_OVERLAY_BACKGROUND }} />
        <span
          className="pointer-events-none absolute rounded-full border border-black/40 bg-white shadow"
          style={{ width: HANDLE_RADIUS * 2, height: HANDLE_RADIUS * 2, left: handleX - HANDLE_RADIUS, top: handleY - HANDLE_RADIUS }}
        />
      </div>
      <span className="text-[10px] tabular-nums opacity-60">
        {Math.round(hue)}° {Math.round(saturation)}%
      </span>
    </div>
  );
}
