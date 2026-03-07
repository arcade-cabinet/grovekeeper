/**
 * GrovekeeperSpirit — renders Grovekeeper spirit orbs in the 3D scene.
 *
 * Navi-style floating emissive orbs found at hedge maze centers.
 * Each spirit is a low-poly IcosahedronGeometry sphere with a unique
 * seeded emissive color. The orb bobs up/down on a sine wave and pulses
 * its emissive intensity out of phase with the bob.
 *
 * Pure functions exported for testing:
 *   - computeBobY(time, hoverHeight, bobAmplitude, bobSpeed, bobPhase)
 *   - computeEmissiveIntensity(base, time, pulseSpeed, pulsePhase)
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
 * Separate sub-component so useFrame is isolated per orb — each spirit
 * animates independently without coordinating through a shared update loop.
 *
 * Pulse speed/phase are derived from spiritId via a stable hash (not stored
 * in the ECS component) — same result every render, no extra state needed.
 */
const SpiritOrb = ({ position, spirit }: SpiritOrbProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Derive stable pulse params from spiritId (not stored in ECS component).
  // createRNG(hashString(...)) is deterministic — same spiritId → same params.
  const { pulseSpeed, pulsePhase } = useMemo(() => {
    const rng = createRNG(hashString(`pulse-${spirit.spiritId}`));
    return {
      pulseSpeed: 1.5 + rng() * 1.0, // 1.5–2.5 rad/s
      pulsePhase: rng() * Math.PI * 2,
    };
  }, [spirit.spiritId]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    if (meshRef.current) {
      meshRef.current.position.y = computeBobY(
        time,
        position.y + spirit.hoverHeight,
        spirit.bobAmplitude,
        spirit.bobSpeed,
        spirit.bobPhase,
      );
    }

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = computeEmissiveIntensity(
        spirit.emissiveIntensity,
        time,
        pulseSpeed,
        pulsePhase,
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y + spirit.hoverHeight, position.z]}
    >
      <icosahedronGeometry args={[spirit.orbRadius, 1]} />
      <meshStandardMaterial
        ref={materialRef}
        color={spirit.emissiveColor}
        emissive={spirit.emissiveColor}
        emissiveIntensity={spirit.emissiveIntensity}
      />
    </mesh>
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
 * Each spirit is an IcosahedronGeometry orb with its own bob/pulse animation.
 * The ECS entity's emissiveColor is pre-seeded at spawn time via resolveEmissiveColor.
 *
 * Max 8 spirits active at once (one per maze, Spec §32.3) — individual SpiritOrb
 * components are appropriate here; no InstancedMesh needed.
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
