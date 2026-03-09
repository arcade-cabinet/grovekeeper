/**
 * TerrainChunks — R3F component that renders all ECS terrain chunk entities
 * and maintains Rapier static trimesh colliders for physics.
 *
 * Each terrain chunk is a BufferGeometry with Y-displaced vertices from the
 * heightmap and uniform vertex colors derived from the biome's baseColor.
 * A matching fixed Rapier RigidBody + TrimeshCollider is created per chunk
 * so the player capsule can walk on the terrain surface.
 *
 * Spec §31.1: "Vertex colors: biome-derived base color applied to terrain mesh"
 * Spec §9:    "Rapier collider: trimesh per terrain chunk for physics"
 * Follows the TreeInstances imperative rendering pattern.
 */

import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
} from "three";

import { terrainChunksQuery } from "@/game/ecs/world";
import { CHUNK_SIZE } from "@/game/world/ChunkManager";

/** Maximum world-space height displacement from the heightmap [-1, 1] range. */
export const HEIGHT_SCALE = 4;

/** Number of tiles from each edge over which biome blending is applied (Spec §31.1: ~8 tiles). */
const BLEND_ZONE = 8;

/**
 * Compute a single vertex's blended RGB color given its position in the chunk,
 * the base biome color, and the 4 neighboring biome colors with blend weights.
 *
 * Exported as a testable seam — pure function, no Three.js dependency.
 *
 * Formula: weighted average of baseColor (weight=1) + active neighbor colors
 * (weight = biomeBlend[i] * proximity[i]). Normalized by total weight.
 *
 * @param ix            Vertex X coord in local chunk space [0, CHUNK_SIZE-1]
 * @param iz            Vertex Z coord in local chunk space [0, CHUNK_SIZE-1]
 * @param n             CHUNK_SIZE
 * @param baseR         Base color red channel [0,1]
 * @param baseG         Base color green channel [0,1]
 * @param baseB         Base color blue channel [0,1]
 * @param biomeBlend    [N, E, S, W] blend weights (0 = same biome, 1 = different)
 * @param neighborRGB   [N, E, S, W] neighbor color channels [[r,g,b], ...]
 * @param blendZone     Number of tiles from each edge to blend over
 * @returns             [r, g, b] blended color in [0,1]
 */
export function computeBlendedColor(
  ix: number,
  iz: number,
  n: number,
  baseR: number,
  baseG: number,
  baseB: number,
  biomeBlend: [number, number, number, number],
  neighborRGB: [
    [number, number, number],
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ],
  blendZone: number,
): [number, number, number] {
  // Proximity to each edge: 1.0 at the edge, 0.0 at blendZone tiles inward
  const proxN = Math.max(0, blendZone - iz) / blendZone;
  const proxE = Math.max(0, blendZone - (n - 1 - ix)) / blendZone;
  const proxS = Math.max(0, blendZone - (n - 1 - iz)) / blendZone;
  const proxW = Math.max(0, blendZone - ix) / blendZone;

  // Blend weights per direction (0 when same biome or in interior)
  const wN = biomeBlend[0] * proxN;
  const wE = biomeBlend[1] * proxE;
  const wS = biomeBlend[2] * proxS;
  const wW = biomeBlend[3] * proxW;

  const total = 1 + wN + wE + wS + wW;
  const r =
    (baseR +
      wN * neighborRGB[0][0] +
      wE * neighborRGB[1][0] +
      wS * neighborRGB[2][0] +
      wW * neighborRGB[3][0]) /
    total;
  const g =
    (baseG +
      wN * neighborRGB[0][1] +
      wE * neighborRGB[1][1] +
      wS * neighborRGB[2][1] +
      wW * neighborRGB[3][1]) /
    total;
  const b =
    (baseB +
      wN * neighborRGB[0][2] +
      wE * neighborRGB[1][2] +
      wS * neighborRGB[2][2] +
      wW * neighborRGB[3][2]) /
    total;
  return [r, g, b];
}

type RapierWorld = ReturnType<typeof useRapier>["world"];
type RapierModule = ReturnType<typeof useRapier>["rapier"];
type RapierBody = ReturnType<RapierWorld["createRigidBody"]>;

/**
 * Build a BufferGeometry from a terrain heightmap with biome-blended vertex colors.
 *
 * Geometry is in world space (Y = height, XZ = horizontal). No rotation needed.
 * Uses (CHUNK_SIZE-1)^2 quads = (CHUNK_SIZE)^2 vertices to match the heightmap.
 *
 * Vertex colors are blended toward neighboring chunk biome colors within BLEND_ZONE
 * tiles of each edge, producing smooth gradients with no hard seams (Spec §31.1).
 *
 * @param heightmap       Float32Array of CHUNK_SIZE*CHUNK_SIZE values in [-1, 1]
 * @param baseColor       Hex color string (e.g. "#4a7c3f") — center biome color
 * @param biomeBlend      [N, E, S, W] blend weights (1=different biome, 0=same). Defaults to all zeros.
 * @param neighborColors  [N, E, S, W] neighbor hex colors for interpolation.
 */
export function buildTerrainGeometry(
  heightmap: Float32Array,
  baseColor: string,
  biomeBlend: [number, number, number, number] = [0, 0, 0, 0],
  neighborColors: [string, string, string, string] = [baseColor, baseColor, baseColor, baseColor],
): BufferGeometry {
  const n = CHUNK_SIZE; // 16 vertices per side
  const segments = n - 1; // 15 quads per side

  const positions = new Float32Array(n * n * 3);
  const colors = new Float32Array(n * n * 3);

  // Parse hex colors to linear RGB
  const base = new Color(baseColor);
  const nColors = neighborColors.map((hex) => new Color(hex));
  const neighborRGB: [
    [number, number, number],
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ] = [
    [nColors[0].r, nColors[0].g, nColors[0].b],
    [nColors[1].r, nColors[1].g, nColors[1].b],
    [nColors[2].r, nColors[2].g, nColors[2].b],
    [nColors[3].r, nColors[3].g, nColors[3].b],
  ];

  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const vi = iz * n + ix; // vertex index
      const height = heightmap[vi] * HEIGHT_SCALE;

      positions[vi * 3 + 0] = ix; // X: 0..CHUNK_SIZE-1 (local)
      positions[vi * 3 + 1] = height; // Y: height-displaced
      positions[vi * 3 + 2] = iz; // Z: 0..CHUNK_SIZE-1 (local)

      const [r, g, b] = computeBlendedColor(
        ix,
        iz,
        n,
        base.r,
        base.g,
        base.b,
        biomeBlend,
        neighborRGB,
        BLEND_ZONE,
      );
      colors[vi * 3 + 0] = r;
      colors[vi * 3 + 1] = g;
      colors[vi * 3 + 2] = b;
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

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Extract flat vertex positions and triangle indices suitable for Rapier's
 * trimesh collider. Vertices are in local chunk space (X: 0..CHUNK_SIZE-1,
 * Y: height-displaced, Z: 0..CHUNK_SIZE-1). The rigid body is positioned at
 * the chunk's world origin via setTranslation() in the caller.
 *
 * @param heightmap  Float32Array of CHUNK_SIZE*CHUNK_SIZE values in [-1, 1]
 */
export function buildTrimeshArgs(heightmap: Float32Array): {
  vertices: Float32Array;
  indices: Uint32Array;
} {
  const n = CHUNK_SIZE;
  const segments = n - 1;

  const vertices = new Float32Array(n * n * 3);
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const vi = iz * n + ix;
      vertices[vi * 3 + 0] = ix;
      vertices[vi * 3 + 1] = heightmap[vi] * HEIGHT_SCALE;
      vertices[vi * 3 + 2] = iz;
    }
  }

  const indices = new Uint32Array(segments * segments * 6);
  let i = 0;
  for (let iz = 0; iz < segments; iz++) {
    for (let ix = 0; ix < segments; ix++) {
      const a = iz * n + ix;
      const b = iz * n + ix + 1;
      const c = (iz + 1) * n + ix;
      const d = (iz + 1) * n + ix + 1;
      indices[i++] = a;
      indices[i++] = c;
      indices[i++] = b;
      indices[i++] = b;
      indices[i++] = c;
      indices[i++] = d;
    }
  }

  return { vertices, indices };
}

/**
 * TerrainChunks — renders all loaded terrain chunk ECS entities and maintains
 * matching Rapier static trimesh colliders for player capsule physics.
 *
 * Queries terrainChunksQuery each frame (imperative, no React re-renders).
 * Creates/destroys Three.js meshes and Rapier rigid bodies as chunks
 * load/unload via ChunkManager.
 */
export const TerrainChunks = () => {
  const groupRef = useRef<Group>(null);
  // Per-entity geometry cache (chunk heightmap is immutable unless dirty)
  const geometryCacheRef = useRef(new Map<string, BufferGeometry>());
  // Per-entity mesh map for O(1) lookup
  const meshMapRef = useRef(new Map<string, Mesh>());
  // Per-entity Rapier static rigid body (trimesh collider attached)
  const rigidBodyMapRef = useRef(new Map<string, RapierBody>());

  // Rapier world and module — stable references, safe to use inside useFrame
  const { rapier, world: rapierWorld } = useRapier();

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const geometryCache = geometryCacheRef.current;
    const meshMap = meshMapRef.current;
    const rigidBodyMap = rigidBodyMapRef.current;
    const aliveIds = new Set<string>();

    for (const entity of terrainChunksQuery.entities) {
      const { terrainChunk, position, id } = entity;
      aliveIds.add(id);

      // Regenerate geometry when dirty or first-time creation
      let geometry = geometryCache.get(id);
      if (!geometry || terrainChunk.dirty) {
        if (geometry) geometry.dispose();
        geometry = buildTerrainGeometry(
          terrainChunk.heightmap,
          terrainChunk.baseColor,
          terrainChunk.biomeBlend,
          terrainChunk.neighborColors,
        );
        geometryCache.set(id, geometry);

        // Destroy existing Rapier body — recreated below with fresh geometry
        const existingBody = rigidBodyMap.get(id);
        if (existingBody) {
          rapierWorld.removeRigidBody(existingBody);
          rigidBodyMap.delete(id);
        }

        terrainChunk.dirty = false;
      }

      // Create mesh on first encounter
      let mesh = meshMap.get(id);
      if (!mesh) {
        const material = new MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.75,
          metalness: 0,
          flatShading: false,
        });
        mesh = new Mesh(geometry, material);
        mesh.receiveShadow = true;
        // Terrain chunks are static — position never changes after creation.
        // Set once and freeze the world matrix to skip per-frame recomputation (Spec §28).
        mesh.position.set(position.x, position.y, position.z);
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        meshMap.set(id, mesh);
        group.add(mesh);
      }

      // Sync geometry (in case dirty rebuild produced a new instance)
      if (mesh.geometry !== geometry) {
        mesh.geometry = geometry;
      }

      // Visibility controlled by ChunkManager (active vs buffer ring)
      const visible = entity.renderable?.visible ?? true;
      mesh.visible = visible;

      // Create Rapier static trimesh collider if not yet present for this chunk
      if (!rigidBodyMap.has(id)) {
        const { vertices, indices } = buildTrimeshArgs(terrainChunk.heightmap);
        const bodyDesc = (rapier as RapierModule).RigidBodyDesc.fixed().setTranslation(
          position.x,
          position.y,
          position.z,
        );
        const body = rapierWorld.createRigidBody(bodyDesc);
        const colliderDesc = (rapier as RapierModule).ColliderDesc.trimesh(vertices, indices);
        rapierWorld.createCollider(colliderDesc, body);
        rigidBodyMap.set(id, body);
      }
    }

    // Destroy meshes and Rapier bodies for chunks that were unloaded by ChunkManager
    for (const [id, mesh] of meshMap) {
      if (!aliveIds.has(id)) {
        group.remove(mesh);
        const geo = geometryCache.get(id);
        if (geo) {
          geo.dispose();
          geometryCache.delete(id);
        }
        (mesh.material as Material).dispose();
        meshMap.delete(id);

        // Remove Rapier rigid body (also removes its attached collider)
        const body = rigidBodyMap.get(id);
        if (body) {
          rapierWorld.removeRigidBody(body);
          rigidBodyMap.delete(id);
        }
      }
    }
  });

  return <group ref={groupRef} />;
};
