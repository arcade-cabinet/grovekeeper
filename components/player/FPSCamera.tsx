/**
 * FPSCamera — First-person camera attached to the player capsule (Spec §9).
 *
 * Positions the Three.js camera at eye height above the player's ECS position
 * each frame. Look direction (yaw/pitch) is driven by the input system separately.
 * Adds subtle vertical head bob when the player is moving (Spec §9).
 */

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { Vector3 } from "three";
import { playerQuery } from "@/game/ecs/world";
import { useMouseLook } from "@/game/hooks/useMouseLook";
import { inputManager } from "@/game/input/InputManager";
import { computeHeadBob } from "@/game/utils/headBob";

/** Eye height offset above the player's ground-level ECS position in meters (Spec §9). */
export const EYE_HEIGHT = 1.6;

/** Field of view for first-person perspective (degrees). Wider than 3rd-person for immersion. */
const FOV = 65;

/** Default camera position before the player entity exists. */
const DEFAULT_POSITION = new Vector3(0, EYE_HEIGHT, 0);

type Vec3 = { x: number; y: number; z: number };

/**
 * Computes the camera world position from ECS player entities.
 * Returns the first player's position with eyeHeight offset, or defaultPos if no player exists.
 * Exported for unit testing without requiring R3F context (Spec §9).
 */
export function getCameraPosition(
  players: ReadonlyArray<{ position: Vec3 }>,
  eyeHeight: number,
  defaultPos: Vec3,
): Vec3 {
  if (players.length > 0) {
    const pos = players[0].position;
    return { x: pos.x, y: pos.y + eyeHeight, z: pos.z };
  }
  return { x: defaultPos.x, y: defaultPos.y, z: defaultPos.z };
}

/** FPS camera that follows the player capsule at eye height each frame (Spec §9). */
export const FPSCamera = () => {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  useMouseLook();

  useFrame((state) => {
    const cam = cameraRef.current;
    if (!cam) return;

    const { x, y, z } = getCameraPosition(playerQuery.entities, EYE_HEIGHT, DEFAULT_POSITION);

    // Compute movement speed from InputManager for head bob (Spec §9).
    // Use R3F's state.clock for elapsed time (avoids deprecated THREE.Clock import).
    const frame = inputManager.getFrame();
    const speed = Math.sqrt(frame.moveX * frame.moveX + frame.moveZ * frame.moveZ);
    const bobOffset = computeHeadBob(state.clock.elapsedTime, speed);

    cam.position.set(x, y + bobOffset, z);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={FOV}
      near={0.1}
      far={200}
      position={[DEFAULT_POSITION.x, DEFAULT_POSITION.y, DEFAULT_POSITION.z]}
    />
  );
};
