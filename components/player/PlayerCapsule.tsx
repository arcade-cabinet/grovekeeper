/**
 * PlayerCapsule — Physics body for the player character (Spec §9).
 *
 * Provides a dynamic RigidBody with a CapsuleCollider matching
 * standard human proportions: 1.8m tall, 0.3m radius.
 * When moveDirection is supplied, applies camera-relative WASD velocity
 * each frame via usePhysicsMovement (Spec §23).
 */

import { useFrame } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import { playerQuery } from "@/game/ecs/world";
import { useJump } from "@/game/hooks/useJump";
import { usePhysicsMovement } from "@/game/hooks/usePhysicsMovement";

/** Total capsule height in meters (Spec §9). */
export const CAPSULE_HEIGHT = 1.8;

/** Capsule collision radius in meters (Spec §9). */
export const CAPSULE_RADIUS = 0.3;

/**
 * Half-height of the cylindrical section only (excludes hemispherical caps).
 * Rapier's CapsuleCollider args are [halfHeight, radius].
 * Total height = 2 * CAPSULE_RADIUS + 2 * CAPSULE_HALF_HEIGHT
 */
export const CAPSULE_HALF_HEIGHT = (CAPSULE_HEIGHT - 2 * CAPSULE_RADIUS) / 2; // 0.6

export interface PlayerCapsuleProps {
  /** Normalised XZ movement direction from useInput(). Defaults to no movement. */
  moveDirection?: { x: number; z: number };
}

/** Player physics capsule with dynamic RigidBody, WASD velocity, jump, and ECS sync (Spec §9, §23). */
export const PlayerCapsule = ({ moveDirection = { x: 0, z: 0 } }: PlayerCapsuleProps) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  usePhysicsMovement(rigidBodyRef, moveDirection);
  useJump(rigidBodyRef);

  // Sync Rapier body translation back to ECS so FPSCamera and all systems tracking
  // playerQuery.entities[0].position receive accurate world-space coordinates (Spec §9).
  useFrame(() => {
    const body = rigidBodyRef.current;
    const playerEntity = playerQuery.entities[0];
    if (!body || !playerEntity) return;
    const translation = body.translation();
    playerEntity.position.x = translation.x;
    playerEntity.position.y = translation.y;
    playerEntity.position.z = translation.z;
  });

  return (
    <RigidBody ref={rigidBodyRef} type="dynamic" lockRotations>
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
    </RigidBody>
  );
};
