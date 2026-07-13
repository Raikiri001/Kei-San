interface GridOverlayProps {
  width: number;
  height: number;
  cols: number;
  rows: number;
}

/** Faint CSS-gradient grid lines showing the current snap lattice — a rendering hint, not a stored element. */
export function GridOverlay({ width, height, cols, rows }: GridOverlayProps) {
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgb(255 255 255 / 0.08) 1px, transparent 1px)," +
          "linear-gradient(to bottom, rgb(255 255 255 / 0.08) 1px, transparent 1px)",
        backgroundSize: `${cellWidth}px ${cellHeight}px`,
      }}
    />
  );
}
