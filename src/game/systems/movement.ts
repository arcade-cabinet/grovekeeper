import { GRID_SIZE, PLAYER_SPEED } from "../constants/config";
import { playerQuery } from "../ecs/world";

export interface MovementInput {
  x: number; // -1 to 1
  z: number; // -1 to 1
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

    // Clamp to grid bounds
    entity.position.x = Math.max(0, Math.min(GRID_SIZE - 1, entity.position.x));
    entity.position.z = Math.max(0, Math.min(GRID_SIZE - 1, entity.position.z));
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
