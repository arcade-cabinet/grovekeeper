/**
 * useJump — Space key detection, ground raycast, upward impulse (Spec §9).
 *
 * Ground detection casts a ray downward from just below the capsule bottom.
 * An upward impulse is applied when space is pressed and the player is grounded.
 * Gravity is provided automatically by the Rapier Physics world.
 */

import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { RapierRigidBody } from "@react-three/rapier";
import gridConfig from "@/config/game/grid.json" with { type: "json" };

const JUMP_IMPULSE = gridConfig.jumpImpulse;
const GROUND_CHECK_DISTANCE = gridConfig.groundCheckDistance;
// Distance from RigidBody centre to capsule bottom = totalHeight / 2
const CAPSULE_BOTTOM = gridConfig.capsuleHeight / 2;

type RapierWorld = ReturnType<typeof useRapier>["world"];
type RapierModule = ReturnType<typeof useRapier>["rapier"];

/**
 * Returns true if the capsule body is resting on the ground.
 *
 * Casts a ray downward from just outside (below) the capsule bottom.
 * Starting outside the collider avoids self-intersection; solid=true
 * means the ray reports a hit immediately if it starts inside the ground.
 *
 * @param body    The player RigidBody
 * @param world   Rapier world (from useRapier)
 * @param rapier  Rapier module (from useRapier) — provides Ray constructor
 */
export function isGrounded(
  body: RapierRigidBody,
  world: RapierWorld,
  rapier: RapierModule,
): boolean {
  const pos = body.translation();
  // Start ray 0.01m below capsule bottom to avoid self-intersection
  const ray = new rapier.Ray(
    { x: pos.x, y: pos.y - CAPSULE_BOTTOM - 0.01, z: pos.z },
    { x: 0, y: -1, z: 0 },
  );
  return world.castRay(ray, GROUND_CHECK_DISTANCE, true) !== null;
}

/**
 * Each frame: if space was pressed and the player is grounded,
 * apply an upward impulse to the rigid body.
 * Gravity is handled by the Rapier Physics world — no manual Y force needed.
 *
 * @param rigidBodyRef  Ref to the player capsule RigidBody
 */
export function useJump(rigidBodyRef: RefObject<RapierRigidBody | null>): void {
  const { world, rapier } = useRapier();
  const jumpPendingRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") jumpPendingRef.current = true;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useFrame(() => {
    const body = rigidBodyRef.current;
    if (!body || !jumpPendingRef.current) return;
    if (!isGrounded(body, world, rapier)) {
      jumpPendingRef.current = false;
      return;
    }
    jumpPendingRef.current = false;
    body.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true);
  });
}
