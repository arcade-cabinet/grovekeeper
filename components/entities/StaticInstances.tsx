/**
 * StaticInstances — shared InstancedMesh batching primitive for static GLB entities.
 *
 * Exported:
 *   - StaticEntityInput — minimal shape for an entity to be batched
 *   - groupByModelPath  — pure function for grouping by modelPath (exported for testing)
 *   - StaticModelInstances — inner R3F sub-component; one InstancedMesh cluster per GLB
 *
 * Consumer components (StructureInstances, FenceInstances, PropInstances) manage
 * capacity state and mount StaticModelInstances per modelPath.
 *
 * Multi-mesh GLBs are handled correctly: all Mesh children are extracted from the
 * GLB scene and each gets its own InstancedMesh sharing the same per-entity transform.
 *
 * See GAME_SPEC.md §28 (draw calls < 50).
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type * as React from "react";
import { useMemo, useRef } from "react";
import {
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from "three";
import { resolveAssetUrl } from "@/game/utils/resolveAssetUrl";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Minimal entity shape passed to StaticModelInstances. */
export interface StaticEntityInput {
  id: string;
  modelPath: string;
  position: { x: number; y: number; z: number };
  rotationY: number;
}

// ---------------------------------------------------------------------------
// Pure functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Group a list of static entities by their modelPath.
 *
 * Returns a Map where each key is a distinct modelPath and the value is the
 * array of entities sharing that model. Used by outer batch components to
 * determine which InstancedMesh sub-components to mount and what capacity each needs.
 *
 * See GAME_SPEC.md §28.
 */
export function groupByModelPath(entities: StaticEntityInput[]): Map<string, StaticEntityInput[]> {
  const result = new Map<string, StaticEntityInput[]>();
  for (const entity of entities) {
    const group = result.get(entity.modelPath);
    if (group) {
      group.push(entity);
    } else {
      result.set(entity.modelPath, [entity]);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// StaticModelInstances — inner sub-component
// ---------------------------------------------------------------------------

export interface StaticModelInstancesProps {
  /** GLB asset path for this model. */
  glbPath: string;
  /** Pre-allocated InstancedMesh capacity (max instances). Grows-only. */
  capacity: number;
  /**
   * Mutable ref to the current entity list for this model.
   * Updated by the outer component in useFrame before sub-component useFrame runs.
   */
  entitiesRef: React.MutableRefObject<StaticEntityInput[]>;
}

/**
 * Renders all instances of one GLB model as InstancedMesh(es).
 *
 * Extracts all Mesh children from the GLB scene and creates one InstancedMesh per
 * sub-mesh. This handles multi-mesh GLBs (e.g., a barn with walls + roof sub-meshes):
 * all sub-meshes share the same per-instance transform matrix.
 *
 * Updates instance matrices imperatively in useFrame — zero React re-renders per frame.
 * Capacity is pre-allocated; mesh.count is set each frame to the active instance count.
 *
 * See GAME_SPEC.md §28.
 */
export const StaticModelInstances = ({
  glbPath,
  capacity,
  entitiesRef,
}: StaticModelInstancesProps) => {
  const { scene } = useGLTF(resolveAssetUrl(glbPath));

  /** All Mesh children extracted from the GLB scene, with their geometry + material. */
  const meshInfos = useMemo<Array<{ geo: BufferGeometry; mat: Material }>>(() => {
    const result: Array<{ geo: BufferGeometry; mat: Material }> = [];
    scene.traverse((obj) => {
      if (obj instanceof Mesh && obj.geometry) {
        const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (mat) result.push({ geo: obj.geometry, mat });
      }
    });
    return result;
  }, [scene]);

  /** One ref slot per sub-mesh (dynamic length, updated via callback ref). */
  const instancedRefs = useRef<Array<InstancedMesh | null>>([]);

  // Reusable Three.js objects — avoids per-frame heap allocations
  const _pos = useMemo(() => new Vector3(), []);
  const _quat = useMemo(() => new Quaternion(), []);
  const _scale = useMemo(() => new Vector3(1, 1, 1), []);
  const _matrix = useMemo(() => new Matrix4(), []);
  const _yAxis = useMemo(() => new Vector3(0, 1, 0), []);

  useFrame(() => {
    const entities = entitiesRef.current;
    let idx = 0;

    for (const { position, rotationY } of entities) {
      if (idx >= capacity) break;
      _pos.set(position.x, position.y, position.z);
      _quat.setFromAxisAngle(_yAxis, rotationY);
      _matrix.compose(_pos, _quat, _scale);

      for (const ref of instancedRefs.current) {
        ref?.setMatrixAt(idx, _matrix);
      }
      idx++;
    }

    for (const ref of instancedRefs.current) {
      if (ref) {
        ref.count = idx;
        ref.instanceMatrix.needsUpdate = true;
      }
    }
  });

  if (capacity === 0 || meshInfos.length === 0) return null;

  return (
    <>
      {meshInfos.map(({ geo, mat }, i) => (
        <instancedMesh
          // biome-ignore lint/suspicious/noArrayIndexKey: instancedMesh list is stable — same geo+mat order per render
          key={i}
          ref={(el: InstancedMesh | null) => {
            if (el) {
              // InstancedMesh sits at origin — position managed via setMatrixAt().
              // Freeze the world matrix to skip Three.js per-frame recomputation (Spec §28).
              el.matrixAutoUpdate = false;
            }
            instancedRefs.current[i] = el;
          }}
          args={[geo, mat, capacity]}
          castShadow
        />
      ))}
    </>
  );
};
