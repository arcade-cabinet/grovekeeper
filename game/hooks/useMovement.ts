import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import gridConfig from "@/config/game/grid.json" with { type: "json" };

const PLAYER_SPEED = gridConfig.playerSpeed;

export interface MovementBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

const DEFAULT_BOUNDS: MovementBounds = {
  minX: 0,
  minZ: 0,
  maxX: gridConfig.defaultSize,
  maxZ: gridConfig.defaultSize,
};

/**
 * Moves a player group ref each frame based on moveDirection input.
 * Clamps position within world bounds.
 */
export function useMovement(
  playerRef: React.RefObject<THREE.Group | null>,
  moveDirection: { x: number; z: number },
  bounds?: MovementBounds,
) {
  const boundsRef = useRef<MovementBounds>(bounds ?? DEFAULT_BOUNDS);
  boundsRef.current = bounds ?? DEFAULT_BOUNDS;

  useFrame((_state, delta) => {
    const player = playerRef.current;
    if (!player) return;

    const { x, z } = moveDirection;
    if (x === 0 && z === 0) return;

    const b = boundsRef.current;

    player.position.x += x * PLAYER_SPEED * delta;
    player.position.z += z * PLAYER_SPEED * delta;

    // Clamp to world bounds
    player.position.x = Math.max(b.minX, Math.min(b.maxX, player.position.x));
    player.position.z = Math.max(b.minZ, Math.min(b.maxZ, player.position.z));
  });
}
