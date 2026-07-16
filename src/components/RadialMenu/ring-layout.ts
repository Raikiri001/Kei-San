export interface RingPosition {
  x: number;
  y: number;
}

const RING_RADIUS = 84;

// Rings past 3 items get proportionally more radius — a hover-expanded pill
// (label + stepper + input) can reach ~200-220px wide, which comfortably
// overlaps a same-radius neighbor once arc spacing drops much below what 3-4
// evenly-spaced items get. Growing the radius keeps the arc length between
// neighboring pills roughly stable instead of shrinking as items are added.
// (Bumped both the threshold and per-item step again — the previous values
// still left a 4-item ring, e.g. a toggle submenu with back+toggle+mode+size,
// at the un-grown base radius, which is exactly where expanded pills collided.)
const RADIUS_GROW_THRESHOLD = 3;
const RADIUS_STEP_PER_EXTRA_ITEM = 24;

/** Places `count` icons evenly around a ring, starting at 12 o'clock. Radius
 * auto-scales with `count` (see above) unless an explicit radius is passed. */
export function getRingPositions(count: number, radius?: number): RingPosition[] {
  if (count === 0) return [];
  const effectiveRadius = radius ?? RING_RADIUS + Math.max(0, count - RADIUS_GROW_THRESHOLD) * RADIUS_STEP_PER_EXTRA_ITEM;
  const angleStep = 360 / count;
  return Array.from({ length: count }, (_, k) => {
    const angleDeg = k * angleStep - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    return { x: effectiveRadius * Math.cos(angleRad), y: effectiveRadius * Math.sin(angleRad) };
  });
}
