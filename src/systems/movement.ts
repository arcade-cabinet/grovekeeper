import { PLAYER_SPEED } from "@/config/config";
import { koota } from "@/koota";
import { IsPlayer, Position } from "@/traits";

export interface MovementInput {
  x: number; // -1 to 1
  z: number; // -1 to 1
}

/** World bounds for movement clamping. Set by GameScene when WorldManager loads. */
let worldBounds = { minX: 0, minZ: 0, maxX: 12, maxZ: 12 };

/** Update the movement bounds (called when zones load/change). */
export function setMovementBounds(bounds: {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}): void {
  worldBounds = bounds;
}

export const movementSystem = (
  input: MovementInput,
  deltaTime: number,
): void => {
  for (const entity of koota.query(IsPlayer, Position)) {
    const pos = entity.get(Position);
    const nx = Math.max(
      worldBounds.minX,
      Math.min(worldBounds.maxX, pos.x + input.x * PLAYER_SPEED * deltaTime),
    );
    const nz = Math.max(
      worldBounds.minZ,
      Math.min(worldBounds.maxZ, pos.z + input.z * PLAYER_SPEED * deltaTime),
    );
    entity.set(Position, { ...pos, x: nx, z: nz });
  }
};

export const getPlayerPosition = (): { x: number; z: number } | null => {
  const player = koota.queryFirst(IsPlayer, Position);
  if (!player) return null;
  const pos = player.get(Position);
  return { x: pos.x, z: pos.z };
};
