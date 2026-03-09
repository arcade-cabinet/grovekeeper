/**
 * Vegetation ECS components for GLB-based trees, bushes, and grass.
 *
 * Trees use scale + color tinting for growth stages.
 * Bushes swap GLB references per season.
 * Grass uses instanced rendering for density.
 */

/** Season type shared across vegetation components. */
export type VegetationSeason = "spring" | "summer" | "autumn" | "winter" | "dead";

/** Tree component — GLB-based growth via scale + color tint. */
export interface TreeComponent {
  speciesId: string;
  stage: 0 | 1 | 2 | 3 | 4;
  progress: number;
  watered: boolean;
  totalGrowthTime: number;
  plantedAt: number;
  meshSeed: number;
  wild: boolean;
  pruned: boolean;
  fertilized: boolean;
  baseModel: string;
  winterModel: string;
  useWinterModel: boolean;
  seasonTint: string;
}

/** Seasonal bush — swaps GLB reference when season changes. */
export interface BushComponent {
  bushShape: string;
  season: VegetationSeason;
  hasRoots: boolean;
  modelKey: string;
}

/** Grass blade/patch instance data. */
export interface GrassComponent {
  grassType: string;
  density: number;
}
