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

export const TREE_SPECIES: TreeSpeciesData[] = [
  {
    id: "white-oak",
    name: "White Oak",
    difficulty: 1,
    unlockLevel: 1,
    biome: "Temperate",
    baseGrowthTimes: [10, 15, 20, 25, 30],
    yield: [{ resource: "timber", amount: 2 }],
    harvestCycleSec: 45,
    seedCost: {},
    special: "Starter tree, reliable",
    evergreen: false,
    meshParams: {
      trunkHeight: 1.8,
      trunkRadius: 0.15,
      canopyRadius: 0.9,
      canopySegments: 8,
      color: { trunk: "#5D4037", canopy: "#388E3C" },
    },
  },
  {
    id: "weeping-willow",
    name: "Weeping Willow",
    difficulty: 2,
    unlockLevel: 2,
    biome: "Wetland",
    baseGrowthTimes: [12, 18, 24, 30, 36],
    yield: [{ resource: "sap", amount: 3 }],
    harvestCycleSec: 60,
    seedCost: { sap: 5 },
    special: "+30% yield near water tiles",
    evergreen: false,
    meshParams: {
      trunkHeight: 2.0,
      trunkRadius: 0.12,
      canopyRadius: 1.1,
      canopySegments: 10,
      color: { trunk: "#6D4C41", canopy: "#66BB6A" },
    },
  },
  {
    id: "elder-pine",
    name: "Elder Pine",
    difficulty: 2,
    unlockLevel: 3,
    biome: "Mountain",
    baseGrowthTimes: [12, 16, 22, 28, 35],
    yield: [
      { resource: "timber", amount: 2 },
      { resource: "sap", amount: 1 },
    ],
    harvestCycleSec: 50,
    seedCost: { timber: 5 },
    special: "Grows at 30% in Winter",
    evergreen: true,
    meshParams: {
      trunkHeight: 2.2,
      trunkRadius: 0.13,
      canopyRadius: 0.7,
      canopySegments: 6,
      color: { trunk: "#4E342E", canopy: "#1B5E20" },
    },
  },
  {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    difficulty: 3,
    unlockLevel: 5,
    biome: "Temperate",
    baseGrowthTimes: [15, 22, 30, 38, 45],
    yield: [{ resource: "fruit", amount: 2 }],
    harvestCycleSec: 75,
    seedCost: { fruit: 8 },
    special: "Beauty Aura: +10% XP within 1 tile",
    evergreen: false,
    meshParams: {
      trunkHeight: 1.6,
      trunkRadius: 0.1,
      canopyRadius: 1.0,
      canopySegments: 10,
      color: { trunk: "#3E2723", canopy: "#F48FB1" },
    },
  },
  {
    id: "ghost-birch",
    name: "Ghost Birch",
    difficulty: 3,
    unlockLevel: 6,
    biome: "Tundra Edge",
    baseGrowthTimes: [14, 20, 28, 36, 42],
    yield: [
      { resource: "sap", amount: 2 },
      { resource: "acorns", amount: 1 },
    ],
    harvestCycleSec: 55,
    seedCost: { sap: 6, acorns: 2 },
    special: "50% growth in Winter; night glow",
    evergreen: false,
    meshParams: {
      trunkHeight: 2.0,
      trunkRadius: 0.1,
      canopyRadius: 0.8,
      canopySegments: 8,
      color: { trunk: "#E0E0E0", canopy: "#B0BEC5" },
    },
  },
  {
    id: "redwood",
    name: "Redwood",
    difficulty: 4,
    unlockLevel: 8,
    biome: "Coastal",
    baseGrowthTimes: [20, 30, 45, 60, 75],
    yield: [{ resource: "timber", amount: 5 }],
    harvestCycleSec: 120,
    seedCost: { timber: 15 },
    special: "Tallest; Old Growth: +1 Acorn/cycle",
    evergreen: true,
    meshParams: {
      trunkHeight: 3.0,
      trunkRadius: 0.2,
      canopyRadius: 1.0,
      canopySegments: 8,
      color: { trunk: "#8D6E63", canopy: "#2E7D32" },
    },
  },
  {
    id: "flame-maple",
    name: "Flame Maple",
    difficulty: 4,
    unlockLevel: 10,
    biome: "Highland",
    baseGrowthTimes: [18, 26, 36, 48, 58],
    yield: [{ resource: "fruit", amount: 3 }],
    harvestCycleSec: 90,
    seedCost: { fruit: 12 },
    special: "Beauty Aura 2-tile; 2x yield in Autumn",
    evergreen: false,
    meshParams: {
      trunkHeight: 2.0,
      trunkRadius: 0.14,
      canopyRadius: 1.1,
      canopySegments: 10,
      color: { trunk: "#6D4C41", canopy: "#E65100" },
    },
  },
  {
    id: "baobab",
    name: "Baobab",
    difficulty: 5,
    unlockLevel: 12,
    biome: "Savanna",
    baseGrowthTimes: [25, 35, 50, 65, 80],
    yield: [
      { resource: "timber", amount: 2 },
      { resource: "sap", amount: 2 },
      { resource: "fruit", amount: 2 },
    ],
    harvestCycleSec: 150,
    seedCost: { timber: 10, sap: 10, fruit: 10 },
    special: "Drought resist; all resources; 2-tile footprint",
    evergreen: false,
    meshParams: {
      trunkHeight: 2.5,
      trunkRadius: 0.3,
      canopyRadius: 1.3,
      canopySegments: 8,
      color: { trunk: "#795548", canopy: "#558B2F" },
    },
  },
];

export const getSpeciesById = (id: string): TreeSpeciesData | undefined =>
  TREE_SPECIES.find((s) => s.id === id);

// Backwards-compatible alias for existing code that uses getTreeById
export const getTreeById = getSpeciesById;
