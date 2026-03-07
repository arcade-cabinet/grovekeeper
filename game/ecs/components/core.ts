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
  stamina: number;
  maxStamina: number;
  hunger: number;
  maxHunger: number;
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
