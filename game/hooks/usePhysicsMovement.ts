/**
 * usePhysicsMovement — Apply WASD velocity to a Rapier RigidBody
 * relative to camera yaw each frame (Spec §23).
 *
 * Movement is camera-relative: forward (W) moves along the camera's
 * look direction projected onto the XZ plane, strafe (A/D) along its
 * perpendicular. Y velocity is preserved so gravity/jumping work normally.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import gridConfig from "@/config/game/grid.json" with { type: "json" };

const PLAYER_SPEED = gridConfig.playerSpeed;

/**
 * Rotate a 2D input direction by camera yaw to get world-space XZ velocity.
 *
 * Derivation:
 *   camera forward = (-sin(yaw), 0, -cos(yaw))
 *   camera right   = ( cos(yaw), 0, -sin(yaw))
 *   world vel = input.z * forward + input.x * right
 *
 * @param input  Normalised XZ input from keysToWorld (z=1 → W pressed, x=1 → D pressed)
 * @param yaw    Camera yaw in radians (extracted via Math.atan2(-dir.x, -dir.z))
 */
export function rotateByYaw(
  input: { x: number; z: number },
  yaw: number,
): { x: number; z: number } {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    x: input.x * cos - input.z * sin,
    z: -input.x * sin - input.z * cos,
  };
}

const _dir = new THREE.Vector3();

/**
 * Each frame, reads camera yaw and applies horizontal linvel to the
 * given RigidBody proportional to moveDirection and PLAYER_SPEED.
 * Vertical velocity (Y) is preserved to allow gravity to act normally.
 *
 * @param rigidBodyRef  Ref to the Rapier RigidBody API from <RigidBody ref={...}>
 * @param moveDirection Normalised XZ input from useInput() / keysToWorld()
 */
export function usePhysicsMovement(
  rigidBodyRef: RefObject<RapierRigidBody | null>,
  moveDirection: { x: number; z: number },
): void {
  const moveRef = useRef(moveDirection);
  moveRef.current = moveDirection;

  useFrame(({ camera }) => {
    const body = rigidBodyRef.current;
    if (!body) return;

    const currentLinvel = body.linvel();
    const { x: inputX, z: inputZ } = moveRef.current;

    if (inputX === 0 && inputZ === 0) {
      body.setLinvel({ x: 0, y: currentLinvel.y, z: 0 }, true);
      return;
    }

    camera.getWorldDirection(_dir);
    _dir.y = 0;
    const yaw = Math.atan2(-_dir.x, -_dir.z);

    const worldDir = rotateByYaw({ x: inputX, z: inputZ }, yaw);
    body.setLinvel(
      {
        x: worldDir.x * PLAYER_SPEED,
        y: currentLinvel.y,
        z: worldDir.z * PLAYER_SPEED,
      },
      true,
    );
  });
}
