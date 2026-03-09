/**
 * Procedural decoration primitives for the hedge maze center reward area.
 *
 * All geometry is Three.js primitives — no GLB files. These components are
 * intentionally thin presentational wrappers over R3F JSX geometry.
 *
 * Spec §42 — Procedural Architecture (hedge maze subsystem).
 */

import hedgeMazeConfig from "@/config/game/hedgeMaze.json" with { type: "json" };
import { createRNG, hashString } from "@/game/utils/seedRNG";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CELL_SCALE: number = hedgeMazeConfig.cellScale;

// ---------------------------------------------------------------------------
// Fountain
// ---------------------------------------------------------------------------

interface FountainProps {
  x: number;
  z: number;
}

/**
 * Fountain at maze center: wide stone basin cylinder + translucent water sphere.
 */
export const Fountain = ({ x, z }: FountainProps) => (
  <group position={[x, 0, z]}>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[CELL_SCALE * 0.6, CELL_SCALE * 0.7, 0.4, 16]} />
      <meshStandardMaterial color={0x888888} roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.7, 0]}>
      <sphereGeometry args={[CELL_SCALE * 0.25, 10, 10]} />
      <meshStandardMaterial color={0x3399cc} roughness={0.1} metalness={0.3} />
    </mesh>
  </group>
);

// ---------------------------------------------------------------------------
// Bench
// ---------------------------------------------------------------------------

export interface BenchProps {
  x: number;
  z: number;
  rotY: number;
}

/** A simple bench: seat box + two leg boxes. */
export const Bench = ({ x, z, rotY }: BenchProps) => (
  <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
    <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.2, 0.1, 0.4]} />
      <meshStandardMaterial color={0x8b5e3c} roughness={0.8} />
    </mesh>
    <mesh position={[-0.5, 0.15, 0]} castShadow>
      <boxGeometry args={[0.1, 0.3, 0.4]} />
      <meshStandardMaterial color={0x7a5533} roughness={0.8} />
    </mesh>
    <mesh position={[0.5, 0.15, 0]} castShadow>
      <boxGeometry args={[0.1, 0.3, 0.4]} />
      <meshStandardMaterial color={0x7a5533} roughness={0.8} />
    </mesh>
  </group>
);

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

export interface ColumnProps {
  x: number;
  z: number;
}

/** Stone column: tall cylinder with a capped top. */
export const Column = ({ x, z }: ColumnProps) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, CELL_SCALE * 0.75, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.25, 0.3, CELL_SCALE * 1.5, 8]} />
      <meshStandardMaterial color={0x999988} roughness={0.85} />
    </mesh>
    <mesh position={[0, CELL_SCALE * 1.55, 0]}>
      <cylinderGeometry args={[0.35, 0.25, 0.2, 8]} />
      <meshStandardMaterial color={0xaaaaaa} roughness={0.8} />
    </mesh>
  </group>
);

// ---------------------------------------------------------------------------
// Flower
// ---------------------------------------------------------------------------

export interface FlowerProps {
  x: number;
  z: number;
  colorHex: number;
}

/** A small coloured sphere representing a flower cluster. */
export const Flower = ({ x, z, colorHex }: FlowerProps) => (
  <mesh position={[x, 0.3, z]}>
    <sphereGeometry args={[0.25, 7, 7]} />
    <meshStandardMaterial color={colorHex} roughness={0.6} />
  </mesh>
);

// ---------------------------------------------------------------------------
// Flower colour palette
// ---------------------------------------------------------------------------

const FLOWER_COLORS = [0xff6688, 0xffcc44, 0xcc44ff, 0x44ccff, 0xff8833, 0xffffff, 0xffaacc];

/**
 * Pick a seeded flower colour from the palette.
 * @param seed - deterministic seed (e.g. entity count)
 */
export function pickFlowerColor(seed: number): number {
  const rng = createRNG(hashString(`flower-color-${seed}`));
  return FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)];
}
