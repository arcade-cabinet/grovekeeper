import type { ResourceType } from "./resources";
import treesData from "./trees.json";

export interface TreeSpeciesData {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  unlockLevel: number;
  biome: string;
  /** 1-2 sentence cozy/gardeny flavour shown in the codex and seed picker. */
  description?: string;
  /** 1 sentence player-facing hint shown before the species is unlocked. */
  codexHint?: string;
  /** The season in which this species grows most vigorously. */
  preferredSeason?: "spring" | "summer" | "autumn" | "winter";
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

/**
 * Runtime shape check for one tree species record. Throws with a
 * location-hinting message if the JSON has drifted from the interface.
 * Cheap (one per species at load, ~18 total), worth it to fail fast
 * instead of crashing deep in mesh generation on a bad config.
 */
function validateSpecies(raw: unknown, path: string): TreeSpeciesData {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`trees.json: ${path} is not an object`);
  }
  const r = raw as Record<string, unknown>;
  const requireType = (key: string, expected: string): void => {
    const actual = typeof r[key];
    if (actual !== expected) {
      throw new Error(
        `trees.json: ${path}.${key} must be ${expected}, got ${actual}`,
      );
    }
  };
  requireType("id", "string");
  requireType("name", "string");
  requireType("difficulty", "number");
  requireType("unlockLevel", "number");
  requireType("biome", "string");
  requireType("harvestCycleSec", "number");
  requireType("special", "string");
  requireType("evergreen", "boolean");
  if (!Array.isArray(r.baseGrowthTimes) || r.baseGrowthTimes.length !== 5) {
    throw new Error(
      `trees.json: ${path}.baseGrowthTimes must be a 5-tuple of numbers`,
    );
  }
  if (!Array.isArray(r.yield)) {
    throw new Error(`trees.json: ${path}.yield must be an array`);
  }
  if (typeof r.meshParams !== "object" || r.meshParams === null) {
    throw new Error(`trees.json: ${path}.meshParams must be an object`);
  }
  return r as unknown as TreeSpeciesData;
}

function validateSpeciesList(
  raw: unknown,
  key: "base" | "prestige",
): TreeSpeciesData[] {
  if (!Array.isArray(raw)) {
    throw new Error(`trees.json: ${key} must be an array`);
  }
  return raw.map((item, i) => validateSpecies(item, `${key}[${i}]`));
}

export const TREE_SPECIES: TreeSpeciesData[] = validateSpeciesList(
  treesData.base,
  "base",
);

// Prestige-only species (unlocked via prestige system)
export const PRESTIGE_TREE_SPECIES: TreeSpeciesData[] = validateSpeciesList(
  treesData.prestige,
  "prestige",
);

// Combined lookup includes both base and prestige species
const ALL_SPECIES = [...TREE_SPECIES, ...PRESTIGE_TREE_SPECIES];

export const getSpeciesById = (id: string): TreeSpeciesData | undefined =>
  ALL_SPECIES.find((s) => s.id === id);

// Exported for tests; safe to call at runtime but unlikely to be useful.
export const __testing = { validateSpecies, validateSpeciesList };
