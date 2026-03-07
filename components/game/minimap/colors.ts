/**
 * Minimap color constants (Spec §17.6).
 *
 * Biome colors mirror the TerrainChunkComponent.baseColor palette used by the
 * terrain vertex shader, giving visual consistency between the 3D scene and map.
 */

/** Fallback color for a chunk whose biomeColor is missing or empty. */
export const DISCOVERED_FALLBACK_COLOR = "#3A4B3E";

/** Color shown for chunks the player has never visited. */
export const FOG_COLOR = "#1A1C1A";

/** Campfire marker color when lit. */
export const CAMPFIRE_LIT_COLOR = "#FF8C42";

/** Campfire marker color when unlit / cold. */
export const CAMPFIRE_UNLIT_COLOR = "#8D6E63";

/** NPC dot color. */
export const NPC_DOT_COLOR = "#81C784";

/** Player indicator fill. */
export const PLAYER_FILL = "#FFC107";

/** Player indicator stroke. */
export const PLAYER_STROKE = "#FF8F00";

/** Map border / frame color (PSX bark brown). */
export const BARK_BROWN = "#5D4037";

/** Map background (deep soil dark). */
export const SOIL_DARK = "#3E2723";

/** Overlay sky mist text color. */
export const SKY_MIST = "#E8F5E9";
