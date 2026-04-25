/**
 * Grove glow — Wave 10 visual layer.
 *
 * Two visual effects that together announce a grove chunk diegetically:
 *
 *   1. **Emissive pulse** (`applyGroveEmissivePulse`) — walks the
 *      Three.js subtree of a chunk's mesh group and overrides each
 *      `MeshStandardMaterial`/`MeshLambertMaterial` so it carries an
 *      emissive color and a non-zero intensity. The intensity is
 *      driven per-frame by `updateGroveEmissivePulse(t)` with a sine
 *      wave (period ~3 seconds), giving a slow, breathing glow.
 *
 *      Approach (a) from the spec: we override the existing material
 *      rather than slot in a custom shader pass. This works because
 *      `@jolly-pixel/voxel.renderer` exposes its meshes as plain THREE
 *      objects in the scene, and the renderer doesn't care if we mutate
 *      the material's emissive properties. Cheap, no extra draw calls,
 *      and the per-frame cost is one `material.emissiveIntensity = ...`
 *      assignment per unique material in the chunk (typically ≤6).
 *
 *   2. **Firefly particles** (`createGroveFireflies`) — a `THREE.Points`
 *      field of ~30 small golden specks drifting above the surface
 *      with a deterministic seed. One Points geometry per grove chunk;
 *      one draw call per chunk; vertex color buffer is static. Each
 *      frame `updateGroveFireflies(t)` perturbs the y coordinate with a
 *      cheap sine on the GPU-attached attribute (CPU-side update; ~30
 *      floats — negligible).
 *
 * The whole module is intentionally framework-agnostic: callers (a
 * future `ChunkActor` or the existing `SingleChunkActor`) hand it a
 * `THREE.Object3D` and a chunk coord, and it does the rest.
 */

import * as THREE from "three";
import { scopedRNG } from "@/shared/utils/seedRNG";

/**
 * Emissive color for grove materials — soft white-gold luminance per
 * the spec ("the contrast with surrounding wilderness biomes IS the
 * diegetic announcement of safety"). Tuned warm enough to pop against
 * the green/blue palettes of meadow/forest/coast.
 */
export const GROVE_EMISSIVE_COLOR = new THREE.Color("#fff4c8");

/** Base (unmodulated) emissive intensity. */
export const GROVE_EMISSIVE_BASE = 0.35;
/** Pulse amplitude — peak intensity = base + amplitude. */
export const GROVE_EMISSIVE_AMPLITUDE = 0.15;
/** Pulse period in seconds. ~3s reads as a slow, peaceful breath. */
export const GROVE_EMISSIVE_PERIOD_SECONDS = 3.0;

/** Number of firefly points per grove chunk. */
export const GROVE_FIREFLY_COUNT = 30;
/** Hover height range above the chunk surface, in world units. */
const FIREFLY_HOVER_MIN = 0.5;
const FIREFLY_HOVER_MAX = 2.5;
/** Per-firefly bob amplitude in world units. */
const FIREFLY_BOB_AMP = 0.15;

/**
 * Material types we know how to mutate. `MeshLambertMaterial` is what
 * `SingleChunkActor` configures the voxel renderer with, but we
 * accept the standard sibling too in case a future renderer swap
 * upgrades materials.
 */
type EmissiveCapableMaterial =
  | THREE.MeshStandardMaterial
  | THREE.MeshLambertMaterial;

function isEmissiveCapable(
  material: THREE.Material,
): material is EmissiveCapableMaterial {
  return (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshLambertMaterial
  );
}

/**
 * Tracks the materials we've patched for a given chunk so the
 * per-frame updater doesn't have to re-traverse the scene graph.
 *
 * The tuple is `[material, baseEmissive]`. `baseEmissive` is the
 * material's original emissive color (almost always black), preserved
 * so `disposeGroveGlow` can put it back.
 */
export interface GroveGlowHandle {
  readonly materials: ReadonlyArray<EmissiveCapableMaterial>;
  readonly fireflies: THREE.Points | null;
  /** Per-firefly base Y values used by the bob animation. */
  readonly fireflyBaseY: ReadonlyArray<number>;
  /** Per-firefly phase offset so they don't all bob in unison. */
  readonly fireflyPhase: ReadonlyArray<number>;
  /** Captured original emissive colors so we can restore on dispose. */
  readonly originalEmissive: ReadonlyArray<THREE.Color>;
}

/**
 * Walk the chunk's Object3D subtree and override emissive properties
 * on every `MeshStandardMaterial`/`MeshLambertMaterial` we find. Idempotent:
 * calling twice on the same root simply re-assigns the same color
 * (the captured `originalEmissive` from the first call still holds).
 *
 * @param root - The chunk's root Object3D from the voxel renderer.
 * @returns A handle the per-frame updater and dispose path use.
 */
export function applyGroveEmissivePulse(root: THREE.Object3D): {
  materials: EmissiveCapableMaterial[];
  originalEmissive: THREE.Color[];
} {
  const materials: EmissiveCapableMaterial[] = [];
  const originalEmissive: THREE.Color[] = [];
  const seen = new Set<THREE.Material>();

  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (seen.has(mat)) continue;
      seen.add(mat);
      if (!isEmissiveCapable(mat)) continue;
      originalEmissive.push(mat.emissive.clone());
      mat.emissive = GROVE_EMISSIVE_COLOR.clone();
      mat.emissiveIntensity = GROVE_EMISSIVE_BASE;
      mat.needsUpdate = true;
      materials.push(mat);
    }
  });

  return { materials, originalEmissive };
}

/**
 * Per-frame updater. Computes a sine-wave intensity in
 * `[base - amp, base + amp]` and assigns it to every patched
 * material. `tSeconds` is wall-clock time (or runtime time —
 * whatever monotonically increases).
 */
export function updateGroveEmissivePulse(
  materials: ReadonlyArray<EmissiveCapableMaterial>,
  tSeconds: number,
): void {
  const omega = (2 * Math.PI) / GROVE_EMISSIVE_PERIOD_SECONDS;
  const intensity =
    GROVE_EMISSIVE_BASE + GROVE_EMISSIVE_AMPLITUDE * Math.sin(tSeconds * omega);
  for (const mat of materials) {
    mat.emissiveIntensity = intensity;
  }
}

/**
 * Build a deterministic firefly point cloud for a grove chunk.
 *
 * Coordinates are LOCAL to the chunk root (0..chunkSize on X/Z).
 * Caller is responsible for adding the returned `Points` to the
 * chunk's Object3D so it inherits the chunk's world transform.
 *
 * @param chunkSize  - Chunk extent in voxels (matches CHUNK_TUNING.size).
 * @param surfaceY   - Y coordinate of the chunk's top surface in
 *                     world units (== chunk's groundY + 1).
 * @param worldSeed  - World seed for deterministic placement.
 * @param chunkX     - Chunk grid X (used as RNG key).
 * @param chunkZ     - Chunk grid Z (used as RNG key).
 */
export function createGroveFireflies(opts: {
  chunkSize: number;
  surfaceY: number;
  worldSeed: number;
  chunkX: number;
  chunkZ: number;
}): {
  points: THREE.Points;
  baseY: number[];
  phase: number[];
} {
  const { chunkSize, surfaceY, worldSeed, chunkX, chunkZ } = opts;
  const rng = scopedRNG("grove-fireflies", worldSeed, chunkX, chunkZ);

  const positions = new Float32Array(GROVE_FIREFLY_COUNT * 3);
  const baseY: number[] = [];
  const phase: number[] = [];

  for (let i = 0; i < GROVE_FIREFLY_COUNT; i++) {
    const x = rng() * chunkSize;
    const z = rng() * chunkSize;
    const hover =
      FIREFLY_HOVER_MIN + rng() * (FIREFLY_HOVER_MAX - FIREFLY_HOVER_MIN);
    const y = surfaceY + hover;
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    baseY.push(y);
    phase.push(rng() * Math.PI * 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xfff0a0,
    size: 0.12,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    // Additive blending makes the fireflies glow cleanly against the
    // emissive ground without darkening it.
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.name = "grove-fireflies";
  points.frustumCulled = false; // chunk-scoped; cheap; avoid pop-out edge cases.

  return { points, baseY, phase };
}

/**
 * Per-frame firefly bob. Cheap CPU pass — `GROVE_FIREFLY_COUNT * 3`
 * floats per chunk per frame. With ≤9 active grove chunks at typical
 * stream radii, that's <1KB/frame of writes. Negligible.
 */
export function updateGroveFireflies(
  points: THREE.Points,
  baseY: ReadonlyArray<number>,
  phase: ReadonlyArray<number>,
  tSeconds: number,
): void {
  const attr = points.geometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  // Period ~2 seconds.
  const omega = (2 * Math.PI) / 2;
  for (let i = 0; i < baseY.length; i++) {
    arr[i * 3 + 1] =
      baseY[i] + FIREFLY_BOB_AMP * Math.sin(tSeconds * omega + (phase[i] ?? 0));
  }
  attr.needsUpdate = true;
}

/**
 * Restore patched materials and dispose firefly buffers. Safe to call
 * multiple times.
 */
export function disposeGroveGlow(handle: GroveGlowHandle): void {
  for (let i = 0; i < handle.materials.length; i++) {
    const mat = handle.materials[i];
    const orig = handle.originalEmissive[i];
    if (mat && orig) {
      mat.emissive = orig;
      mat.emissiveIntensity = 1;
      mat.needsUpdate = true;
    }
  }
  if (handle.fireflies) {
    handle.fireflies.geometry.dispose();
    const m = handle.fireflies.material;
    if (Array.isArray(m)) {
      for (const sub of m) sub.dispose();
    } else {
      m.dispose();
    }
    handle.fireflies.parent?.remove(handle.fireflies);
  }
}
