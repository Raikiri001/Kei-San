export interface GridNode {
  x: number;
  y: number;
}

/** Uniform grid over [0,width] x [0,height] with `cols` x `rows` cells, edges included as nodes. */
export function getCellSize(width: number, height: number, cols: number, rows: number) {
  return { cellWidth: width / cols, cellHeight: height / rows };
}

export function getGridNodes(width: number, height: number, cols: number, rows: number): GridNode[] {
  const { cellWidth, cellHeight } = getCellSize(width, height, cols, rows);
  const nodes: GridNode[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      nodes.push({ x: i * cellWidth, y: j * cellHeight });
    }
  }
  return nodes;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Snaps a proposed center point (true canvas px) to the nearest grid intersection, O(1). */
export function snapToNearestNode(
  x: number,
  y: number,
  width: number,
  height: number,
  cols: number,
  rows: number,
): GridNode {
  const { cellWidth, cellHeight } = getCellSize(width, height, cols, rows);
  const i = clamp(Math.round(x / cellWidth), 0, cols);
  const j = clamp(Math.round(y / cellHeight), 0, rows);
  return { x: i * cellWidth, y: j * cellHeight };
}
