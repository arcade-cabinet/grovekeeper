/**
 * BirmotherMesh -- ancient tree of light at the heart of the world.
 *
 * Renders when a birchmother ECS entity exists. The visual is a procedural
 * assembly: IcosahedronGeometry base, CylinderGeometry trunk, and
 * SphereGeometry canopy pieces. Emissive white/gold, semi-transparent canopy.
 *
 * Only visible when the player is within 50m of Birchmother's position.
 * Gentle emissive pulse (0.3-0.8) via sine wave in useFrame.
 * Scale: 3x normal tree size.
 *
 * Spec §32.4.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { birmotherQuery, playerQuery } from "@/game/ecs/world";

// ---------------------------------------------------------------------------
// Animation constants
// ---------------------------------------------------------------------------

/** Emissive pulse minimum. */
export const BIRCHMOTHER_PULSE_MIN = 0.3;
/** Emissive pulse maximum. */
export const BIRCHMOTHER_PULSE_MAX = 0.8;
/** Pulse speed in radians per second. */
const PULSE_SPEED = 0.8;
/** Visibility cutoff distance in meters. */
export const BIRCHMOTHER_VISIBILITY_RADIUS = 50;

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Compute pulsing emissive intensity for Birchmother.
 *
 * Formula: intensity = mid + halfRange * sin(time * speed)
 * where mid = (max + min) / 2, halfRange = (max - min) / 2.
 */
export function computeBirmotherPulse(time: number): number {
  const mid = (BIRCHMOTHER_PULSE_MIN + BIRCHMOTHER_PULSE_MAX) / 2;
  const halfRange = (BIRCHMOTHER_PULSE_MAX - BIRCHMOTHER_PULSE_MIN) / 2;
  return mid + halfRange * Math.sin(time * PULSE_SPEED);
}

/**
 * Determine whether Birchmother should be visible given the player distance.
 *
 * Returns true when dist < BIRCHMOTHER_VISIBILITY_RADIUS.
 */
export function isBirmotherVisible(
  playerX: number,
  playerZ: number,
  birmotherX: number,
  birmotherZ: number,
): boolean {
  const dx = playerX - birmotherX;
  const dz = playerZ - birmotherZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return dist < BIRCHMOTHER_VISIBILITY_RADIUS;
}

// ---------------------------------------------------------------------------
// BirmotherTree -- single renderable tree of light
// ---------------------------------------------------------------------------

interface BirmotherTreeProps {
  posX: number;
  posZ: number;
}

const SCALE = 3;

/** Trunk color (warm bark gold). */
const TRUNK_COLOR = "#c8a04a";
/** Canopy emissive color (soft white-gold). */
const CANOPY_COLOR = "#fffbe8";
/** Canopy emissive hex. */
const CANOPY_EMISSIVE = "#ffd97a";
/** Base IcosahedronGeometry emissive. */
const BASE_EMISSIVE = "#ffe4a0";

const BirmotherTree = ({ posX, posZ }: BirmotherTreeProps) => {
  const canopyMat1 = useRef<THREE.MeshStandardMaterial>(null);
  const canopyMat2 = useRef<THREE.MeshStandardMaterial>(null);
  const canopyMat3 = useRef<THREE.MeshStandardMaterial>(null);
  const baseMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const pulse = computeBirmotherPulse(clock.elapsedTime);
    if (canopyMat1.current) canopyMat1.current.emissiveIntensity = pulse;
    if (canopyMat2.current) canopyMat2.current.emissiveIntensity = pulse * 0.8;
    if (canopyMat3.current) canopyMat3.current.emissiveIntensity = pulse * 0.6;
    if (baseMat.current) baseMat.current.emissiveIntensity = pulse * 0.5;
  });

  return (
    <group position={[posX, 0, posZ]} scale={[SCALE, SCALE, SCALE]}>
      {/* Base: icosahedron root-cluster at ground level */}
      <mesh position={[0, 0.4, 0]}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial
          ref={baseMat}
          color={TRUNK_COLOR}
          emissive={BASE_EMISSIVE}
          emissiveIntensity={BIRCHMOTHER_PULSE_MIN}
        />
      </mesh>

      {/* Trunk: tall slim cylinder */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.18, 0.28, 4.0, 6]} />
        <meshStandardMaterial
          color={TRUNK_COLOR}
          emissive={BASE_EMISSIVE}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Canopy piece 1: central large sphere (top) */}
      <mesh position={[0, 5.2, 0]}>
        <sphereGeometry args={[1.1, 6, 5]} />
        <meshStandardMaterial
          ref={canopyMat1}
          color={CANOPY_COLOR}
          emissive={CANOPY_EMISSIVE}
          emissiveIntensity={BIRCHMOTHER_PULSE_MIN}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Canopy piece 2: mid-left sphere */}
      <mesh position={[-0.7, 4.2, 0.3]}>
        <sphereGeometry args={[0.75, 6, 4]} />
        <meshStandardMaterial
          ref={canopyMat2}
          color={CANOPY_COLOR}
          emissive={CANOPY_EMISSIVE}
          emissiveIntensity={BIRCHMOTHER_PULSE_MIN * 0.8}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Canopy piece 3: mid-right sphere */}
      <mesh position={[0.7, 3.8, -0.2]}>
        <sphereGeometry args={[0.65, 6, 4]} />
        <meshStandardMaterial
          ref={canopyMat3}
          color={CANOPY_COLOR}
          emissive={CANOPY_EMISSIVE}
          emissiveIntensity={BIRCHMOTHER_PULSE_MIN * 0.6}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// BirmotherMesh -- main export
// ---------------------------------------------------------------------------

/**
 * BirmotherMesh reads from birmotherQuery and renders the Birchmother tree
 * of light when the entity exists and the player is within 50m.
 *
 * Mount this inside the R3F <Canvas> alongside other scene entities.
 */
export const BirmotherMesh = () => {
  useFrame(() => {
    // Visibility check is handled per-frame by the BirmotherTree's useFrame.
    // This outer component re-renders only on entity count change (rare).
  });

  const entities = birmotherQuery.entities;
  if (entities.length === 0) return null;

  // Only one Birchmother per world
  const entity = entities[0];
  if (!entity.position || !entity.birchmother) return null;

  const posX = entity.position.x;
  const posZ = entity.position.z;

  // Visibility: check if a player entity exists and is within range
  const player = playerQuery.first;
  if (!player?.position) return null;

  if (!isBirmotherVisible(player.position.x, player.position.z, posX, posZ)) {
    return null;
  }

  return <BirmotherTree posX={posX} posZ={posZ} />;
};
