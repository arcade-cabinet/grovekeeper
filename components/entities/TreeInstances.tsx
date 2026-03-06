/**
 * TreeInstances — R3F component that renders all ECS tree entities.
 *
 * Each tree gets a procedurally generated BufferGeometry (via createTreeGeometry)
 * with baked vertex colors. Geometries are cached by speciesId-stage-meshSeed key
 * to avoid regenerating identical trees.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { treesQuery } from "@/game/ecs/world";
import { createTreeGeometry } from "@/game/utils/treeGeometry";

/** Lerp speed for smooth scale transitions. */
const SCALE_LERP_SPEED = 4;

/** Cache key for a tree geometry. */
function cacheKey(speciesId: string, stage: number, meshSeed: number): string {
  return `${speciesId}-${stage}-${meshSeed}`;
}

export const TreeInstances = () => {
  const groupRef = useRef<THREE.Group>(null);
  const geometryCacheRef = useRef(new Map<string, THREE.BufferGeometry>());
  const meshMapRef = useRef(new Map<string, THREE.Mesh>());

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const entities = treesQuery.entities;
    const cache = geometryCacheRef.current;
    const meshMap = meshMapRef.current;
    const lerpFactor = Math.min(1, SCALE_LERP_SPEED * delta);

    // Track which entity IDs are still alive
    const aliveIds = new Set<string>();

    for (const entity of entities) {
      const { tree, position, renderable } = entity;
      const id = entity.id;
      aliveIds.add(id);

      const key = cacheKey(tree.speciesId, tree.stage, tree.meshSeed);

      // Get or create cached geometry
      if (!cache.has(key)) {
        cache.set(
          key,
          createTreeGeometry(tree.speciesId, tree.stage, tree.meshSeed),
        );
      }
      // biome-ignore lint/style/noNonNullAssertion: just set above
      const geometry = cache.get(key)!;

      // Get or create mesh for this entity
      let mesh = meshMap.get(id);
      if (!mesh) {
        const material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.8,
          metalness: 0.05,
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshMap.set(id, mesh);
        group.add(mesh);
      }

      // Update geometry if the cache key changed (e.g. stage change)
      if (mesh.geometry !== geometry) {
        mesh.geometry = geometry;
      }

      // Update position
      mesh.position.set(position.x, position.y, position.z);

      // Smooth scale lerp
      mesh.visible = renderable.visible;
      const targetScale = renderable.scale;
      mesh.scale.lerp(
        _scaleVec.set(targetScale, targetScale, targetScale),
        lerpFactor,
      );
    }

    // Remove meshes for despawned entities
    for (const [id, mesh] of meshMap) {
      if (!aliveIds.has(id)) {
        group.remove(mesh);
        mesh.geometry = new THREE.BufferGeometry(); // detach shared geometry
        (mesh.material as THREE.Material).dispose();
        meshMap.delete(id);
      }
    }
  });

  return <group ref={groupRef} />;
};

/** Reusable vector to avoid allocations in the render loop. */
const _scaleVec = new THREE.Vector3();
