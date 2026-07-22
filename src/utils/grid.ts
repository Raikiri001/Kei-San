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

/** Another element's bounding box (canvas px, center-anchored — same convention as
 * ImageElement/TextElement's own x/y/displayWidth-or-boxWidth/displayHeight-or-
 * boxHeight) offered up as a set of candidate snap lines, alongside the canvas grid. */
export interface SnapTargetBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A box's own three feature lines along one axis — leading edge, center, trailing
 * edge — mirroring the three features `nearestAlignmentLine` checks on the *moved*
 * element below. Offering all three (not just edges) is what lets two elements
 * center-align with each other, not only sit flush edge-to-edge. */
function boxLinesForAxis(boxes: SnapTargetBox[], axis: "x" | "y"): number[] {
  const lines: number[] = [];
  for (const box of boxes) {
    const center = axis === "x" ? box.x : box.y;
    const half = (axis === "x" ? box.w : box.h) / 2;
    lines.push(center - half, center, center + half);
  }
  return lines;
}

/**
 * Every line an Illustrator/InDesign-style smart guide can snap to along one
 * axis: each row/column boundary (`i * step`, which already includes both
 * canvas edges as the i=0 and i=cellCount cases), each cell's own center
 * line (`i * step + step / 2`), the true canvas mid-line (explicitly added
 * even when `cellCount` is odd and so has no boundary line exactly at the
 * midpoint), and — this is what makes dragging one element flush against a
 * *neighboring* element work, not just against the canvas grid — every line
 * in `extraLines` (typically other elements' own edges/centers, see
 * `boxLinesForAxis` above). Cell-center lines are what let an element sized
 * to exactly one cell snap into a *different* cell — its center lands on
 * that cell's center the same way its edges land on that cell's boundary lines.
 */
function alignmentLinesForAxis(axisSize: number, cellCount: number, extraLines: number[]): number[] {
  const step = axisSize / cellCount;
  const lines: number[] = [...extraLines];
  for (let i = 0; i <= cellCount; i++) lines.push(i * step);
  for (let i = 0; i < cellCount; i++) lines.push(i * step + step / 2);
  const mid = axisSize / 2;
  if (!lines.some((line) => Math.abs(line - mid) < 1e-6)) lines.push(mid);
  return lines;
}

/**
 * Illustrator/InDesign-style "smart guide" snap for one axis, used while
 * anchors are toggled off (free-form move). Unlike a single-point snap, this
 * checks THREE features of the moved element against every candidate line —
 * its leading edge, its center, and its trailing edge (`pos - size/2`,
 * `pos`, `pos + size/2`) — so a drag that brings just one edge near the
 * canvas boundary (or any row/column line) still snaps, even though the
 * element's center is nowhere close. Whichever (feature, line) pair is
 * closest overall wins; the returned `pos` is shifted by exactly enough to
 * put that feature on that line, not the naive "snap the center" result.
 * Returns `pos` unchanged and `guide: null` when nothing is within
 * `thresholdPx`, so the caller can tell "no snap" apart from "snapped to a
 * line that happens to equal `pos`" — that distinction drives whether a
 * guide line renders.
 */
export function nearestAlignmentLine(
  pos: number,
  size: number,
  axisSize: number,
  cellCount: number,
  thresholdPx: number,
  extraLines: number[] = [],
): { pos: number; guide: number | null } {
  const lines = alignmentLinesForAxis(axisSize, cellCount, extraLines);
  const offsets = [-size / 2, 0, size / 2];
  let best: { line: number; offset: number; dist: number } | null = null;
  for (const offset of offsets) {
    const feature = pos + offset;
    for (const line of lines) {
      const dist = Math.abs(feature - line);
      if (dist <= thresholdPx && (!best || dist < best.dist)) best = { line, offset, dist };
    }
  }
  if (!best) return { pos, guide: null };
  return { pos: best.line - best.offset, guide: best.line };
}

/**
 * Both axes of the smart-guide snap above, for a moved element's bounding
 * box (`w`/`h`, canvas px) — the free-form-move analogue of
 * `snapToNearestNode`. Each axis snaps independently, so a corner snap (both
 * an x-edge and a y-edge landing on their nearest lines at once) falls out
 * naturally rather than needing special-case handling. `guideX`/`guideY`
 * (canvas px, or null when that axis didn't snap) are the full-length line
 * positions to render as live alignment-guide feedback; `x`/`y` are the
 * snapped (or, if that axis didn't snap, unchanged) position to actually move
 * the element to.
 *
 * `otherBoxes` (every other element currently on the canvas, own bounding box,
 * center-anchored) are folded in as extra candidate lines on top of the canvas
 * grid — this is what makes dragging one element near another snap it flush
 * against (or centered on) that neighbor, Illustrator/InDesign-style, not just
 * against row/column lines. Pass `[]` (the default) to snap against the grid alone.
 */
export function snapToAlignmentGuides(
  x: number,
  y: number,
  w: number,
  h: number,
  width: number,
  height: number,
  cols: number,
  rows: number,
  thresholdPx: number,
  otherBoxes: SnapTargetBox[] = [],
): { x: number; y: number; guideX: number | null; guideY: number | null } {
  const rx = nearestAlignmentLine(x, w, width, cols, thresholdPx, boxLinesForAxis(otherBoxes, "x"));
  const ry = nearestAlignmentLine(y, h, height, rows, thresholdPx, boxLinesForAxis(otherBoxes, "y"));
  return { x: rx.pos, y: ry.pos, guideX: rx.guide, guideY: ry.guide };
}
