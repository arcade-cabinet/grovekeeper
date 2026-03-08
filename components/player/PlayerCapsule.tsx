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
import { useEffect, useRef } from "react";
import { registerPlayerRigidBody, unregisterPlayerRigidBody } from "@/game/debug/bridgeActions";
import { playerQuery } from "@/game/ecs/world";
import { useJump } from "@/game/hooks/useJump";
import { usePhysicsMovement } from "@/game/hooks/usePhysicsMovement";
import { registerPlayerBody, unregisterPlayerBody } from "@/game/player/teleport";

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

/** World-space spawn position for the player capsule.
 * (3, 3, 3) drops near the Rootmere village edge (avoids landing on buildings). */
const SPAWN_POSITION: [number, number, number] = [3, 3, 3];

export interface PlayerCapsuleProps {
  /** Normalised XZ movement direction from useInput(). Defaults to no movement. */
  moveDirection?: { x: number; z: number };
}

/** Player physics capsule with dynamic RigidBody, WASD velocity, jump, and ECS sync (Spec §9, §23). */
export const PlayerCapsule = ({ moveDirection = { x: 0, z: 0 } }: PlayerCapsuleProps) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  usePhysicsMovement(rigidBodyRef, moveDirection);
  useJump(rigidBodyRef);

  // Register the rigid body handle with the production teleport module
  // so respawn, fast travel, and other systems can teleport the player (Spec §12.5, §17.6).
  useEffect(() => {
    const body = rigidBodyRef.current;
    if (body) registerPlayerBody(body);
    return () => {
      unregisterPlayerBody();
    };
  }, []);

  // Register the rigid body handle with the debug bridge so teleport() works
  // from the browser console and Playwright (Spec §D.1).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const body = rigidBodyRef.current;
    if (body) registerPlayerRigidBody(body);
    return () => {
      unregisterPlayerRigidBody();
    };
  }, []);

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
    <RigidBody ref={rigidBodyRef} type="dynamic" lockRotations position={SPAWN_POSITION}>
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
    </RigidBody>
  );
};
