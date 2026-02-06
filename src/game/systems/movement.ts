import { PLAYER_SPEED } from "../constants/config";
import { playerQuery } from "../ecs/world";

export interface MovementInput {
  x: number; // -1 to 1
  z: number; // -1 to 1
}

/** World bounds for movement clamping. Set by GameScene when WorldManager loads. */
let worldBounds = { minX: 0, minZ: 0, maxX: 12, maxZ: 12 };

/** Update the movement bounds (called when zones load/change). */
export function setMovementBounds(bounds: { minX: number; minZ: number; maxX: number; maxZ: number }): void {
  worldBounds = bounds;
}

export const movementSystem = (
  input: MovementInput,
  deltaTime: number
): void => {
  for (const entity of playerQuery) {
    if (!entity.position) continue;

    // Apply movement
    entity.position.x += input.x * PLAYER_SPEED * deltaTime;
    entity.position.z += input.z * PLAYER_SPEED * deltaTime;

    // Clamp to world bounds
    entity.position.x = Math.max(worldBounds.minX, Math.min(worldBounds.maxX - 1, entity.position.x));
    entity.position.z = Math.max(worldBounds.minZ, Math.min(worldBounds.maxZ - 1, entity.position.z));
  }
};

export const getPlayerPosition = (): { x: number; z: number } | null => {
  for (const entity of playerQuery) {
    if (entity.position) {
      return { x: entity.position.x, z: entity.position.z };
    }
  }
  return null;
};
