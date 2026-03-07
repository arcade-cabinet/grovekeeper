/**
 * FPSCamera — First-person camera attached to the player capsule (Spec §9).
 *
 * Positions the Three.js camera at eye height above the player's ECS position
 * each frame. Look direction (yaw/pitch) is driven by the input system separately.
 */

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { playerQuery } from "@/game/ecs/world";

/** Eye height offset above the player's ground-level ECS position in meters (Spec §9). */
export const EYE_HEIGHT = 1.6;

/** Field of view for first-person perspective (degrees). Wider than 3rd-person for immersion. */
const FOV = 65;

/** Default camera position before the player entity exists. */
const DEFAULT_POSITION = new THREE.Vector3(0, EYE_HEIGHT, 0);

/** FPS camera that follows the player capsule at eye height each frame (Spec §9). */
export const FPSCamera = () => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(() => {
    const cam = cameraRef.current;
    if (!cam) return;

    const players = playerQuery.entities;
    if (players.length > 0) {
      const pos = players[0].position;
      cam.position.set(pos.x, pos.y + EYE_HEIGHT, pos.z);
    } else {
      cam.position.copy(DEFAULT_POSITION);
    }
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={FOV}
      near={0.1}
      far={100}
      position={[DEFAULT_POSITION.x, DEFAULT_POSITION.y, DEFAULT_POSITION.z]}
    />
  );
};
