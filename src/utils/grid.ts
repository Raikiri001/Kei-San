export interface GridNode {
  x: number;
  y: number;
}

/** Uniform grid over [0,width] x [0,height] with `cols` x `rows` cells, edges included as nodes. */
export function getCellSize(width: number, height: number, cols: number, rows: number) {
  return { cellWidth: width / cols, cellHeight: height / rows };
}

/**
 * Every half-cell intersection over [0,width] x [0,height] — not just the
 * `cols` x `rows` cell corners, but also each cell's own center and edge
 * midpoints, at twice the resolution on each axis. This is the full anchor
 * set both `snapToNearestNode` (move) and `snapLineToGrid` (resize edges)
 * snap against, so what's rendered here as visible dots is exactly what's
 * reachable, not a subset of it.
 */
export function getGridNodes(width: number, height: number, cols: number, rows: number): GridNode[] {
  const { cellWidth, cellHeight } = getCellSize(width, height, cols, rows);
  const halfW = cellWidth / 2;
  const halfH = cellHeight / 2;
  const nodes: GridNode[] = [];
  for (let j = 0; j <= rows * 2; j++) {
    for (let i = 0; i <= cols * 2; i++) {
      nodes.push({ x: i * halfW, y: j * halfH });
    }
  }
  return nodes;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Snaps a proposed center point (true canvas px) to the nearest half-cell
 * intersection, O(1) — see `getGridNodes`'s doc comment for why half-cell
 * (not whole-cell) resolution: cell centers (and edge midpoints) are anchors
 * too, not just the `cols` x `rows` corners.
 */
export function snapToNearestNode(
  x: number,
  y: number,
  width: number,
  height: number,
  cols: number,
  rows: number,
): GridNode {
  const { cellWidth, cellHeight } = getCellSize(width, height, cols, rows);
  const halfW = cellWidth / 2;
  const halfH = cellHeight / 2;
  const i = clamp(Math.round(x / halfW), 0, cols * 2);
  const j = clamp(Math.round(y / halfH), 0, rows * 2);
  return { x: i * halfW, y: j * halfH };
}

/**
 * Snaps a single coordinate (true canvas px, along one axis) to the nearest
 * half-cell line — used for Canva-style "clip to the nearest column/row (or
 * cell-center) while resizing" snapping, one edge at a time, rather than
 * snapping a whole center point at once like `snapToNearestNode` does for
 * moves. Returns `pos` unchanged if the nearest line is farther than `thresholdPx`.
 */
export function snapLineToGrid(pos: number, axisSize: number, cellCount: number, thresholdPx: number): number {
  const halfCell = axisSize / cellCount / 2;
  const nearest = Math.round(pos / halfCell) * halfCell;
  return Math.abs(nearest - pos) <= thresholdPx ? nearest : pos;
}
