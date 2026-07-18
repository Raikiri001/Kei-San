export interface AutoLayoutTile {
  /** Center-anchored, true canvas px — matches ImageElement.x/y. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Tiles `n` equal-weight items evenly across a canvasWidth x canvasHeight
 * area — 1 fills the whole canvas, 2 splits in half, and any larger n falls
 * out of one formula (a near-square grid weighted by the canvas's own aspect
 * ratio) instead of a hand-coded layout per count. The last row, if short of
 * a full `cols` items, has its own tiles widened to fill the row evenly
 * rather than leaving a gap — the same "auto-grid" convention photo-collage
 * tools use.
 */
export function computeAutoLayout(n: number, canvasWidth: number, canvasHeight: number): AutoLayoutTile[] {
  if (n <= 0) return [];
  if (n === 1) {
    return [{ x: canvasWidth / 2, y: canvasHeight / 2, w: canvasWidth, h: canvasHeight }];
  }

  const rows = Math.max(1, Math.round(Math.sqrt((n * canvasHeight) / canvasWidth)));
  const cols = Math.ceil(n / rows);
  const rowHeight = canvasHeight / rows;

  const tiles: AutoLayoutTile[] = [];
  let index = 0;
  for (let row = 0; row < rows && index < n; row++) {
    const remaining = n - index;
    const itemsInRow = Math.min(cols, remaining);
    const tileWidth = canvasWidth / itemsInRow;
    const tileY = rowHeight * row + rowHeight / 2;
    for (let col = 0; col < itemsInRow; col++) {
      tiles.push({
        x: tileWidth * col + tileWidth / 2,
        y: tileY,
        w: tileWidth,
        h: rowHeight,
      });
      index++;
    }
  }
  return tiles;
}
