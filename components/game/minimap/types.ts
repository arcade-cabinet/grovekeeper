/**
 * Minimap data types (Spec §17.6).
 *
 * Plain interfaces — no React/RN/ECS imports so they are safe to use in
 * pure-function tests without any mocking overhead.
 */

/** A single chunk cell in the minimap view grid. */
export interface MinimapChunk {
  chunkX: number;
  chunkZ: number;
  /** Biome-derived hex color (e.g. "#2D6A4F" for forest). */
  biomeColor: string;
  /** True if the player has visited this chunk (fog-of-war cleared). */
  discovered: boolean;
}

/** A campfire marker on the minimap (fast-travel node). */
export interface MinimapCampfire {
  worldX: number;
  worldZ: number;
  /** Links to discoveredCampfires store entry; null if placed but not registered. */
  fastTravelId: string | null;
  lit: boolean;
}

/** A nearby NPC dot on the minimap. */
export interface MinimapNpc {
  worldX: number;
  worldZ: number;
}

/** Player world-space position. */
export interface MinimapPlayer {
  x: number;
  z: number;
}

/** A labyrinth (hedge maze) center marker on the minimap. */
export interface MinimapLabyrinth {
  worldX: number;
  worldZ: number;
  /** True if the player has discovered/entered this labyrinth's chunk. */
  explored: boolean;
}

/** A Grovekeeper Spirit marker on the minimap. */
export interface MinimapSpirit {
  worldX: number;
  worldZ: number;
  spiritId: string;
  /** True if the spirit has been discovered (added to discoveredSpiritIds). */
  discovered: boolean;
}

/**
 * Full minimap snapshot — consumed by MinimapSVG.
 *
 * `chunks` covers a VIEW_DIAMETER × VIEW_DIAMETER grid centered on the player.
 * Undiscovered positions appear with discovered=false; the renderer shows fog.
 */
export interface MinimapSnapshot {
  /** Grid of chunk cells (active + previously discovered + fog). */
  chunks: MinimapChunk[];
  /** Campfire fast-travel markers within view. */
  campfires: MinimapCampfire[];
  /** NPC dots within view range. */
  npcs: MinimapNpc[];
  /** Labyrinth center markers within view. */
  labyrinths: MinimapLabyrinth[];
  /** Grovekeeper Spirit markers within view. */
  spirits: MinimapSpirit[];
  /** Player world-space position; null until player entity exists. */
  player: MinimapPlayer | null;
  /** Player's current chunk X coordinate (grid center). */
  playerChunkX: number;
  /** Player's current chunk Z coordinate (grid center). */
  playerChunkZ: number;
}
