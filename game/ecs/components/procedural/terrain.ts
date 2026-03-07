/**
 * Procedural terrain ECS components.
 *
 * Terrain chunks are heightmap meshes with biome vertex colors.
 * Paths are spline-carved trails/roads connecting landmarks.
 */

/** Procedural terrain chunk — heightmap mesh with biome vertex colors. */
export interface TerrainChunkComponent {
  /** Heightmap values (flattened CHUNK_SIZE x CHUNK_SIZE). */
  heightmap: Float32Array;
  /** Biome-derived vertex color hex (e.g., "#4a7c3f" for forest floor). */
  baseColor: string;
  /** Blend weights for neighboring biome transitions [N, E, S, W]. */
  biomeBlend: [number, number, number, number];
  /** Whether this chunk's mesh needs regeneration. */
  dirty: boolean;
}

/** Procedural path/trail segment carved into terrain. */
export interface PathSegmentComponent {
  /** Path type affects width and material. */
  pathType: "trail" | "road" | "bridge" | "stepping_stones";
  /** Control points for the spline in local chunk coords. */
  controlPoints: Array<{ x: number; z: number }>;
  /** Width in world units. */
  width: number;
}
