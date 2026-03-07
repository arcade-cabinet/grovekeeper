/**
 * GrassInstances — R3F component that renders all ECS grass entities via InstancedMesh.
 *
 * Groups grass entities by grassType — one InstancedMesh per type reduces draw calls.
 * Per-instance position/rotation is derived from the entity's ECS id via seeded RNG,
 * giving deterministic placement that matches the world seed system (Spec §3.2, §8).
 * Instance count per entity is controlled by GrassComponent.density (Spec §8).
 *
 * See GAME_SPEC.md §8.
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import vegetationConfig from "@/config/game/vegetation.json" with { type: "json" };
import { grassQuery } from "@/game/ecs/world";
import { createRNG, hashString } from "@/game/utils/seedRNG";

// ---------------------------------------------------------------------------
// Constants (loaded from config — no inline magic numbers)
// ---------------------------------------------------------------------------

/** Scatter radius for grass instances around their entity position (Spec §8). */
export const GRASS_SCATTER_RADIUS: number = vegetationConfig.grassScatterRadius;

// ---------------------------------------------------------------------------
// Pure functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the GLB asset path for a given grassType (Spec §8).
 * Convention: `assets/models/grass/{grassType}.glb`
 */
export function resolveGrassGLBPath(grassType: string): string {
  return `assets/models/grass/${grassType}.glb`;
}

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
// Helper: total instances needed for a grassType
// ---------------------------------------------------------------------------

function computeNeededInstances(grassType: string): number {
  let total = 0;
  for (const entity of grassQuery.entities) {
    if (entity.grass.grassType === grassType) {
      total += entity.grass.density;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Sub-component: one InstancedMesh per grassType
// ---------------------------------------------------------------------------

interface GrassTypeInstancesProps {
  grassType: string;
  /** Pre-allocated InstancedMesh capacity (max instances). */
  capacity: number;
}

/**
 * Renders all grass instances for a single grassType via InstancedMesh.
 *
 * Separated from GrassInstances so useGLTF is called unconditionally at the
 * component top level — satisfies Rules of Hooks when grassTypes are dynamic.
 *
 * Updates instance matrices imperatively in useFrame (zero React re-renders
 * per frame). Capacity is fixed at construction; mesh.count is set each frame
 * to render only the currently active instances.
 */
const GrassTypeInstances = ({ grassType, capacity }: GrassTypeInstancesProps) => {
  const glbPath = resolveGrassGLBPath(grassType);
  const { scene } = useGLTF(glbPath);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Reusable Three.js objects — avoids per-frame heap allocations
  const _pos = useMemo(() => new THREE.Vector3(), []);
  const _quat = useMemo(() => new THREE.Quaternion(), []);
  const _scale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const _matrix = useMemo(() => new THREE.Matrix4(), []);
  const _yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  // Extract geometry + material from the first Mesh in the GLB scene
  const [geometry, material] = useMemo<[THREE.BufferGeometry | null, THREE.Material | null]>(() => {
    let geo: THREE.BufferGeometry | null = null;
    let mat: THREE.Material | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !geo) {
        geo = obj.geometry;
        mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      }
    });
    return [geo, mat];
  }, [scene]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let idx = 0;

    for (const entity of grassQuery.entities) {
      if (entity.grass.grassType !== grassType) continue;

      const { position, grass } = entity;
      const transforms = computeGrassInstanceTransforms(entity.id, grass.density);

      for (const { dx, dz, rotY } of transforms) {
        if (idx >= capacity) break;

        _pos.set(position.x + dx, position.y, position.z + dz);
        _quat.setFromAxisAngle(_yAxis, rotY);
        _matrix.compose(_pos, _quat, _scale);
        mesh.setMatrixAt(idx, _matrix);
        idx++;
      }
    }

    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!geometry || !material || capacity === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, capacity]} castShadow />;
};

// ---------------------------------------------------------------------------
// Public API: GrassInstances
// ---------------------------------------------------------------------------

/**
 * GrassInstances renders all ECS grass entities as InstancedMeshes.
 *
 * - Groups by grassType for minimal draw calls (one InstancedMesh per type)
 * - Dynamically mounts GrassTypeInstances sub-components as types appear in ECS
 * - Capacity grows-only: never shrinks InstancedMesh to avoid GPU re-uploads;
 *   mesh.count is set each frame to render only active instances (Spec §8)
 */
export const GrassInstances = () => {
  // Map of grassType -> allocated InstancedMesh capacity
  const [typeCapacities, setTypeCapacities] = useState<ReadonlyMap<string, number>>(new Map());

  // Refs track mutable state without triggering re-renders mid-frame
  const prevTypesRef = useRef<Set<string>>(new Set());
  const capacitiesRef = useRef<Map<string, number>>(new Map());

  useFrame(() => {
    const current = new Set<string>();
    let changed = false;

    for (const entity of grassQuery.entities) {
      current.add(entity.grass.grassType);
    }

    // Detect new grassTypes (appear as chunks load)
    const prev = prevTypesRef.current;
    if (current.size !== prev.size || [...current].some((t) => !prev.has(t))) {
      changed = true;
      prevTypesRef.current = current;
    }

    // Detect capacity growth (more instances than allocated)
    for (const grassType of current) {
      const needed = computeNeededInstances(grassType);
      const allocated = capacitiesRef.current.get(grassType) ?? 0;
      if (needed > allocated) {
        capacitiesRef.current.set(grassType, needed);
        changed = true;
      }
    }

    if (changed) {
      setTypeCapacities(new Map(capacitiesRef.current));
    }
  });

  return (
    <>
      {[...typeCapacities.entries()].map(([grassType, capacity]) => (
        <GrassTypeInstances key={grassType} grassType={grassType} capacity={capacity} />
      ))}
    </>
  );
};
