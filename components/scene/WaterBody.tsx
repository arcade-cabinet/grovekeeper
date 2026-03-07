/**
 * WaterBodies — R3F component that renders all ECS water body entities
 * using PlaneGeometry + Gerstner wave ShaderMaterial.
 *
 * Each water body is an ECS entity with a WaterBodyComponent that defines
 * wave layers, color, opacity, size, and foam parameters. The Gerstner
 * shader applies per-layer vertex displacement each frame.
 *
 * When causticsEnabled is true on a water body, a second additive-blended
 * plane is rendered slightly below the water surface to project animated
 * caustic light patterns onto the terrain.
 *
 * Spec §31.2: Gerstner Wave Water — water planes render at entity positions.
 * Follows the TerrainChunks imperative useFrame rendering pattern.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import type { WaterBodyComponent } from "@/game/ecs/components/procedural/water";
import { waterBodiesQuery } from "@/game/ecs/world";
import {
  createCausticsMaterial,
  createGerstnerMaterial,
  updateCausticsTime,
  updateGerstnerTime,
} from "@/game/shaders/gerstnerWater";

/**
 * PlaneGeometry segment count per axis for water surfaces.
 * Higher values produce smoother Gerstner wave deformation.
 */
export const WATER_PLANE_SEGMENTS = 32;

/**
 * Y offset below the water surface where the caustic plane is rendered.
 * Slight offset ensures caustics project onto terrain without z-fighting.
 */
export const CAUSTICS_DEPTH_OFFSET = 0.05;

/**
 * Build a PlaneGeometry sized to a WaterBodyComponent's width × depth.
 *
 * The plane lies in the XY plane (Three.js default). The mesh is rotated
 * -π/2 around X at render time so the surface lies in XZ (horizontal).
 *
 * Exported as a pure testable seam.
 */
export function buildWaterPlaneGeometry(size: WaterBodyComponent["size"]): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(
    size.width,
    size.depth,
    WATER_PLANE_SEGMENTS,
    WATER_PLANE_SEGMENTS,
  );
}

/**
 * WaterBodies — renders all loaded water body ECS entities.
 *
 * Queries waterBodiesQuery each frame (imperative, no React re-renders).
 * Creates/destroys Three.js meshes as entities load/unload.
 * Updates Gerstner time uniform each frame for wave animation.
 * For causticsEnabled bodies, creates/destroys a caustic plane below the surface.
 */
export const WaterBodies = () => {
  const groupRef = useRef<THREE.Group>(null);
  const meshMapRef = useRef(new Map<string, THREE.Mesh>());
  const materialMapRef = useRef(new Map<string, THREE.ShaderMaterial>());
  const causticMeshMapRef = useRef(new Map<string, THREE.Mesh>());
  const causticMaterialMapRef = useRef(new Map<string, THREE.ShaderMaterial>());

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    const meshMap = meshMapRef.current;
    const materialMap = materialMapRef.current;
    const causticMeshMap = causticMeshMapRef.current;
    const causticMaterialMap = causticMaterialMapRef.current;
    const aliveIds = new Set<string>();
    const time = clock.elapsedTime;

    for (const entity of waterBodiesQuery.entities) {
      const { waterBody, position, id } = entity;
      aliveIds.add(id);

      // Create water mesh + material on first encounter
      if (!meshMap.has(id)) {
        const geometry = buildWaterPlaneGeometry(waterBody.size);
        const material = createGerstnerMaterial(waterBody);

        const mesh = new THREE.Mesh(geometry, material);
        // Rotate from XY plane (Three.js default) to horizontal XZ surface
        mesh.rotation.x = -Math.PI / 2;

        materialMap.set(id, material);
        meshMap.set(id, mesh);
        group.add(mesh);
      }

      // Sync world position each frame (entity may be repositioned)
      const mesh = meshMap.get(id)!;
      mesh.position.set(position.x, position.y, position.z);

      // Advance Gerstner wave time uniform
      const material = materialMap.get(id)!;
      updateGerstnerTime(material, time);

      // Caustic plane: rendered below the water surface when enabled
      if (waterBody.causticsEnabled) {
        if (!causticMeshMap.has(id)) {
          const causticGeometry = buildWaterPlaneGeometry(waterBody.size);
          const causticMaterial = createCausticsMaterial();

          const causticMesh = new THREE.Mesh(causticGeometry, causticMaterial);
          causticMesh.rotation.x = -Math.PI / 2;

          causticMaterialMap.set(id, causticMaterial);
          causticMeshMap.set(id, causticMesh);
          group.add(causticMesh);
        }

        // Position caustic plane just below the water surface
        const causticMesh = causticMeshMap.get(id)!;
        causticMesh.position.set(position.x, position.y - CAUSTICS_DEPTH_OFFSET, position.z);

        const causticMaterial = causticMaterialMap.get(id)!;
        updateCausticsTime(causticMaterial, time);
      }
    }

    // Destroy meshes for water bodies that have been unloaded
    for (const [id, mesh] of meshMap) {
      if (!aliveIds.has(id)) {
        group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        meshMap.delete(id);
        materialMap.delete(id);
      }
    }

    // Destroy caustic meshes for unloaded water bodies
    for (const [id, causticMesh] of causticMeshMap) {
      if (!aliveIds.has(id)) {
        group.remove(causticMesh);
        causticMesh.geometry.dispose();
        (causticMesh.material as THREE.Material).dispose();
        causticMeshMap.delete(id);
        causticMaterialMap.delete(id);
      }
    }
  });

  return <group ref={groupRef} />;
};
