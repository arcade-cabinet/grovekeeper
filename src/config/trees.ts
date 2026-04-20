import treesData from "./trees.json";
import type { ResourceType } from "./resources";

export interface TreeSpeciesData {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  unlockLevel: number;
  biome: string;
  baseGrowthTimes: [number, number, number, number, number]; // seconds per stage 0-4
  yield: { resource: ResourceType; amount: number }[];
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
}

export const TREE_SPECIES: TreeSpeciesData[] =
  treesData.base as unknown as TreeSpeciesData[];

// Prestige-only species (unlocked via prestige system)
export const PRESTIGE_TREE_SPECIES: TreeSpeciesData[] =
  treesData.prestige as unknown as TreeSpeciesData[];

// Combined lookup includes both base and prestige species
const ALL_SPECIES = [...TREE_SPECIES, ...PRESTIGE_TREE_SPECIES];

export const getSpeciesById = (id: string): TreeSpeciesData | undefined =>
  ALL_SPECIES.find((s) => s.id === id);
