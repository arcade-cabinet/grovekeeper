/**
 * Player teleportation -- production-safe rigid body teleport.
 *
 * PlayerCapsule registers its Rapier RigidBody on mount; this module
 * exposes teleportPlayer() for use by game systems (death/respawn,
 * fast travel, etc.) without depending on the debug bridge.
 *
 * Spec §12.5 (respawn at campfire), §17.6 (fast travel).
 */

import type { RapierRigidBody } from "@react-three/rapier";
import { playerQuery } from "@/game/ecs/world";

// ---------------------------------------------------------------------------
// Module-level rigid body handle
// ---------------------------------------------------------------------------

let _rigidBody: RapierRigidBody | null = null;

/** Called by PlayerCapsule on mount to register the physics body. */
export function registerPlayerBody(body: RapierRigidBody): void {
  _rigidBody = body;
}

/** Called by PlayerCapsule on unmount. */
export function unregisterPlayerBody(): void {
  _rigidBody = null;
}

// ---------------------------------------------------------------------------
// Teleport
// ---------------------------------------------------------------------------

/**
 * Teleport the player to world coordinates (x, y, z).
 *
 * Sets the Rapier body position and zeros linear velocity to prevent
 * carry-over momentum. Also syncs the ECS player entity position so
 * systems reading playerQuery see the correct location immediately.
 *
 * Returns true if the teleport succeeded, false if the physics body
 * has not been registered yet (PlayerCapsule not mounted).
 */
export function teleportPlayer(x: number, y: number, z: number): boolean {
  if (!_rigidBody) {
    console.warn("[teleportPlayer] called before PlayerCapsule mounted");
    return false;
  }

  _rigidBody.setTranslation({ x, y, z }, true);
  _rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);

  // Sync ECS player entity immediately so FPSCamera and other systems
  // don't lag one frame behind the physics body.
  const playerEntity = playerQuery.entities[0];
  if (playerEntity?.position) {
    playerEntity.position.x = x;
    playerEntity.position.y = y;
    playerEntity.position.z = z;
  }

  return true;
}
