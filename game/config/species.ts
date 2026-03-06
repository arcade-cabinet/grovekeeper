/**
 * Tree species data accessors backed by config/game/species.json.
 */

import speciesData from "@/config/game/species.json";

export interface TreeSpeciesData {
  id: string;
  name: string;
  difficulty: number;
  unlockLevel: number;
  biome: string;
  baseGrowthTimes: number[];
  yield: { resource: string; amount: number }[];
  harvestCycleSec: number;
  seedCost: Record<string, number>;
  special: string;
  evergreen: boolean;
  meshParams: {
    trunkHeight: number;
    trunkRadius: number;
    canopyRadius: number;
    canopySegments: number;
    color: { trunk: string; canopy: string };
  };
  requiredPrestiges?: number;
}

export const TREE_SPECIES: TreeSpeciesData[] =
  speciesData.base as unknown as TreeSpeciesData[];

export const PRESTIGE_TREE_SPECIES: TreeSpeciesData[] =
  speciesData.prestige as unknown as TreeSpeciesData[];

const ALL_SPECIES = [...TREE_SPECIES, ...PRESTIGE_TREE_SPECIES];

export const getSpeciesById = (id: string): TreeSpeciesData | undefined =>
  ALL_SPECIES.find((s) => s.id === id);
