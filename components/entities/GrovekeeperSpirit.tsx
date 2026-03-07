/**
 * GrovekeeperSpirit — renders Grovekeeper spirit orbs in the 3D scene.
 *
 * Navi-style floating emissive orbs found at hedge maze centers.
 * Each spirit is a low-poly IcosahedronGeometry sphere with a unique
 * seeded emissive color. The orb rises from the maze floor on spawn,
 * bobs up/down on a sine wave, pulses its emissive intensity, and
 * trails upward-drifting particles in its wake.
 *
 * Pure functions exported for testing:
 *   - computeBobY(time, hoverHeight, bobAmplitude, bobSpeed, bobPhase)
 *   - computeEmissiveIntensity(base, time, pulseSpeed, pulsePhase)
 *   - computeSpawnY(spawnProgress, baseY, hoverHeight)
 *
 * See GAME_SPEC.md §32.
 */

import { useState, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

import { createRNG, hashString } from "@/game/utils/seedRNG";
import { grovekeeperSpiritsQuery } from "@/game/ecs/world";
import type { GrovekeeperSpiritComponent } from "@/game/ecs/components/procedural/spirits";
import type { Position } from "@/game/ecs/components/core";

// ---------------------------------------------------------------------------
// Animation constants
// ---------------------------------------------------------------------------

/** Number of trail particles per spirit orb. */
const TRAIL_COUNT = 12;
/** Horizontal spread radius for trail particle spawn (world units). */
const TRAIL_SPREAD = 0.2;
/** Upward drift speed for trail particles (world units / second). */
const TRAIL_RISE_SPEED = 0.25;
/** Height above spirit center before a trail particle resets (world units). */
const TRAIL_HEIGHT = 0.55;
/** Duration of spawn rise animation in seconds. */
const SPAWN_DURATION = 2.0;

// ---------------------------------------------------------------------------
// Pure functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Compute the Y world position for a bobbing spirit orb.
 *
 * Formula: y = hoverHeight + bobAmplitude * sin(time * bobSpeed + bobPhase)
 * The bobPhase is seeded per-spirit so orbs desync naturally.
 */
export function computeBobY(
  time: number,
  hoverHeight: number,
  bobAmplitude: number,
  bobSpeed: number,
  bobPhase: number,
): number {
  return hoverHeight + bobAmplitude * Math.sin(time * bobSpeed + bobPhase);
}

/**
 * Compute the pulsing emissive intensity for a spirit orb.
 *
 * Formula: intensity = base + 0.3 * sin(time * pulseSpeed + pulsePhase)
 * Pulse is slightly out of phase with bob for a more organic look.
 */
export function computeEmissiveIntensity(
  base: number,
  time: number,
  pulseSpeed: number,
  pulsePhase: number,
): number {
  return base + 0.3 * Math.sin(time * pulseSpeed + pulsePhase);
}

/**
 * Compute Y position during the spawn rise animation.
 *
 * The spirit rises from the maze floor to its hover height over 2 seconds.
 * Formula: y = baseY + spawnProgress * hoverHeight
 *
 * @param spawnProgress  0–1 lerp value (0 = floor, 1 = full hover height)
 * @param baseY          Ground-level Y world position
 * @param hoverHeight    Final hover height above ground
 */
export function computeSpawnY(
  spawnProgress: number,
  baseY: number,
  hoverHeight: number,
): number {
  return baseY + spawnProgress * hoverHeight;
}

// ---------------------------------------------------------------------------
// SpiritOrb — single spirit sub-component
// ---------------------------------------------------------------------------

interface SpiritOrbProps {
  position: Position;
  spirit: GrovekeeperSpiritComponent;
}

/**
 * Renders and animates a single Grovekeeper spirit orb.
 *
 * Separated so each spirit's useFrame runs independently — no shared update
 * loop. Spawn rise, idle bob, emissive pulse, and trail particles are all
 * driven here.
 *
 * Pulse speed/phase are derived from spiritId via a deterministic hash so
 * they never need to be stored in the ECS component.
 */
const SpiritOrb = ({ position, spirit }: SpiritOrbProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const trailGeoRef = useRef<THREE.BufferGeometry>(null);
  const trailAttrRef = useRef<THREE.BufferAttribute>(null);

  // Stable pulse params derived from spiritId — not stored in ECS component.
  const { pulseSpeed, pulsePhase } = useMemo(() => {
    const rng = createRNG(hashString(`pulse-${spirit.spiritId}`));
    return {
      pulseSpeed: 1.5 + rng() * 1.0, // 1.5–2.5 rad/s
      pulsePhase: rng() * Math.PI * 2,
    };
  }, [spirit.spiritId]);

  // Seeded RNG for trail particle resets — evolves across frames for variety.
  const trailRngRef = useRef<() => number>(
    createRNG(hashString(`trail-reset-${spirit.spiritId}`)),
  );

  // Trail particle world positions — Float32Array mutated in-place each frame.
  const trailPositions = useMemo(() => {
    const rng = createRNG(hashString(`trail-init-${spirit.spiritId}`));
    const pos = new Float32Array(TRAIL_COUNT * 3);
    for (let i = 0; i < TRAIL_COUNT; i++) {
      pos[i * 3] = position.x + (rng() - 0.5) * TRAIL_SPREAD;
      pos[i * 3 + 1] = position.y + rng() * 0.3;
      pos[i * 3 + 2] = position.z + (rng() - 0.5) * TRAIL_SPREAD;
    }
    return pos;
  }, [spirit.spiritId, position.x, position.y, position.z]);

  useFrame(({ clock }, dt) => {
    const time = clock.elapsedTime;

    // Spawn rise — mutate ECS component directly (Miniplex entities are plain
    // objects; field mutation is the intended update pattern).
    if (!spirit.spawned) {
      spirit.spawnProgress = Math.min(1, spirit.spawnProgress + dt / SPAWN_DURATION);
      if (spirit.spawnProgress >= 1) {
        spirit.spawned = true;
      }
    }

    const spawnProgress = spirit.spawnProgress;

    // Y: lerp from floor during spawn, then idle bob once fully risen.
    const targetY = spirit.spawned
      ? computeBobY(
          time,
          position.y + spirit.hoverHeight,
          spirit.bobAmplitude,
          spirit.bobSpeed,
          spirit.bobPhase,
        )
      : computeSpawnY(spawnProgress, position.y, spirit.hoverHeight);

    if (meshRef.current) {
      meshRef.current.position.y = targetY;
    }

    // Emissive intensity fades in with spawnProgress, then pulses.
    if (materialRef.current) {
      const pulseIntensity = computeEmissiveIntensity(
        spirit.emissiveIntensity,
        time,
        pulseSpeed,
        pulsePhase,
      );
      materialRef.current.emissiveIntensity = pulseIntensity * spawnProgress;
    }

    // Trail particles: drift upward and reset below spirit when too high.
    if (trailAttrRef.current) {
      const rng = trailRngRef.current;
      for (let i = 0; i < TRAIL_COUNT; i++) {
        trailPositions[i * 3 + 1] += dt * TRAIL_RISE_SPEED;
        if (trailPositions[i * 3 + 1] > targetY + TRAIL_HEIGHT) {
          trailPositions[i * 3] = position.x + (rng() - 0.5) * TRAIL_SPREAD;
          trailPositions[i * 3 + 1] = targetY - 0.05;
          trailPositions[i * 3 + 2] = position.z + (rng() - 0.5) * TRAIL_SPREAD;
        }
      }
      trailAttrRef.current.needsUpdate = true;
    }
  });

  return (
    <>
      <mesh
        ref={meshRef}
        position={[position.x, position.y, position.z]}
      >
        <icosahedronGeometry args={[spirit.orbRadius, 1]} />
        <meshStandardMaterial
          ref={materialRef}
          color={spirit.emissiveColor}
          emissive={spirit.emissiveColor}
          emissiveIntensity={spirit.emissiveIntensity}
        />
      </mesh>
      <points>
        <bufferGeometry ref={trailGeoRef}>
          <bufferAttribute
            ref={trailAttrRef}
            attach="attributes-position"
            args={[trailPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={spirit.trailColor}
          size={0.04}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </points>
    </>
  );
};

// ---------------------------------------------------------------------------
// Internal type for React state
// ---------------------------------------------------------------------------

interface SpiritEntry {
  id: string;
  position: Position;
  spirit: GrovekeeperSpiritComponent;
}

// ---------------------------------------------------------------------------
// GrovekeeperSpirit — main export
// ---------------------------------------------------------------------------

/**
 * GrovekeeperSpirit renders all ECS Grovekeeper spirit entities in the 3D scene.
 *
 * Reads from grovekeeperSpiritsQuery (Spec §32: grovekeeperSpirit + position).
 * Each spirit is an IcosahedronGeometry orb with its own spawn rise, bob/pulse
 * animation, and trail particles.
 *
 * Max 8 spirits active at once (one per maze, Spec §32.3) — individual SpiritOrb
 * components are appropriate; no InstancedMesh needed.
 *
 * See GAME_SPEC.md §32.
 */
export const GrovekeeperSpirit = () => {
  const [spiritEntries, setSpiritEntries] = useState<SpiritEntry[]>([]);
  const prevCountRef = useRef(-1);

  useFrame(() => {
    const count = grovekeeperSpiritsQuery.entities.length;
    if (count !== prevCountRef.current) {
      prevCountRef.current = count;
      setSpiritEntries(
        grovekeeperSpiritsQuery.entities.map((entity) => ({
          id: entity.id,
          // biome-ignore lint/style/noNonNullAssertion: query requires position
          position: entity.position!,
          // biome-ignore lint/style/noNonNullAssertion: query requires grovekeeperSpirit
          spirit: entity.grovekeeperSpirit!,
        })),
      );
    }
  });

  return (
    <>
      {spiritEntries.map(({ id, position, spirit }) => (
        <SpiritOrb key={id} position={position} spirit={spirit} />
      ))}
    </>
  );
};
