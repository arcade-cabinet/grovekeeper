/**
 * TerrainChunks — R3F component that renders all ECS terrain chunk entities.
 *
 * Each terrain chunk is a BufferGeometry with Y-displaced vertices from the
 * heightmap and uniform vertex colors derived from the biome's baseColor.
 *
 * Spec §31.1: "Vertex colors: biome-derived base color applied to terrain mesh"
 * Follows the TreeInstances imperative rendering pattern.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { terrainChunksQuery } from "@/game/ecs/world";
import { CHUNK_SIZE } from "@/game/world/ChunkManager";

/** Maximum world-space height displacement from the heightmap [-1, 1] range. */
export const HEIGHT_SCALE = 4;

/**
 * Build a BufferGeometry from a terrain heightmap with uniform vertex colors.
 *
 * Geometry is in world space (Y = height, XZ = horizontal). No rotation needed.
 * Uses (CHUNK_SIZE-1)^2 quads = (CHUNK_SIZE)^2 vertices to match the heightmap.
 *
 * @param heightmap  Float32Array of CHUNK_SIZE*CHUNK_SIZE values in [-1, 1]
 * @param baseColor  Hex color string (e.g. "#4a7c3f") — applied to all vertices
 */
export function buildTerrainGeometry(
  heightmap: Float32Array,
  baseColor: string,
): THREE.BufferGeometry {
  const n = CHUNK_SIZE; // 16 vertices per side
  const segments = n - 1; // 15 quads per side

  const positions = new Float32Array(n * n * 3);
  const colors = new Float32Array(n * n * 3);

  // Parse hex color to linear RGB for the vertex color buffer
  const color = new THREE.Color(baseColor);

  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const vi = iz * n + ix; // vertex index
      const height = heightmap[vi] * HEIGHT_SCALE;

      positions[vi * 3 + 0] = ix; // X: 0..CHUNK_SIZE-1 (local)
      positions[vi * 3 + 1] = height; // Y: height-displaced
      positions[vi * 3 + 2] = iz; // Z: 0..CHUNK_SIZE-1 (local)

      colors[vi * 3 + 0] = color.r;
      colors[vi * 3 + 1] = color.g;
      colors[vi * 3 + 2] = color.b;
    }
  }

  // Two triangles per quad, CCW winding (Three.js default front face)
  const indices: number[] = [];
  for (let iz = 0; iz < segments; iz++) {
    for (let ix = 0; ix < segments; ix++) {
      const a = iz * n + ix;
      const b = iz * n + ix + 1;
      const c = (iz + 1) * n + ix;
      const d = (iz + 1) * n + ix + 1;
      // Triangle 1: a-c-b (upper-left triangle)
      indices.push(a, c, b);
      // Triangle 2: b-c-d (lower-right triangle)
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * TerrainChunks — renders all loaded terrain chunk ECS entities.
 *
 * Queries terrainChunksQuery each frame (imperative, no React re-renders).
 * Creates/destroys Three.js meshes as chunks load/unload via ChunkManager.
 */
export const TerrainChunks = () => {
  const groupRef = useRef<THREE.Group>(null);
  // Per-entity geometry cache (chunk heightmap is immutable unless dirty)
  const geometryCacheRef = useRef(new Map<string, THREE.BufferGeometry>());
  // Per-entity mesh map for O(1) lookup
  const meshMapRef = useRef(new Map<string, THREE.Mesh>());

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const geometryCache = geometryCacheRef.current;
    const meshMap = meshMapRef.current;
    const aliveIds = new Set<string>();

    for (const entity of terrainChunksQuery.entities) {
      const { terrainChunk, position, id } = entity;
      aliveIds.add(id);

      // Regenerate geometry when dirty or first-time creation
      let geometry = geometryCache.get(id);
      if (!geometry || terrainChunk.dirty) {
        if (geometry) geometry.dispose();
        geometry = buildTerrainGeometry(terrainChunk.heightmap, terrainChunk.baseColor);
        geometryCache.set(id, geometry);
        terrainChunk.dirty = false;
      }

      // Create mesh on first encounter
      let mesh = meshMap.get(id);
      if (!mesh) {
        const material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.95,
          metalness: 0,
          flatShading: true, // PSX aesthetic (Spec §1.4)
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        meshMap.set(id, mesh);
        group.add(mesh);
      }

      // Sync geometry (in case dirty rebuild produced a new instance)
      if (mesh.geometry !== geometry) {
        mesh.geometry = geometry;
      }

      // Position at chunk world-space origin (ChunkManager sets position.x/z = chunkX/Z * CHUNK_SIZE)
      mesh.position.set(position.x, position.y, position.z);

      // Visibility controlled by ChunkManager (active vs buffer ring)
      const visible = entity.renderable?.visible ?? true;
      mesh.visible = visible;
    }

    // Destroy meshes for chunks that were unloaded by ChunkManager
    for (const [id, mesh] of meshMap) {
      if (!aliveIds.has(id)) {
        group.remove(mesh);
        const geo = geometryCache.get(id);
        if (geo) {
          geo.dispose();
          geometryCache.delete(id);
        }
        (mesh.material as THREE.Material).dispose();
        meshMap.delete(id);
      }
    }
  });

  return <group ref={groupRef} />;
};
