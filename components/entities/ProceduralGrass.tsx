/**
 * ProceduralGrass — renders all ECS grass entities as a single InstancedMesh.
 *
 * No GLB loading. Each grass blade is a thin double-sided PlaneGeometry quad.
 * All instances share one draw call — keeps GPU overhead minimal even across
 * thousands of blades (Spec §3.2, §8).
 *
 * Pure functions re-exported for testing (same signatures as GrassInstances.tsx):
 *   - computeGrassInstanceTransforms
 *   - GRASS_SCATTER_RADIUS (re-exported const)
 *
 * See GAME_SPEC.md §8.
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Color, type InstancedMesh, Matrix4, PlaneGeometry, Quaternion, Vector3 } from "three";
import vegetationConfig from "@/config/game/vegetation.json" with { type: "json" };
import { grassQuery } from "@/game/ecs/world";
import { createRNG, hashString } from "@/game/utils/seedRNG";

// ---------------------------------------------------------------------------
// Constants (loaded from config — no inline magic numbers)
// ---------------------------------------------------------------------------

/** Scatter radius for grass instances around their entity position (Spec §8). */
export const GRASS_SCATTER_RADIUS: number = vegetationConfig.grassScatterRadius;

/** Maximum number of instances allocated for the InstancedMesh. */
const MAX_GRASS_INSTANCES = 4096;

// ---------------------------------------------------------------------------
// Blade geometry (module-scope — created once)
// ---------------------------------------------------------------------------

/** Thin vertical plane — each instance represents one grass blade. */
const BLADE_GEOMETRY = new PlaneGeometry(0.1, 0.4);

// ---------------------------------------------------------------------------
// Per-instance color variation helpers
// ---------------------------------------------------------------------------

/** Base green for grass blades. */
const BASE_COLOR = new Color("#1e4c1e");
/** Lighter tint ceiling for variation. */
const LIGHT_COLOR = new Color("#3a7a2a");
/** Reusable Color for computing per-instance tints without heap allocation. */
const _tmpColor = new Color();

// ---------------------------------------------------------------------------
// Module-scope temp objects (reused per frame — avoids per-frame heap alloc)
// ---------------------------------------------------------------------------

const _pos = new Vector3();
const _quat = new Quaternion();
const _scale = new Vector3(1, 1, 1);
const _matrix = new Matrix4();
const _yAxis = new Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
// Pure functions (exported for testing — identical signatures to GrassInstances)
// ---------------------------------------------------------------------------

/** Per-instance transform data: position offset + Y rotation. */
export interface GrassInstanceTransform {
  /** X offset from entity world position. */
  dx: number;
  /** Z offset from entity world position. */
  dz: number;
  /** Y rotation in radians [0, 2π). */
  rotY: number;
}

/**
 * Compute per-instance transforms for a grass entity.
 *
 * Uses seeded RNG keyed to entityId — identical entityId + density always
 * produces identical output, matching the world seed system (Spec §3.2).
 * Each instance is scattered within GRASS_SCATTER_RADIUS of the entity position.
 */
export function computeGrassInstanceTransforms(
  entityId: string,
  density: number,
): GrassInstanceTransform[] {
  const rng = createRNG(hashString(`grass-instances-${entityId}`));
  const transforms: GrassInstanceTransform[] = [];

  for (let i = 0; i < density; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * GRASS_SCATTER_RADIUS;
    const rotY = rng() * Math.PI * 2;
    transforms.push({
      dx: Math.cos(angle) * dist,
      dz: Math.sin(angle) * dist,
      rotY,
    });
  }

  return transforms;
}

// ---------------------------------------------------------------------------
// Internal: compute the total number of grass instances needed this frame
// ---------------------------------------------------------------------------

function countTotalInstances(): number {
  let total = 0;
  for (const entity of grassQuery.entities) {
    total += entity.grass.density;
  }
  return total;
}

// ---------------------------------------------------------------------------
// GrassBlades — InstancedMesh updated each frame
// ---------------------------------------------------------------------------

interface GrassBladesProps {
  /** Pre-allocated capacity (>= actual instance count). */
  capacity: number;
}

/**
 * Renders all grass entity instances as a single InstancedMesh.
 *
 * Matrices are updated imperatively in useFrame — zero React re-renders per
 * frame. mesh.count is clamped to the actual active count each frame so stale
 * instances outside the active range are never drawn.
 */
const GrassBlades = ({ capacity }: GrassBladesProps) => {
  const meshRef = useRef<InstancedMesh>(null);

  // Seed-stable color RNG keyed on entity id is computed once per entity in
  // the useFrame loop below; the Color is lerped between BASE and LIGHT.
  const colorRngCache = useRef<Map<string, number>>(new Map());

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let idx = 0;

    for (const entity of grassQuery.entities) {
      const { position, grass, id } = entity;
      const transforms = computeGrassInstanceTransforms(id, grass.density);

      // Per-entity color tint — stable via cached seed
      let colorSeed = colorRngCache.current.get(id);
      if (colorSeed === undefined) {
        colorSeed = hashString(`grass-color-${id}`);
        colorRngCache.current.set(id, colorSeed);
      }
      const rng = createRNG(colorSeed);
      const t = rng();

      for (const { dx, dz, rotY } of transforms) {
        if (idx >= capacity) break;

        _pos.set(position.x + dx, (position.y ?? 0) + 0.2, position.z + dz);
        _quat.setFromAxisAngle(_yAxis, rotY);
        _matrix.compose(_pos, _quat, _scale);
        mesh.setMatrixAt(idx, _matrix);

        // Slight per-instance tint variation using the entity's color seed
        _tmpColor.lerpColors(BASE_COLOR, LIGHT_COLOR, t);
        mesh.setColorAt(idx, _tmpColor);

        idx++;
      }
    }

    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  if (capacity === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[BLADE_GEOMETRY, undefined, capacity]}
      frustumCulled={false}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={BASE_COLOR} side={2} alphaTest={0.1} roughness={0.9} />
    </instancedMesh>
  );
};

// ---------------------------------------------------------------------------
// Public API — ProceduralGrass
// ---------------------------------------------------------------------------

/**
 * ProceduralGrass renders all ECS grass entities as a single InstancedMesh.
 *
 * Replaces GrassInstances.tsx. No GLB loading — blades are thin
 * PlaneGeometry quads, double-sided, with a slight per-entity color tint.
 * One draw call for all grass in the scene (Spec §8).
 *
 * Mount once inside the R3F Canvas.
 * See GAME_SPEC.md §8.
 */
export const ProceduralGrass = () => {
  // Track actual instance count to grow capacity as chunks load.
  // Capacity grows but never shrinks to avoid GPU re-uploads.
  const [capacity, setCapacity] = useState(MAX_GRASS_INSTANCES);
  const capacityRef = useRef(MAX_GRASS_INSTANCES);

  useFrame(() => {
    const needed = countTotalInstances();
    if (needed > capacityRef.current) {
      // Grow by doubling to amortize re-allocations
      const next = Math.min(needed * 2, MAX_GRASS_INSTANCES * 4);
      capacityRef.current = next;
      setCapacity(next);
    }
  });

  // Use a stable key so the InstancedMesh is not remounted on capacity growth
  // (we rely on the mesh being re-created only when capacity changes).
  return <GrassBlades key={capacity} capacity={capacity} />;
};
