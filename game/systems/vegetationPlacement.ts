/**
 * Vegetation placement system -- maps species to GLB models,
 * handles seasonal bush swaps, and provides grass density rules.
 *
 * All randomness via scopedRNG. All tuning values from config JSON.
 */
import { createRNG, hashString } from "@/game/utils/seedRNG";
import type { BushComponent, VegetationSeason } from "@/game/ecs/components/vegetation";
import vegetationConfig from "@/config/game/vegetation.json";

/**
 * Maps a game species ID to a base tree model key.
 * 15 species mapped across 8 retro_nature_pack + 36 tree_pack_1.1 models.
 * Seeded by speciesId so each species always gets the same GLB.
 */
export function speciesToTreeModel(speciesId: string): {
  baseModel: string;
  winterModel: string;
  pack: "retro" | "extra";
} {
  const mapping = vegetationConfig.speciesModelMapping;
  const entry = mapping[speciesId as keyof typeof mapping];

  if (entry) {
    return { ...entry, pack: entry.pack as "retro" | "extra" };
  }

  // Fallback: deterministic selection from retro pack for unknown species
  const hash = hashString(speciesId);
  const retroCount = 8;
  const index = (hash % retroCount) + 1;
  const padded = String(index).padStart(2, "0");
  return {
    baseModel: `tree${padded}`,
    winterModel: index <= 6 ? `tree${padded}_winter` : "",
    pack: "retro",
  };
}

/**
 * Resolves the full asset path for a tree model key.
 */
export function resolveTreeModelPath(
  modelKey: string,
  pack: "retro" | "extra",
  isWinter: boolean,
): string {
  if (isWinter && modelKey) {
    return pack === "retro"
      ? `trees/winter/${modelKey}.glb`
      : `trees/base/${modelKey}.glb`;
  }
  if (pack === "extra") {
    return `trees/extra/${modelKey}.glb`;
  }
  return `trees/base/${modelKey}.glb`;
}

/**
 * Computes the seasonal tint color for a tree's canopy.
 */
export function getSeasonalTreeTint(
  speciesId: string,
  season: VegetationSeason,
  isEvergreen: boolean,
): string {
  if (isEvergreen) {
    return vegetationConfig.seasonalTints.evergreen[season] ?? "#2E7D32";
  }
  const speciesTints =
    vegetationConfig.seasonalTints.bySpecies[
      speciesId as keyof typeof vegetationConfig.seasonalTints.bySpecies
    ];
  if (speciesTints) {
    return speciesTints[season] ?? "#388E3C";
  }
  return vegetationConfig.seasonalTints.deciduous[season] ?? "#388E3C";
}

/**
 * Resolves the bush model key for a given shape + season + roots combo.
 * Pattern: bushes/{season}/{shape}_{season}.glb
 * Roots:   bushes/{season}/{shape}_roots_{season}.glb
 */
export function resolveBushModelKey(
  bushShape: string,
  season: VegetationSeason,
  hasRoots: boolean,
): string {
  const rootsSuffix = hasRoots ? "_roots" : "";
  return `bushes/${season}/${bushShape}${rootsSuffix}_${season}.glb`;
}

/**
 * Updates a bush component when the season changes.
 * Returns a new modelKey pointing to the correct seasonal GLB.
 */
export function updateBushSeason(
  bush: BushComponent,
  newSeason: VegetationSeason,
): BushComponent {
  return {
    ...bush,
    season: newSeason,
    modelKey: resolveBushModelKey(bush.bushShape, newSeason, bush.hasRoots),
  };
}

/**
 * Selects grass types and densities for a given biome using seeded RNG.
 * Returns an array of { grassType, density } entries for tile population.
 */
export function selectGrassForBiome(
  biome: string,
  tileSeed: number,
): Array<{ grassType: string; density: number }> {
  const rng = createRNG(tileSeed);
  const biomeConfig =
    vegetationConfig.biomeGrass[biome as keyof typeof vegetationConfig.biomeGrass] ??
    vegetationConfig.biomeGrass.temperate;

  const result: Array<{ grassType: string; density: number }> = [];

  for (const entry of biomeConfig.types) {
    const roll = rng();
    if (roll < entry.probability) {
      const densityVariation = 1 + (rng() - 0.5) * entry.densityVariance;
      result.push({
        grassType: entry.grassType,
        density: Math.max(1, Math.round(entry.baseDensity * densityVariation)),
      });
    }
  }

  return result;
}

/**
 * Selects a random bush shape using seeded RNG for chunk placement.
 */
export function selectRandomBushShape(seed: number): {
  bushShape: string;
  hasRoots: boolean;
} {
  const rng = createRNG(seed);
  const shapes = vegetationConfig.bushShapes;
  const index = Math.floor(rng() * shapes.length);
  const shape = shapes[index];
  const hasRoots = rng() < vegetationConfig.bushRootsProbability;
  return { bushShape: shape, hasRoots };
}
