/**
 * PlayerCapsule — Physics body for the player character (Spec §9).
 *
 * Provides a dynamic RigidBody with a CapsuleCollider matching
 * standard human proportions: 1.8m tall, 0.3m radius.
 */

import { CapsuleCollider, RigidBody } from "@react-three/rapier";

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

/** Player physics capsule with dynamic RigidBody (Spec §9). */
export const PlayerCapsule = () => {
  return (
    <RigidBody type="dynamic">
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
    </RigidBody>
  );
};
