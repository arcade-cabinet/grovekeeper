/**
 * Player — R3F player mesh that reads position from ECS.
 *
 * Renders a simple capsule placeholder and smoothly lerps
 * to match the ECS player entity position each frame.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Color, type Mesh, Vector3 } from "three";

import { playerQuery } from "@/game/ecs/world";

/** Forest green player color. */
const PLAYER_COLOR = new Color("#2D5A27");

/** Lerp speed for smooth position interpolation. */
const LERP_SPEED = 8;

/** Capsule dimensions. */
const CAPSULE_RADIUS = 0.25;
const CAPSULE_LENGTH = 0.6;
const CAP_SEGMENTS = 8;
const RADIAL_SEGMENTS = 12;

/** Y offset so the capsule sits on the ground plane. */
const Y_OFFSET = CAPSULE_LENGTH / 2 + CAPSULE_RADIUS;

const _targetPos = new Vector3();

export const Player = () => {
  const meshRef = useRef<Mesh>(null);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const entities = playerQuery.entities;
    if (entities.length === 0) {
      mesh.visible = false;
      return;
    }

    const entity = entities[0];
    const pos = entity.position;
    const scale = entity.renderable?.scale ?? 1;

    mesh.visible = true;

    _targetPos.set(pos.x, Y_OFFSET * scale, pos.z);

    const lerpFactor = Math.min(1, LERP_SPEED * delta);
    mesh.position.lerp(_targetPos, lerpFactor);
    mesh.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} castShadow>
      <capsuleGeometry args={[CAPSULE_RADIUS, CAPSULE_LENGTH, CAP_SEGMENTS, RADIAL_SEGMENTS]} />
      <meshStandardMaterial color={PLAYER_COLOR} roughness={0.7} metalness={0.1} />
    </mesh>
  );
};
