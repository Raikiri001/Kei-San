import { RULER_THICKNESS } from "@/constants/defaults";

interface RulerOverlayProps {
  /** Canvas true px dimensions — ticks are generated across 0..width / 0..height. */
  width: number;
  height: number;
  zoom: number;
  /** Screen px (relative to the viewport box) where canvas x=0 / y=0 currently sits —
   * already includes the current pan offset, so ticks only need `+ canvasPx * zoom`. */
  originX: number;
  originY: number;
  /** Live cursor position in true canvas px, or null when the pointer isn't over the canvas. */
  hoverPos: { x: number; y: number } | null;
}

const TICK_LENGTH = 5;
// Both the plain tick labels and the accent readout pill anchor at this same
// distance from the bar's canvas-facing edge, so the live coordinate reads as
// sitting "on the same line" as the ordinary tick numbers instead of floating
// at its own height.
const LABEL_INSET = 9;

// "Nice" canvas-px intervals to choose between — picked so the on-screen spacing
// between labeled ticks stays legible at any zoom level, instead of always drawing
// one tick per grid cell (which shrinks past readability when zoomed way out).
const NICE_INTERVALS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
const TARGET_LABEL_SPACING_PX = 70;

function pickTickInterval(zoom: number): number {
  for (const interval of NICE_INTERVALS) {
    if (interval * zoom >= TARGET_LABEL_SPACING_PX) return interval;
  }
  return NICE_INTERVALS[NICE_INTERVALS.length - 1];
}

function buildTicks(sizeCanvasPx: number, interval: number): number[] {
  const ticks: number[] = [];
  for (let v = 0; v <= sizeCanvasPx; v += interval) ticks.push(v);
  return ticks;
}

/**
 * Top + left rulers pinned to the viewport edges (not the zoomed/panned canvas), so
 * their own size (tick length, bar thickness, label font) stays constant screen px
 * regardless of zoom — only each tick's position moves via `originX/Y + value * zoom`.
 * Tick interval is chosen per-zoom from a "nice number" set so labels never crowd
 * together at low zoom or thin out uselessly at high zoom.
 *
 * Deliberately no `overflow-hidden` on either bar: the accent readout pill below
 * needs room to render its full rounded pill shape without getting clipped by the
 * bar's own edge, and off-screen ticks are already culled in JS (the `left`/`top`
 * bounds checks below), not by CSS clipping.
 */
export function RulerOverlay({ width, height, zoom, originX, originY, hoverPos }: RulerOverlayProps) {
  const interval = pickTickInterval(zoom);
  const colTicks = buildTicks(width, interval);
  const rowTicks = buildTicks(height, interval);

  const showX = !!hoverPos && hoverPos.x >= 0 && hoverPos.x <= width;
  const showY = !!hoverPos && hoverPos.y >= 0 && hoverPos.y <= height;

  return (
    <>
      <div className="ruler-bar ruler-bar-top pointer-events-none absolute inset-x-0 top-0 z-10" style={{ height: RULER_THICKNESS }}>
        {colTicks.map((x) => {
          const left = originX + x * zoom;
          if (left < -40 || left > 100000) return null;
          return (
            <div key={x} className="absolute bottom-0" style={{ left }}>
              <span
                className="font-mono absolute left-1 whitespace-nowrap text-[9px] tabular-nums opacity-60"
                style={{ bottom: LABEL_INSET, color: "rgb(var(--bar-fg-dim))" }}
              >
                {x}
              </span>
              <span
                className="absolute bottom-0 left-0"
                style={{ height: TICK_LENGTH, width: 1, background: "rgb(var(--bar-border) / 0.4)" }}
              />
            </div>
          );
        })}
        {showX && hoverPos && (
          <>
            <div
              className="absolute top-0 h-full"
              style={{ left: originX + hoverPos.x * zoom, width: 1, background: "rgb(var(--bar-fg))" }}
            />
            <div
              className="font-mono absolute -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-medium leading-none tabular-nums shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
              style={{
                left: originX + hoverPos.x * zoom,
                bottom: LABEL_INSET - 2,
                color: "rgb(var(--bar-bg))",
                background: "rgb(var(--bar-fg))",
              }}
            >
              {Math.round(hoverPos.x)}
            </div>
          </>
        )}
      </div>

      <div className="ruler-bar ruler-bar-left pointer-events-none absolute inset-y-0 left-0 z-10" style={{ width: RULER_THICKNESS }}>
        {rowTicks.map((y) => {
          const top = originY + y * zoom;
          if (top < -40 || top > 100000) return null;
          return (
            <div key={y} className="absolute right-0" style={{ top }}>
              {/* Rotated to run bottom-to-top, matching the ruler's own
                  vertical orientation — vertically centered on the tick
                  (top-1/2 -translate-y-1/2) before the rotate so it spins in
                  place around the tick's own y-coordinate instead of drifting. */}
              <span
                className="font-mono absolute top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[9px] tabular-nums opacity-60"
                style={{ right: LABEL_INSET, color: "rgb(var(--bar-fg-dim))" }}
              >
                {y}
              </span>
              <span
                className="absolute right-0 top-0"
                style={{ width: TICK_LENGTH, height: 1, background: "rgb(var(--bar-border) / 0.4)" }}
              />
            </div>
          );
        })}
        {showY && hoverPos && (
          <>
            <div
              className="absolute left-0 w-full"
              style={{ top: originY + hoverPos.y * zoom, height: 1, background: "rgb(var(--bar-fg))" }}
            />
            {/* Same rotation as the plain tick labels above — a vertical
                ruler's own readout pill should read top-to-bottom like the
                ruler itself, not sit sideways spilling out past its narrow
                32px lane the way a plain horizontal pill would. */}
            <div
              className="font-mono absolute left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-medium leading-none tabular-nums shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
              style={{
                top: originY + hoverPos.y * zoom,
                color: "rgb(var(--bar-bg))",
                background: "rgb(var(--bar-fg))",
              }}
            >
              {Math.round(hoverPos.y)}
            </div>
          </>
        )}
      </div>

      {/* Corner patch where the two full-span bars overlap. */}
      <div className="ruler-bar pointer-events-none absolute left-0 top-0 z-10" style={{ width: RULER_THICKNESS, height: RULER_THICKNESS }} />
    </>
  );
}
