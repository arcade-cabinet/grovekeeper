/**
 * Convert a set of pressed keys to world movement vector.
 *
 * With the over-the-shoulder camera (looking north along +Z):
 *   W = +Z (forward/north, away from camera), S = -Z (back/south)
 *   A = -X (left/west), D = +X (right/east)
 *   Normalize if magnitude > 1 (diagonal movement)
 */
export function keysToWorld(keys: Set<string>): { x: number; z: number } {
  const inputX =
    (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
    (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const inputZ =
    (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
    (keys.has("s") || keys.has("arrowdown") ? 1 : 0);

  if (inputX === 0 && inputZ === 0) return { x: 0, z: 0 };

  let worldX = inputX;
  let worldZ = inputZ;

  // Normalize if diagonal
  const mag = Math.sqrt(worldX * worldX + worldZ * worldZ);
  if (mag > 1) {
    worldX /= mag;
    worldZ /= mag;
  }

  return { x: worldX, z: worldZ };
}

/**
 * @deprecated Use keysToWorld instead. This is kept for backwards compatibility
 * with any tests that reference the old name.
 */
export const keysToIsometric = keysToWorld;
