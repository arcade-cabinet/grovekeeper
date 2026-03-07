/**
 * Achievement system types.
 * Spec §25 -- Achievements and Milestones
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category:
    | "planting"
    | "harvesting"
    | "growing"
    | "collection"
    | "mastery"
    | "social"
    | "exploration"
    | "seasonal"
    | "economy";
  check: (stats: PlayerStats) => boolean;
}

export interface PlayerStats {
  treesPlanted: number;
  treesHarvested: number;
  treesWatered: number;
  totalTimber: number;
  totalSap: number;
  totalFruit: number;
  totalAcorns: number;
  level: number;
  speciesPlanted: string[];
  maxStageReached: number;
  currentGridSize: number;
  prestigeCount: number;
  questsCompleted: number;
  recipesUnlocked: number;
  structuresPlaced: number;
  oldGrowthCount: number;
  npcsFriended: number;
  totalDaysPlayed: number;
  tradeCount: number;
  festivalCount: number;
  discoveryCount: number;
  /** Total unique zones/chunks visited (store.discoveredZones.length). Spec §25.3 */
  chunksVisited: number;
  /** Unique biome types encountered (store.visitedZoneTypes.length). Spec §25.3 */
  biomesDiscovered: number;
  /** Grovekeeper Spirits found (store.discoveredSpiritIds.length). Spec §32.3 */
  spiritsDiscovered: number;
}
