export interface RingPosition {
  x: number;
  y: number;
}

const RING_RADIUS = 84;

/** Places `count` icons evenly around a ring, starting at 12 o'clock. */
export function getRingPositions(count: number, radius = RING_RADIUS): RingPosition[] {
  if (count === 0) return [];
  const angleStep = 360 / count;
  return Array.from({ length: count }, (_, k) => {
    const angleDeg = k * angleStep - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    return { x: radius * Math.cos(angleRad), y: radius * Math.sin(angleRad) };
  });
}
