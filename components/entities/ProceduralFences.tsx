/**
 * ProceduralFences — renders all ECS fence entities as instanced procedural geometry.
 *
 * Replaces GLB-based FenceInstances with two InstancedMeshes:
 *   - Posts: CylinderGeometry — "wood" canvas texture
 *   - Rails: BoxGeometry — "wood" canvas texture
 *
 * Each fence entity produces 2 posts (at segment ends) + 2 rails (upper/lower).
 * Y-rotation comes from entity.rotationY. Invisible fences are skipped.
 *
 * Geometry parameters come from config/game/proceduralMesh.json.
 * No inline constants. No Math.random().
 *
 * See GAME_SPEC.md §42.2.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
} from "three";

import proceduralMeshCfg from "@/config/game/proceduralMesh.json" with { type: "json" };
import { fencesQuery } from "@/game/ecs/world";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FENCE_CFG = proceduralMeshCfg.fences;
const _TEX_SIZE = proceduralMeshCfg.texture.size;

/** Relative offset along segment direction for each post (half-segment length). */
const HALF_RAIL_WIDTH = FENCE_CFG.rail.width * 0.5;

// ---------------------------------------------------------------------------
// Module-scope temps
// ---------------------------------------------------------------------------

const _dummy = new Object3D();
const _zero = new Matrix4();

// ---------------------------------------------------------------------------
// Geometry + Material builders
// ---------------------------------------------------------------------------

function buildPostGeometry(): CylinderGeometry {
  const { radius, height, segments } = FENCE_CFG.post;
  return new CylinderGeometry(radius, radius, height, segments);
}

function buildRailGeometry(): BoxGeometry {
  const { width, height, depth } = FENCE_CFG.rail;
  return new BoxGeometry(width, height, depth);
}

function buildWoodMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: "#8B6914",
    roughness: 0.9,
  });
}

// ---------------------------------------------------------------------------
// ProceduralFences component
// ---------------------------------------------------------------------------

/**
 * ProceduralFences renders all ECS fence entities as two InstancedMeshes.
 *
 * Each fence entity → 2 posts (either end of the segment) + 2 rails (upper/lower).
 * Capacity is 4× the entity count (2 posts + 2 rails per fence).
 *
 * See GAME_SPEC.md §42.2.
 */
export const ProceduralFences = () => {
  const postMeshRef = useRef<InstancedMesh>(null);
  const railMeshRef = useRef<InstancedMesh>(null);

  const { postGeo, railGeo, woodMat } = useMemo(
    () => ({
      postGeo: buildPostGeometry(),
      railGeo: buildRailGeometry(),
      woodMat: buildWoodMaterial(),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      postGeo.dispose();
      railGeo.dispose();
      woodMat.map?.dispose();
      woodMat.dispose();
    };
  }, [postGeo, railGeo, woodMat]);

  const capacityRef = useRef(256);

  useFrame(() => {
    const posts = postMeshRef.current;
    const rails = railMeshRef.current;
    if (!posts || !rails) return;

    let postIdx = 0;
    let railIdx = 0;
    const cap = capacityRef.current;
    const postHalfH = FENCE_CFG.post.height * 0.5;
    const railOffsets = FENCE_CFG.railOffsets;

    for (const entity of fencesQuery.entities) {
      if (!entity.renderable.visible) continue;
      const { position } = entity;
      const rotY = entity.rotationY ?? 0;

      // Posts at each end of the rail segment, offset along the rail direction.
      // Rail faces along Z when rotY=0, so offset is along sin/cos of rotY on XZ plane.
      const dx = Math.sin(rotY) * HALF_RAIL_WIDTH;
      const dz = Math.cos(rotY) * HALF_RAIL_WIDTH;

      for (const sign of [1, -1]) {
        if (postIdx >= cap) break;
        _dummy.position.set(position.x + dx * sign, position.y + postHalfH, position.z + dz * sign);
        _dummy.rotation.set(0, rotY, 0);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        posts.setMatrixAt(postIdx, _dummy.matrix);
        postIdx++;
      }

      // Rails at upper and lower vertical offsets.
      for (const yOff of railOffsets) {
        if (railIdx >= cap) break;
        _dummy.position.set(position.x, position.y + yOff + postHalfH, position.z);
        _dummy.rotation.set(0, rotY, 0);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        rails.setMatrixAt(railIdx, _dummy.matrix);
        railIdx++;
      }
    }

    // Zero unused slots.
    _zero.identity();
    for (let j = postIdx; j < cap; j++) posts.setMatrixAt(j, _zero);
    for (let j = railIdx; j < cap; j++) rails.setMatrixAt(j, _zero);

    posts.count = postIdx;
    rails.count = railIdx;
    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
  });

  const cap = capacityRef.current;

  return (
    <>
      <instancedMesh
        ref={postMeshRef}
        args={[postGeo, woodMat, cap]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={railMeshRef}
        args={[railGeo, woodMat, cap]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
    </>
  );
};
