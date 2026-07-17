export interface RingPosition {
  x: number;
  y: number;
}

const RING_RADIUS = 62;

// Rings past 3 items get proportionally more radius — a hover-expanded pill
// (label + stepper + input) can reach ~200-240px wide (now measured from real
// content rather than a fixed bucket, so a two-field pill like "Width &
// Height" can land closer to 400px), which comfortably overlaps a same-radius
// neighbor once arc spacing drops much below what 3-4 evenly-spaced items
// get. Growing the radius keeps the arc length between neighboring pills
// roughly stable instead of shrinking as items are added.
// (Bumped the per-item step again — the text ring alone grew to 9 items once
// Width/Height + Reset Size were added, and the previous step still let the
// ~400px-wide dimensions pill visually overlap its Reset Size neighbor.)
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
