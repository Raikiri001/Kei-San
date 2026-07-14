interface RulerOverlayProps {
  width: number;
  height: number;
  cols: number;
  rows: number;
  /** Live cursor position in true canvas px, or null when the pointer isn't over the canvas. */
  hoverPos: { x: number; y: number } | null;
}

const RULER_THICKNESS = 22;
const RULER_GAP = 6;
const TICK_LENGTH = 6;

/** Top + left rulers showing the grid's column/row lines and a live cursor-position readout. */
export function RulerOverlay({ width, height, cols, rows, hoverPos }: RulerOverlayProps) {
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const colTicks = Array.from({ length: cols + 1 }, (_, i) => i * cellWidth);
  const rowTicks = Array.from({ length: rows + 1 }, (_, i) => i * cellHeight);

  const showX = !!hoverPos && hoverPos.x >= 0 && hoverPos.x <= width;
  const showY = !!hoverPos && hoverPos.y >= 0 && hoverPos.y <= height;

  return (
    <>
      <div
        className="glass-panel pointer-events-none absolute overflow-hidden"
        style={{ left: 0, top: -(RULER_THICKNESS + RULER_GAP), width, height: RULER_THICKNESS }}
      >
        {colTicks.map((x) => (
          <div
            key={x}
            className="absolute bottom-0"
            style={{ left: x, height: TICK_LENGTH, width: 1, background: "rgb(var(--chrome-border) / 0.4)" }}
          />
        ))}
        {showX && hoverPos && (
          <>
            <div className="absolute top-0 h-full" style={{ left: hoverPos.x, width: 1, background: "var(--color-accent)" }} />
            <div
              className="absolute top-0.5 -translate-x-1/2 whitespace-nowrap rounded px-1 text-[9px] tabular-nums"
              style={{ left: hoverPos.x, color: "var(--color-accent)", background: "rgb(var(--chrome-bg) / 0.9)" }}
            >
              {Math.round(hoverPos.x)}
            </div>
          </>
        )}
      </div>

      <div
        className="glass-panel pointer-events-none absolute overflow-hidden"
        style={{ left: -(RULER_THICKNESS + RULER_GAP), top: 0, width: RULER_THICKNESS, height }}
      >
        {rowTicks.map((y) => (
          <div
            key={y}
            className="absolute right-0"
            style={{ top: y, width: TICK_LENGTH, height: 1, background: "rgb(var(--chrome-border) / 0.4)" }}
          />
        ))}
        {showY && hoverPos && (
          <>
            <div className="absolute left-0 w-full" style={{ top: hoverPos.y, height: 1, background: "var(--color-accent)" }} />
            <div
              className="absolute left-0.5 -translate-y-1/2 whitespace-nowrap rounded px-1 text-[9px] tabular-nums"
              style={{ top: hoverPos.y, color: "var(--color-accent)", background: "rgb(var(--chrome-bg) / 0.9)" }}
            >
              {Math.round(hoverPos.y)}
            </div>
          </>
        )}
      </div>
    </>
  );
}
