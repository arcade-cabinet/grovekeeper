/**
 * Core ECS component interfaces.
 *
 * Foundational components used across all entity types.
 */

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Renderable {
  visible: boolean;
  scale: number;
  modelPath?: string;
}

export interface PlayerComponent {
  coins: number;
  xp: number;
  level: number;
  currentTool: string;
  unlockedTools: string[];
  unlockedSpecies: string[];
}

export interface PropComponent {
  propId: string;
  modelPath?: string;
}

export interface RainCatcherComponent {
  radius: number;
}

export interface ScarecrowComponent {
  radius: number;
}

export interface Harvestable {
  resources: { type: string; amount: number }[];
  cooldownElapsed: number;
  cooldownTotal: number;
  ready: boolean;
}

export interface ChunkComponent {
  chunkX: number;
  chunkZ: number;
  biome: string;
}

// --- LEGACY: Used in 25+ files. Remove during Phase 0-1 (grid→chunk migration) ---

export interface GridCellComponent {
  gridX: number;
  gridZ: number;
  type: "soil" | "water" | "rock" | "path";
  occupied: boolean;
  treeEntityId: string | null;
}

export interface FarmerState {
  stamina: number;
  maxStamina: number;
}

export interface ZoneComponent {
  zoneId: string;
  localX: number;
  localZ: number;
}
