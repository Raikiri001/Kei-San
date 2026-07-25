import { useCallback, useRef } from "react";
import { createId } from "@/utils/id";
import { ColorPickerButton } from "@/components/ColorPickerButton";
import { InfoTooltip } from "@/components/InfoTooltip";

export interface GradientStop {
  id: string;
  /** 0-1. */
  position: number;
  /** Hex. */
  color: string;
}

interface GradientStopEditorProps {
  label: string;
  stops: GradientStop[];
  onChange: (stops: GradientStop[]) => void;
}

const BAR_HEIGHT = 28;
const MIN_STOPS = 2;
const MIN_GAP = 0.01;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linearly interpolates the gradient's own color at position `t` (0-1) between its
 * sorted stops — seeds a sensible color when a new stop is added mid-gradient,
 * rather than always defaulting to a flat color that'd visibly "notch" the gradient
 * at the click point. */
function sampleGradientColor(stops: GradientStop[], t: number): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  if (t <= sorted[0].position) return sorted[0].color;
  if (t >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].color;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (t >= a.position && t <= b.position) {
      const span = b.position - a.position;
      const f = span > 0 ? (t - a.position) / span : 0;
      const [ar, ag, ab] = hexToRgb(a.color);
      const [br, bg, bb] = hexToRgb(b.color);
      return rgbToHex(ar + (br - ar) * f, ag + (bg - ag) * f, ab + (bb - ab) * f);
    }
  }
  return sorted[sorted.length - 1].color;
}

/**
 * A real gradient-stop editor for Gradient Map — a horizontal bar previewing the
 * gradient, draggable position markers (click empty space to add a stop, drag a
 * marker to reposition, double-click to remove), and a row of native color swatches
 * below (one per stop, kept separate from the drag markers so dragging a stop's
 * position and picking its color never fight over the same pointer gesture). Mirrors
 * CurveField's own "click to add, drag to shape, double-click to remove" convention
 * and its minimum-of-2 rule.
 */
export function GradientStopEditor({ label, stops, onChange }: GradientStopEditorProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);
  const sorted = [...stops].sort((a, b) => a.position - b.position);

  const positionFromClientX = useCallback((clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const handleMarkerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragId.current = id;
  }, []);

  const handleMarkerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragId.current) return;
      const pos = positionFromClientX(e.clientX);
      if (pos === null) return;
      onChange(stops.map((s) => (s.id === dragId.current ? { ...s, position: pos } : s)));
    },
    [stops, positionFromClientX, onChange],
  );

  const handleMarkerPointerUp = useCallback(() => {
    dragId.current = null;
  }, []);

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const pos = positionFromClientX(e.clientX);
      if (pos === null) return;
      if (sorted.some((s) => Math.abs(s.position - pos) < MIN_GAP * 1.5)) return;
      onChange([...stops, { id: createId(), position: pos, color: sampleGradientColor(sorted, pos) }]);
    },
    [stops, sorted, positionFromClientX, onChange],
  );

  const handleMarkerDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, id: string) => {
      e.stopPropagation();
      if (stops.length <= MIN_STOPS) return;
      onChange(stops.filter((s) => s.id !== id));
    },
    [stops, onChange],
  );

  const gradientCss = `linear-gradient(to right, ${sorted.map((s) => `${s.color} ${s.position * 100}%`).join(", ")})`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide opacity-70">{label}</span>
        <InfoTooltip text="Click the bar to add a stop, drag a marker to move it, double-click to remove." label={`About ${label}`} />
      </div>
      <div
        ref={barRef}
        onClick={handleBarClick}
        onPointerDown={(e) => e.stopPropagation()}
        className="relative cursor-crosshair rounded border border-[rgb(var(--chrome-border)/0.3)]"
        style={{ height: BAR_HEIGHT, background: gradientCss, touchAction: "none" }}
      >
        {sorted.map((s) => (
          <div
            key={s.id}
            onPointerDown={(e) => handleMarkerPointerDown(e, s.id)}
            onPointerMove={handleMarkerPointerMove}
            onPointerUp={handleMarkerPointerUp}
            onDoubleClick={(e) => handleMarkerDoubleClick(e, s.id)}
            className="absolute top-full h-2.5 w-2.5 -translate-x-1/2 translate-y-0.5 rotate-45 cursor-grab border border-black/50 bg-white active:cursor-grabbing"
            style={{ left: `${s.position * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {sorted.map((s) => (
          <ColorPickerButton
            key={s.id}
            value={s.color}
            onChange={(hex) => onChange(stops.map((st) => (st.id === s.id ? { ...st, color: hex } : st)))}
            label="Gradient stop color"
            className="h-6 w-8 shrink-0 cursor-pointer rounded border border-[rgb(var(--chrome-border)/0.3)]"
          />
        ))}
      </div>
    </div>
  );
}
