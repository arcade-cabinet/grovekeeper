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
  /** Biome-derived vertex color hex (e.g., "#6db856" for forest floor). */
  baseColor: string;
  /** Blend weights for neighboring biome transitions [N, E, S, W]. 1 = different biome, 0 = same. */
  biomeBlend: [number, number, number, number];
  /** Hex colors of the 4 neighboring chunks [N, E, S, W] for vertex blending. */
  neighborColors: [string, string, string, string];
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

/** Cardinal direction a signpost faces. */
export type SignpostDirection = "N" | "E" | "S" | "W";

/**
 * Signpost placed at a path intersection (landmark chunk with 2+ connected
 * landmark neighbors). Points toward the nearest major landmark.
 *
 * Spec §17.6: Signposts at minor features point toward nearest major feature.
 */
export interface SignpostComponent {
  /** Cardinal direction this signpost points toward the nearest major landmark. */
  facingDirection: SignpostDirection;
  /** Type string of the target landmark ("village", "shrine", "ancient-tree", "campfire"). */
  targetLandmarkType: string;
  /** World-space X coordinate of the target landmark. */
  targetWorldX: number;
  /** World-space Z coordinate of the target landmark. */
  targetWorldZ: number;
}
