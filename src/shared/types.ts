/**
 * Grove Keeper - Core Type Definitions
 * All game types exported from this central file
 */

// ============================================
// Position & Grid Types
// ============================================

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface GridPosition {
  gridX: number;
  gridZ: number;
}

// ============================================
// Tree Types
// ============================================

export type TreeSpecies =
  | "oak"
  | "birch"
  | "pine"
  | "maple"
  | "cherry"
  | "redwood"
  | "willow"
  | "bamboo";

export type GrowthStage =
  | "seed"
  | "sprout"
  | "seedling"
  | "sapling"
  | "young"
  | "mature"
  | "ancient";

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface TreeDefinition {
  name: string;
  species: TreeSpecies;
  difficulty: Difficulty;
  baseGrowthTime: number; // milliseconds
  rewards: {
    coins: number;
    xp: number;
  };
  waterNeeds: "low" | "medium" | "high";
  unlockLevel: number;
  description: string;
  color: string; // Leaf color for procedural generation
}

export interface TreeComponent {
  species: TreeSpecies;
  growthStage: GrowthStage;
  growthProgress: number; // 0-100
  health: number; // 0-100
  plantedAt: number; // Timestamp
  wateredAt: number | null;
  fertilizedAt: number | null;
}

// ============================================
// Tool Types
// ============================================

export type ToolType =
  | "shovel"
  | "wateringCan"
  | "pruningShears"
  | "fertilizer"
  | "axe"
  | "rake"
  | "seedPouch";

export interface ToolDefinition {
  type: ToolType;
  name: string;
  description: string;
  cost: number;
  unlockLevel: number;
  actions: string[];
  icon: string;
}

export interface ToolComponent {
  type: ToolType;
  durability: number;
  level: number;
  isEquipped: boolean;
}

// ============================================
// Grid Cell Types
// ============================================

export type CellType = "soil" | "water" | "rock" | "path" | "grass";

export interface GridCellComponent {
  gridX: number;
  gridZ: number;
  cellType: CellType;
  occupiedBy: string | null;
  moisture: number; // 0-100
  fertility: number; // 0-100
  isHighlighted: boolean;
}

// ============================================
// Player Types
// ============================================

export type Direction = "north" | "south" | "east" | "west";

export interface Inventory {
  seeds: Record<TreeSpecies, number>;
  fertilizer: number;
}

export interface PlayerComponent {
  name: string;
  coins: number;
  xp: number;
  level: number;
  currentTool: ToolType;
  inventory: Inventory;
  facing: Direction;
  isMoving: boolean;
}

export interface PlayerStats {
  coins: number;
  xp: number;
  level: number;
  treesPlanted: number;
  treesMature: number;
  daysPlayed: number;
  currentStreak: number;
}

// ============================================
// Entity Types (ECS)
// ============================================

export interface Entity {
  id: string;
  position?: Position;
  tree?: TreeComponent;
  player?: PlayerComponent;
  gridCell?: GridCellComponent;
  tool?: ToolComponent;
}

// ============================================
// Game State Types
// ============================================

export type GamePhase = "menu" | "loading" | "playing" | "paused";

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticEnabled: boolean;
  graphicsQuality: "low" | "medium" | "high";
  showTutorial: boolean;
}

export interface GameState {
  gamePhase: GamePhase;
  playerStats: PlayerStats;
  unlockedSpecies: TreeSpecies[];
  unlockedTools: ToolType[];
  settings: GameSettings;
}

// ============================================
// Save Data Types
// ============================================

export interface TreeSave {
  entityId: string;
  species: TreeSpecies;
  growthStage: GrowthStage;
  growthProgress: number;
  health: number;
  plantedAt: number;
  position: GridPosition;
}

export interface GridCellSave {
  gridX: number;
  gridZ: number;
  cellType: CellType;
  moisture: number;
  fertility: number;
  occupiedBy: string | null;
}

export interface SaveData {
  version: string;
  player: {
    name: string;
    coins: number;
    xp: number;
    level: number;
    unlockedTools: ToolType[];
    unlockedSpecies: TreeSpecies[];
    inventory: Inventory;
    stats: PlayerStats;
  };
  grid: {
    size: { width: number; height: number };
    cells: GridCellSave[];
  };
  trees: TreeSave[];
  settings: GameSettings;
  lastPlayed: string;
}

// ============================================
// Event Types
// ============================================

export type GameEvent =
  | { type: "TREE_PLANTED"; species: TreeSpecies; position: Position }
  | { type: "TREE_GREW"; entityId: string; newStage: GrowthStage }
  | { type: "TREE_MATURED"; entityId: string }
  | { type: "TREE_DIED"; entityId: string }
  | { type: "TOOL_USED"; tool: ToolType; position: Position }
  | { type: "LEVEL_UP"; newLevel: number }
  | { type: "ACHIEVEMENT_UNLOCKED"; achievement: string }
  | { type: "COINS_EARNED"; amount: number; source: string }
  | { type: "XP_EARNED"; amount: number; source: string };

// ============================================
// Achievement Types
// ============================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
  requirement: {
    type:
      | "trees_planted"
      | "trees_mature"
      | "level"
      | "species_unlocked"
      | "days_played";
    value: number;
  };
}

// ============================================
// Daily Reward Types
// ============================================

export interface DailyReward {
  day: number;
  type: "coins" | "seeds" | "tool" | "premium";
  amount: number;
  species?: TreeSpecies;
  tool?: ToolType;
}
