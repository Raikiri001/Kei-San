import { useRef, useState } from "react";
import clsx from "clsx";
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from "@/canvas/colorExtraction";
import { useDraftText } from "@/hooks/useDraftText";
import { useDraftNumber } from "@/hooks/useDraftNumber";
import { fieldLabelClass, numberInputClass } from "@/components/RadialMenu/inputStyles";
import { isEyeDropperSupported, pickColorWithEyeDropper } from "@/utils/eyedropper";
import { EyedropperIcon } from "@/components/RadialMenu/icons";

const BOARD_HEIGHT = 130;
const BAR_HEIGHT = 14;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Fraction (0-1) of `clientX`/`clientY` along `el`'s own box — shared by the
 * SV board (2D) and the hue/alpha bars (1D, y unused). */
function fractionFromPointer(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  };
}

interface ColorBoardPickerProps {
  value: string;
  /** Omit for a color with no meaningful transparency of its own (e.g. a glow
   * tint) — hides the alpha bar and the "A" field entirely instead of faking
   * a value that nothing reads. */
  alpha?: number;
  onChange: (hex: string) => void;
  onAlphaChange?: (alpha: number) => void;
}

/**
 * Saturation/Value rectangle (drag toward white/black/full hue) + a straight
 * hue bar + an optional alpha bar + hex/RGB fields (toggle which is shown) + an
 * eyedropper — replaces the old circular hue/saturation wheel with the more
 * familiar Photoshop/Illustrator-style rectangle-and-bars layout.
 */
export function ColorBoardPicker({ value, alpha, onChange, onAlphaChange }: ColorBoardPickerProps) {
  const hasAlpha = alpha !== undefined && onAlphaChange !== undefined;
  const boardRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"hex" | "rgb">("hex");

  // Initialized once from the incoming hex, same reasoning as the old wheel:
  // the popover this lives in unmounts on close, so every re-open naturally
  // re-seeds from the current stored color.
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(value) ?? { r: 128, g: 128, b: 128 }));

  function emit(next: { h: number; s: number; v: number }) {
    setHsv(next);
    onChange(rgbToHex(hsvToRgb(next.h, next.s, next.v)));
  }

  function pickFromBoard(clientX: number, clientY: number) {
    const el = boardRef.current;
    if (!el) return;
    const { x, y } = fractionFromPointer(el, clientX, clientY);
    emit({ h: hsv.h, s: x, v: 1 - y });
  }

  function pickFromHue(clientX: number, clientY: number) {
    const el = hueRef.current;
    if (!el) return;
    const { x } = fractionFromPointer(el, clientX, clientY);
    emit({ ...hsv, h: x * 360 });
  }

  function pickFromAlpha(clientX: number, clientY: number) {
    const el = alphaRef.current;
    if (!el || !onAlphaChange) return;
    const { x } = fractionFromPointer(el, clientX, clientY);
    onAlphaChange(x);
  }

  function dragHandlers(pick: (x: number, y: number) => void) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e.clientX, e.clientY);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (e.buttons !== 1) return;
        pick(e.clientX, e.clientY);
      },
    };
  }

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hex = rgbToHex(rgb);
  const hueColor = rgbToHex(hsvToRgb(hsv.h, 1, 1));

  const hexDraft = useDraftText(hex, {
    parse: (raw) => {
      const parsed = hexToRgb(raw);
      return parsed ? rgbToHex(parsed) : null;
    },
    onCommit: (parsedHex) => {
      const parsedRgb = hexToRgb(parsedHex);
      if (parsedRgb) emit(rgbToHsv(parsedRgb));
    },
  });

  const rDraft = useDraftNumber(rgb.r, { min: 0, max: 255, onCommit: (n) => emit(rgbToHsv({ ...rgb, r: n })) });
  const gDraft = useDraftNumber(rgb.g, { min: 0, max: 255, onCommit: (n) => emit(rgbToHsv({ ...rgb, g: n })) });
  const bDraft = useDraftNumber(rgb.b, { min: 0, max: 255, onCommit: (n) => emit(rgbToHsv({ ...rgb, b: n })) });
  const aDraft = useDraftNumber(Math.round((alpha ?? 1) * 100), {
    min: 0,
    max: 100,
    onCommit: (n) => onAlphaChange?.(clamp01(n / 100)),
  });

  async function handleEyedropper() {
    const picked = await pickColorWithEyeDropper();
    if (picked) {
      const parsedRgb = hexToRgb(picked);
      if (parsedRgb) emit(rgbToHsv(parsedRgb));
    }
  }

  return (
    <div className="flex flex-col gap-2.5" onPointerDown={(e) => e.stopPropagation()}>
      <div
        ref={boardRef}
        className="relative touch-none rounded"
        style={{
          height: BOARD_HEIGHT,
          // Classic two-layer CSS trick for an HSV saturation/value square: a
          // horizontal white->hue sweep under a vertical transparent->black
          // sweep, instead of needing a per-pixel canvas draw the way the
          // circular wheel's hue-by-angle math did.
          backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
        }}
        {...dragHandlers(pickFromBoard)}
      >
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: hex,
            boxShadow: "0 0 4px rgb(0 0 0 / 0.6)",
          }}
        />
      </div>

      <div
        ref={hueRef}
        className="relative touch-none rounded"
        style={{
          height: BAR_HEIGHT,
          background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
        }}
        {...dragHandlers(pickFromHue)}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-full w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white"
          style={{ left: `${(hsv.h / 360) * 100}%`, boxShadow: "0 0 3px rgb(0 0 0 / 0.6)" }}
        />
      </div>

      {hasAlpha && (
        <div
          ref={alphaRef}
          className="relative touch-none rounded"
          style={{
            height: BAR_HEIGHT,
            backgroundImage: `linear-gradient(to right, transparent, ${hex}), repeating-conic-gradient(#8a8f98 0% 25%, #cfd3d8 0% 50%)`,
            backgroundSize: "auto, 8px 8px",
          }}
          {...dragHandlers(pickFromAlpha)}
        >
          <div
            className="pointer-events-none absolute top-1/2 h-full w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white"
            style={{ left: `${(alpha ?? 1) * 100}%`, boxShadow: "0 0 3px rgb(0 0 0 / 0.6)" }}
          />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <span
          className="h-7 w-7 shrink-0 rounded border border-[rgb(var(--chrome-border)/0.25)]"
          style={{
            backgroundImage: `linear-gradient(${hex}, ${hex}), repeating-conic-gradient(#8a8f98 0% 25%, #cfd3d8 0% 50%)`,
            backgroundSize: `auto, 8px 8px`,
            opacity: alpha ?? 1,
          }}
        />

        {isEyeDropperSupported() && (
          <button
            type="button"
            onClick={handleEyedropper}
            aria-label="Pick color from screen"
            title="Eyedropper"
            className="press-scale flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[rgb(var(--chrome-border)/0.25)] hover:border-accent/60"
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center">
              <EyedropperIcon />
            </span>
          </button>
        )}

        <div className="flex rounded border border-[rgb(var(--chrome-border)/0.25)] text-[9px] uppercase tracking-wide">
          {(["hex", "rgb"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={clsx(
                "press-scale h-7 px-2 transition-colors duration-150",
                mode === m ? "bg-accent/20 text-accent" : "opacity-60 hover:opacity-100",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "hex" ? (
        <div className="flex items-end justify-center gap-1.5">
          <label className="flex flex-1 flex-col items-center gap-0.5">
            <span className={fieldLabelClass}>Hex</span>
            <input
              value={hexDraft.draft}
              onChange={hexDraft.onChange}
              onFocus={hexDraft.onFocus}
              onBlur={hexDraft.onBlur}
              onKeyDown={hexDraft.onKeyDown}
              className="glass-panel h-7 w-full rounded px-1.5 text-[11px] uppercase outline-none focus:border-accent/60"
            />
          </label>
          {hasAlpha && (
            <label className="flex flex-col items-center gap-0.5">
              <span className={fieldLabelClass}>A</span>
              <input
                type="number"
                min={0}
                max={100}
                value={aDraft.draft}
                onChange={aDraft.onChange}
                onFocus={aDraft.onFocus}
                onBlur={aDraft.onBlur}
                onKeyDown={aDraft.onKeyDown}
                className={numberInputClass}
              />
            </label>
          )}
        </div>
      ) : (
        <div className="flex items-end justify-center gap-1.5">
          <label className="flex flex-col items-center gap-0.5">
            <span className={fieldLabelClass}>R</span>
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
            />
          </label>
          <label className="flex flex-col items-center gap-0.5">
            <span className={fieldLabelClass}>G</span>
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
            />
          </label>
          <label className="flex flex-col items-center gap-0.5">
            <span className={fieldLabelClass}>B</span>
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
            />
          </label>
          {hasAlpha && (
            <label className="flex flex-col items-center gap-0.5">
              <span className={fieldLabelClass}>A</span>
              <input
                type="number"
                min={0}
                max={100}
                value={aDraft.draft}
                onChange={aDraft.onChange}
                onFocus={aDraft.onFocus}
                onBlur={aDraft.onBlur}
                onKeyDown={aDraft.onKeyDown}
                className={numberInputClass}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
