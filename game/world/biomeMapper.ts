/**
 * Biome mapper — assigns one of 8 biome types per chunk from temperature + moisture noise.
 *
 * Spec §17.3: biomes are derived from two independent noise axes:
 *   - temperature: cold (0) → warm (1)
 *   - moisture:    dry (0)  → wet (1)
 *
 * Special rules:
 *   - Starting Grove is forced within a 2-chunk radius of the origin (handled by callers).
 *   - Twilight Glade only appears 20+ chunks from origin.
 */

/** All valid biome identifiers (Spec §17.3). */
export type BiomeType =
  | "starting-grove"
  | "meadow"
  | "ancient-forest"
  | "wetlands"
  | "rocky-highlands"
  | "orchard-valley"
  | "frozen-peaks"
  | "twilight-glade";

/** Terrain base color hex per biome — used for vertex colors on terrain chunks. */
export const BIOME_COLORS: Record<BiomeType, string> = {
  "starting-grove": "#4a7c3f",
  meadow: "#7ab648",
  "ancient-forest": "#2d5a27",
  wetlands: "#3a6b4e",
  "rocky-highlands": "#7a6b5a",
  "orchard-valley": "#8ab640",
  "frozen-peaks": "#d4e8f0",
  "twilight-glade": "#5a3a7c",
};

/**
 * Map temperature + moisture to one of 8 biome types (Spec §17.3).
 *
 * Priority order (first match wins):
 *   1. Frozen Peaks  — temperature < 0.2
 *   2. Wetlands      — moisture > 0.8
 *   3. Rocky Highlands — cold + dry (temp 0.2–0.4, moisture < 0.3)
 *   4. Orchard Valley  — warm + moderate moisture (temp > 0.6, moisture 0.5–0.7)
 *   5. Twilight Glade  — moderate temp + moisture, 20+ chunks from origin
 *   6. Ancient Forest  — moderate temp + high moisture (temp 0.3–0.5, moisture 0.6–0.8)
 *   7. Meadow          — warm + dry (temp > 0.5, moisture < 0.5)
 *   8. Starting Grove  — default fallback
 *
 * @param temperature     Normalized [0, 1] temperature noise value.
 * @param moisture        Normalized [0, 1] moisture noise value.
 * @param distanceFromOrigin  Chebyshev chunk distance from world origin (default 0).
 */
export function assignBiome(
  temperature: number,
  moisture: number,
  distanceFromOrigin = 0,
): BiomeType {
  // 1. Frozen Peaks: coldest region
  if (temperature < 0.2) return "frozen-peaks";

  // 2. Wetlands: highest moisture
  if (moisture > 0.8) return "wetlands";

  // 3. Rocky Highlands: cold + dry
  if (temperature >= 0.2 && temperature < 0.4 && moisture < 0.3) return "rocky-highlands";

  // 4. Orchard Valley: warm + moderate moisture
  if (temperature > 0.6 && moisture >= 0.5 && moisture <= 0.7) return "orchard-valley";

  // 5. Twilight Glade: moderate temp + moisture, far from origin
  if (
    distanceFromOrigin >= 20 &&
    temperature >= 0.3 &&
    temperature <= 0.5 &&
    moisture >= 0.5 &&
    moisture <= 0.7
  ) {
    return "twilight-glade";
  }

  // 6. Ancient Forest: moderate temp + high moisture
  if (temperature >= 0.3 && temperature <= 0.5 && moisture >= 0.6) return "ancient-forest";

  // 7. Meadow: warm + low moisture
  if (temperature > 0.5 && moisture < 0.5) return "meadow";

  // 8. Starting Grove: default
  return "starting-grove";
}

/** Return the terrain base color hex string for a given biome. */
export function getBiomeColor(biome: BiomeType): string {
  return BIOME_COLORS[biome];
}
