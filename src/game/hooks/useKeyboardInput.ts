/**
 * Convert a set of pressed keys to isometric world movement vector.
 *
 * Spec S13 WASD -> Isometric:
 *   inputX = (D ? 1 : 0) - (A ? 1 : 0)
 *   inputY = (W ? 1 : 0) - (S ? 1 : 0)
 *   worldX = inputX - inputY
 *   worldZ = -(inputX + inputY)
 *   Normalize if magnitude > 1
 */
export function keysToIsometric(keys: Set<string>): { x: number; z: number } {
  const inputX =
    (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
    (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const inputY =
    (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
    (keys.has("s") || keys.has("arrowdown") ? 1 : 0);

  if (inputX === 0 && inputY === 0) return { x: 0, z: 0 };

  let worldX = inputX - inputY;
  let worldZ = -(inputX + inputY);

  // Normalize if diagonal
  const mag = Math.sqrt(worldX * worldX + worldZ * worldZ);
  if (mag > 1) {
    worldX /= mag;
    worldZ /= mag;
  }

  return { x: worldX, z: worldZ };
}
