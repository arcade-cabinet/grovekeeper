/**
 * Fast Travel System -- Campfire network for world traversal.
 *
 * Spec §17.6 (Map & Navigation): campfire network, max 8 points.
 * Campfires are discovered by visiting them; player teleports to selected destination.
 *
 * Pure functions -- all state passed as arguments, no side effects.
 */

export const MAX_FAST_TRAVEL_POINTS = 8;

/** A discovered campfire fast travel point. */
export interface FastTravelPoint {
  id: string;
  label: string;
  worldX: number;
  worldZ: number;
}

export interface DiscoverResult {
  newPoints: FastTravelPoint[];
  /** True if the campfire was newly added (not already known). */
  isNew: boolean;
  /** True if the list is now at max capacity (8 points). */
  isFull: boolean;
}

/**
 * Attempt to discover a campfire fast travel point.
 * - No-ops if already discovered (returns same array ref, isNew:false).
 * - No-ops if already at max capacity (isNew:false, isFull:true).
 * - Otherwise appends and returns new array.
 */
export function discoverCampfire(
  points: FastTravelPoint[],
  point: FastTravelPoint,
): DiscoverResult {
  if (points.some((p) => p.id === point.id)) {
    return { newPoints: points, isNew: false, isFull: points.length >= MAX_FAST_TRAVEL_POINTS };
  }
  if (points.length >= MAX_FAST_TRAVEL_POINTS) {
    return { newPoints: points, isNew: false, isFull: true };
  }
  const newPoints = [...points, point];
  return { newPoints, isNew: true, isFull: newPoints.length >= MAX_FAST_TRAVEL_POINTS };
}

/** Returns true if the given campfire id has been discovered. */
export function isCampfireDiscovered(points: FastTravelPoint[], id: string): boolean {
  return points.some((p) => p.id === id);
}

/** Returns true if more campfire points can be added (below max capacity). */
export function canDiscoverMore(points: FastTravelPoint[]): boolean {
  return points.length < MAX_FAST_TRAVEL_POINTS;
}

/**
 * Returns the world-space teleport target for a discovered campfire,
 * or null if not found.
 */
export function getTeleportTarget(
  points: FastTravelPoint[],
  id: string,
): { x: number; z: number } | null {
  const point = points.find((p) => p.id === id);
  if (!point) return null;
  return { x: point.worldX, z: point.worldZ };
}
