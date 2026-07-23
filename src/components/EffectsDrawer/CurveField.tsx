import { useCallback, useRef, useState } from "react";
import { curveToLUT, type CurvePoint } from "@/components/EffectsDrawer/curveMath";
import { InfoTooltip } from "@/components/InfoTooltip";

const PAD = 180;
const POINT_RADIUS = 5;
const MIN_X_GAP = 0.02;

function toSvg(p: CurvePoint): { x: number; y: number } {
  return { x: p.x * PAD, y: (1 - p.y) * PAD };
}

function fromSvg(x: number, y: number): CurvePoint {
  return { x: Math.min(1, Math.max(0, x / PAD)), y: Math.min(1, Math.max(0, 1 - y / PAD)) };
}

/**
 * A real draggable point-curve editor — matches effect.app's own Curves/Hue Curves UI
 * rather than approximating with sliders. Endpoints (x=0 and x=1) can be dragged
 * vertically but never removed or reordered past their neighbors; clicking empty
 * curve-area space adds a new point; double-clicking a non-endpoint point removes it.
 * The smooth curve drawn is the same monotone-cubic LUT (see curveMath.ts) that gets
 * uploaded to the shader, so what's shown here is exactly what the effect applies.
 */
interface CurveFieldProps {
  label: string;
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
  /** Line/point color — defaults to the app's neutral accent, but a per-channel
   * CurveField (Red/Green/Blue tabs) passes that channel's own color so the curve
   * itself reads as "this is the red channel" at a glance, not just its label. */
  color?: string;
}

export function CurveField({ label, points, onChange, color = "rgb(var(--color-accent-glow))" }: CurveFieldProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const sorted = [...points].sort((a, b) => a.x - b.x);

  const clientToLocal = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return fromSvg(((clientX - rect.left) / rect.width) * PAD, ((clientY - rect.top) / rect.height) * PAD);
  }, []);

  const handlePointDown = useCallback((e: React.PointerEvent<SVGCircleElement>, index: number) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragIndex(index);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGCircleElement>) => {
      if (dragIndex === null) return;
      const local = clientToLocal(e.clientX, e.clientY);
      if (!local) return;
      const isEndpoint = dragIndex === 0 || dragIndex === sorted.length - 1;
      const prevX = dragIndex > 0 ? sorted[dragIndex - 1].x + MIN_X_GAP : 0;
      const nextX = dragIndex < sorted.length - 1 ? sorted[dragIndex + 1].x - MIN_X_GAP : 1;
      const nextPoint: CurvePoint = {
        x: isEndpoint ? sorted[dragIndex].x : Math.min(nextX, Math.max(prevX, local.x)),
        y: local.y,
      };
      const next = sorted.map((p, i) => (i === dragIndex ? nextPoint : p));
      onChange(next);
    },
    [dragIndex, sorted, clientToLocal, onChange],
  );

  const handlePointerUp = useCallback(() => setDragIndex(null), []);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const local = clientToLocal(e.clientX, e.clientY);
      if (!local) return;
      if (sorted.some((p) => Math.abs(p.x - local.x) < MIN_X_GAP * 1.5)) return;
      onChange([...sorted, local]);
    },
    [sorted, clientToLocal, onChange],
  );

  const handlePointDoubleClick = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, index: number) => {
      e.stopPropagation();
      if (index === 0 || index === sorted.length - 1) return;
      onChange(sorted.filter((_, i) => i !== index));
    },
    [sorted, onChange],
  );

  const lut = curveToLUT(sorted, 64);
  const pathD = lut.map((y, i) => `${i === 0 ? "M" : "L"} ${(i / (lut.length - 1)) * PAD} ${(1 - y) * PAD}`).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
        <InfoTooltip text="Click to add a point, drag to shape, double-click to remove." label={`About ${label}`} />
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${PAD} ${PAD}`}
        onClick={handleBackgroundClick}
        onPointerDown={(e) => e.stopPropagation()}
        className="cursor-crosshair rounded border border-[rgb(var(--chrome-border)/0.3)] bg-white/5"
        style={{ width: "100%", aspectRatio: "1 / 1", touchAction: "none" }}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={`v${f}`} x1={f * PAD} y1={0} x2={f * PAD} y2={PAD} stroke="rgb(var(--chrome-border) / 0.15)" strokeWidth={1} />
        ))}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={`h${f}`} x1={0} y1={f * PAD} x2={PAD} y2={f * PAD} stroke="rgb(var(--chrome-border) / 0.15)" strokeWidth={1} />
        ))}
        <line x1={0} y1={PAD} x2={PAD} y2={0} stroke="rgb(var(--chrome-border) / 0.2)" strokeWidth={1} strokeDasharray="3 3" />
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
        {sorted.map((p, i) => {
          const svgP = toSvg(p);
          return (
            <circle
              key={i}
              cx={svgP.x}
              cy={svgP.y}
              r={POINT_RADIUS}
              fill={color}
              className="cursor-grab stroke-black active:cursor-grabbing"
              strokeWidth={1}
              onPointerDown={(e) => handlePointDown(e, i)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onDoubleClick={(e) => handlePointDoubleClick(e, i)}
            />
          );
        })}
      </svg>
    </div>
  );
}
