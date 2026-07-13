import { useEffect, useRef, useState } from "react";
import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from "@/canvas/colorExtraction";
import { useDraftText } from "@/hooks/useDraftText";
import { useDraftNumber } from "@/hooks/useDraftNumber";

const WHEEL_SIZE = 128;
const WHEEL_MARGIN = 4;
const WHEEL_RADIUS = WHEEL_SIZE / 2 - WHEEL_MARGIN;

// The wheel's pixel grid only depends on its size, never on the selected color,
// so it's computed once and reused across every picker instance/open.
const wheelCache = new Map<number, ImageData>();
function getWheelImageData(size: number): ImageData {
  const cached = wheelCache.get(size);
  if (cached) return cached;

  const center = size / 2;
  const radius = center - WHEEL_MARGIN;
  const imageData = new ImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue; // leave alpha 0 — transparent outside the disc

      const i = (y * size + x) * 4;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const sat = dist / radius;
      const { r, g, b } = hslToRgb(angle, sat, 0.5);
      imageData.data[i] = r;
      imageData.data[i + 1] = g;
      imageData.data[i + 2] = b;
      imageData.data[i + 3] = 255;
    }
  }

  wheelCache.set(size, imageData);
  return imageData;
}

const numberInputClass =
  "glass-panel h-7 w-9 shrink-0 rounded px-1 text-center text-[11px] tabular-nums outline-none focus:border-accent/60";

interface ColorWheelPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

/** Hue/saturation wheel + lightness slider + hex/RGB text fields, fully synced both ways. */
export function ColorWheelPicker({ value, onChange }: ColorWheelPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialized once from the incoming hex; the popover this lives in unmounts
  // on close, so every re-open naturally re-seeds from the current stored color
  // — no need to keep resyncing this against `value` on every render.
  const [hsl, setHsl] = useState(() => rgbToHsl(hexToRgb(value) ?? { r: 128, g: 128, b: 128 }));

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.putImageData(getWheelImageData(WHEEL_SIZE), 0, 0);
  }, []);

  function emit(next: { h: number; s: number; l: number }) {
    setHsl(next);
    onChange(rgbToHex(hslToRgb(next.h, next.s, next.l)));
  }

  function pickFromPointer(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = clientX - rect.left - WHEEL_SIZE / 2;
    const dy = clientY - rect.top - WHEEL_SIZE / 2;
    const dist = Math.min(WHEEL_RADIUS, Math.sqrt(dx * dx + dy * dy));
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    emit({ h: angle, s: dist / WHEEL_RADIUS, l: hsl.l });
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pickFromPointer(e.clientX, e.clientY);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.buttons !== 1) return;
    pickFromPointer(e.clientX, e.clientY);
  }

  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  const hex = rgbToHex(rgb);

  const angleRad = (hsl.h * Math.PI) / 180;
  const indicatorX = WHEEL_SIZE / 2 + Math.cos(angleRad) * hsl.s * WHEEL_RADIUS;
  const indicatorY = WHEEL_SIZE / 2 + Math.sin(angleRad) * hsl.s * WHEEL_RADIUS;

  const hexDraft = useDraftText(hex, {
    parse: (raw) => {
      const parsed = hexToRgb(raw);
      return parsed ? rgbToHex(parsed) : null;
    },
    onCommit: (parsedHex) => {
      const parsedRgb = hexToRgb(parsedHex);
      if (parsedRgb) emit(rgbToHsl(parsedRgb));
    },
  });

  const rDraft = useDraftNumber(rgb.r, { min: 0, max: 255, onCommit: (n) => emit(rgbToHsl({ ...rgb, r: n })) });
  const gDraft = useDraftNumber(rgb.g, { min: 0, max: 255, onCommit: (n) => emit(rgbToHsl({ ...rgb, g: n })) });
  const bDraft = useDraftNumber(rgb.b, { min: 0, max: 255, onCommit: (n) => emit(rgbToHsl({ ...rgb, b: n })) });

  return (
    <div className="flex flex-col items-center gap-3" onPointerDown={(e) => e.stopPropagation()}>
      <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
        <canvas
          ref={canvasRef}
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          className="touch-none rounded-full"
        />
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_4px_rgb(0_0_0/0.6)]"
          style={{ left: indicatorX, top: indicatorY, background: hex }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(hsl.l * 100)}
        onChange={(e) => emit({ ...hsl, l: Number(e.target.value) / 100 })}
        className="w-full accent-current"
        aria-label="Lightness"
      />

      <div className="flex w-full items-center justify-center gap-1.5">
        <span
          className="h-7 w-7 shrink-0 rounded-full border border-white/25"
          style={{ background: hex }}
        />
        <input
          value={hexDraft.draft}
          onChange={hexDraft.onChange}
          onFocus={hexDraft.onFocus}
          onBlur={hexDraft.onBlur}
          onKeyDown={hexDraft.onKeyDown}
          className="glass-panel h-7 w-16 rounded px-1.5 text-[11px] uppercase outline-none focus:border-accent/60"
        />
        <input
          type="number"
          min={0}
          max={255}
          value={rDraft.draft}
          onChange={rDraft.onChange}
          onFocus={rDraft.onFocus}
          onBlur={rDraft.onBlur}
          onKeyDown={rDraft.onKeyDown}
          className={numberInputClass}
          aria-label="Red"
        />
        <input
          type="number"
          min={0}
          max={255}
          value={gDraft.draft}
          onChange={gDraft.onChange}
          onFocus={gDraft.onFocus}
          onBlur={gDraft.onBlur}
          onKeyDown={gDraft.onKeyDown}
          className={numberInputClass}
          aria-label="Green"
        />
        <input
          type="number"
          min={0}
          max={255}
          value={bDraft.draft}
          onChange={bDraft.onChange}
          onFocus={bDraft.onFocus}
          onBlur={bDraft.onBlur}
          onKeyDown={bDraft.onKeyDown}
          className={numberInputClass}
          aria-label="Blue"
        />
      </div>
    </div>
  );
}
