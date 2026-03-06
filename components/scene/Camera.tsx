/**
 * Camera — Over-the-shoulder 3rd-person perspective camera.
 *
 * Follows the player entity with smooth lerp tracking.
 * Portrait-first FOV, locked controls (no user rotation/zoom).
 * Ported from BabylonJS CameraManager.ts for R3F.
 */

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { playerQuery } from "@/game/ecs/world";

/** Camera tilt from vertical (radians). ~77deg — over-the-shoulder, looking forward. */
const CAMERA_BETA = 1.35;
/** Camera rotation (radians). Camera from south looking north. */
const CAMERA_ALPHA = -Math.PI / 2;
/** Base distance from target — tight behind the player. */
const BASE_RADIUS = 6;
/** Field of view (degrees). ~55deg for immersive feel, wider for portrait. */
const DEFAULT_FOV = 55;
/** Smooth camera tracking speed. */
const LERP_SPEED = 3;
/** Camera target height — focus on character torso, not ground. */
const TARGET_Y = 1.5;
/** Default player position when no entity exists yet. */
const DEFAULT_TARGET = new THREE.Vector3(5.5, TARGET_Y, 5.5);

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

/** Convert spherical (alpha, beta, radius) to Cartesian offset from target. */
function sphericalOffset(
  alpha: number,
  beta: number,
  radius: number,
): THREE.Vector3 {
  return new THREE.Vector3(
    radius * Math.sin(beta) * Math.cos(alpha),
    radius * Math.cos(beta),
    radius * Math.sin(beta) * Math.sin(alpha),
  );
}

export const Camera = () => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const currentTarget = useRef(DEFAULT_TARGET.clone());
  const { size } = useThree();

  useFrame((_state, delta) => {
    const cam = cameraRef.current;
    if (!cam) return;

    // Adjust radius based on aspect ratio
    const aspect = size.width / size.height;
    let radius = BASE_RADIUS;
    if (aspect > 2.0) {
      radius = BASE_RADIUS * 1.15; // Ultra-wide: pull out
    } else if (aspect < 0.7) {
      radius = BASE_RADIUS * 0.9; // Narrow portrait: push in
    }

    // Read player position from ECS
    const players = playerQuery.entities;
    const desiredTarget = new THREE.Vector3(
      DEFAULT_TARGET.x,
      TARGET_Y,
      DEFAULT_TARGET.z,
    );
    if (players.length > 0) {
      const pos = players[0].position;
      desiredTarget.set(pos.x, TARGET_Y, pos.z);
    }

    // Smooth lerp tracking
    if (prefersReducedMotion) {
      currentTarget.current.copy(desiredTarget);
    } else {
      const factor = Math.min(1, delta * LERP_SPEED);
      currentTarget.current.lerp(desiredTarget, factor);
    }

    // Position camera relative to target using spherical coordinates
    const offset = sphericalOffset(CAMERA_ALPHA, CAMERA_BETA, radius);
    cam.position.copy(currentTarget.current).add(offset);
    cam.lookAt(currentTarget.current);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={DEFAULT_FOV}
      near={0.5}
      far={100}
      position={[
        DEFAULT_TARGET.x +
          sphericalOffset(CAMERA_ALPHA, CAMERA_BETA, BASE_RADIUS).x,
        DEFAULT_TARGET.y +
          sphericalOffset(CAMERA_ALPHA, CAMERA_BETA, BASE_RADIUS).y,
        DEFAULT_TARGET.z +
          sphericalOffset(CAMERA_ALPHA, CAMERA_BETA, BASE_RADIUS).z,
      ]}
    />
  );
};
