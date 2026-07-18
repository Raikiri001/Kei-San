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
 * Snaps a proposed center point (true canvas px) to the nearest lattice
 * intersection, O(1). `dense` (default true) selects which lattice:
 *  - true: half-cell resolution — see `getGridNodes`'s doc comment for why
 *    (cell centers and edge midpoints are anchors too, not just the `cols` x
 *    `rows` corners). This is what's visible as anchor dots.
 *  - false: whole-cell resolution only — just the actual row/column line
 *    intersections (which already includes the 4 canvas edges as the
 *    boundary case) — used when the anchor dots are toggled off, since that
 *    toggle turns off the *fine* snap points, not snapping altogether.
 */
export function snapToNearestNode(
  x: number,
  y: number,
  width: number,
  height: number,
  cols: number,
  rows: number,
  dense: boolean = true,
): GridNode {
  const { cellWidth, cellHeight } = getCellSize(width, height, cols, rows);
  const stepW = dense ? cellWidth / 2 : cellWidth;
  const stepH = dense ? cellHeight / 2 : cellHeight;
  const maxI = dense ? cols * 2 : cols;
  const maxJ = dense ? rows * 2 : rows;
  const i = clamp(Math.round(x / stepW), 0, maxI);
  const j = clamp(Math.round(y / stepH), 0, maxJ);
  return { x: i * stepW, y: j * stepH };
}

/**
 * Snaps a single coordinate (true canvas px, along one axis) to the nearest
 * grid line — used for Canva-style "clip to the nearest column/row (or,
 * when `dense`, cell-center) while resizing" snapping, one edge at a time,
 * rather than snapping a whole center point at once like `snapToNearestNode`
 * does for moves. Returns `pos` unchanged if the nearest line is farther than
 * `thresholdPx`. See `snapToNearestNode`'s doc comment for what `dense` toggles.
 */
export function snapLineToGrid(pos: number, axisSize: number, cellCount: number, thresholdPx: number, dense: boolean = true): number {
  const step = dense ? axisSize / cellCount / 2 : axisSize / cellCount;
  const nearest = Math.round(pos / step) * step;
  return Math.abs(nearest - pos) <= thresholdPx ? nearest : pos;
}

/**
 * Illustrator/InDesign-style "smart guide" snap for one axis, used while
 * anchors are toggled off (free-form move) — snaps a moved element's own
 * *center* to whichever row/column line (or the true canvas mid-line,
 * explicitly included even when `cellCount` is odd and so has no line
 * exactly at the midpoint) is within `thresholdPx`, rather than always
 * snapping to the nearest lattice point the way `snapToNearestNode` does.
 * Returns `null` (not `pos`) when nothing is close enough, so the caller can
 * tell "no snap" apart from "snapped to a line that happens to equal `pos`"
 * — that distinction is what drives whether a guide line renders.
 */
export function nearestAlignmentLine(pos: number, axisSize: number, cellCount: number, thresholdPx: number): number | null {
  const step = axisSize / cellCount;
  let best: number | null = null;
  let bestDist = thresholdPx;
  for (let i = 0; i <= cellCount; i++) {
    const line = i * step;
    const dist = Math.abs(line - pos);
    if (dist <= bestDist) {
      bestDist = dist;
      best = line;
    }
  }
  const mid = axisSize / 2;
  const midDist = Math.abs(mid - pos);
  if (midDist <= bestDist) best = mid;
  return best;
}

/**
 * Both axes of the smart-guide snap above, for a moved element's center
 * point — the free-form-move analogue of `snapToNearestNode`. `guideX`/`guideY`
 * (canvas px, or null when that axis didn't snap) are the full-length line
 * positions to render as live alignment-guide feedback; `x`/`y` are the
 * snapped (or, if that axis didn't snap, unchanged) position to actually move
 * the element to.
 */
export function snapToAlignmentGuides(
  x: number,
  y: number,
  width: number,
  height: number,
  cols: number,
  rows: number,
  thresholdPx: number,
): { x: number; y: number; guideX: number | null; guideY: number | null } {
  const guideX = nearestAlignmentLine(x, width, cols, thresholdPx);
  const guideY = nearestAlignmentLine(y, height, rows, thresholdPx);
  return { x: guideX ?? x, y: guideY ?? y, guideX, guideY };
}
