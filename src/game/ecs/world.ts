import { World } from "miniplex";

// Component types
export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface TreeComponent {
  speciesId: string;
  stage: 0 | 1 | 2 | 3 | 4;
  progress: number; // [0, 1) within current stage
  watered: boolean;
  totalGrowthTime: number; // cumulative seconds grown
  plantedAt: number;
  meshSeed: number; // for deterministic procedural generation
}

export interface PlayerComponent {
  coins: number;
  xp: number;
  level: number;
  currentTool: string;
  unlockedTools: string[];
  unlockedSpecies: string[];
}

export interface GridCellComponent {
  gridX: number;
  gridZ: number;
  type: "soil" | "water" | "rock" | "path";
  occupied: boolean;
  treeEntityId: string | null;
}

export interface Renderable {
  meshId: string | null;
  visible: boolean;
  scale: number;
}

export interface FarmerState {
  stamina: number;
  maxStamina: number;
}

// Entity definition
export interface Entity {
  id: string;
  position?: Position;
  renderable?: Renderable;
  tree?: TreeComponent;
  player?: PlayerComponent;
  gridCell?: GridCellComponent;
  farmerState?: FarmerState;
}

// Create the ECS world
export const world = new World<Entity>();

// Helper to generate unique IDs
let entityIdCounter = 0;
export const generateEntityId = (): string => {
  entityIdCounter += 1;
  return `entity_${entityIdCounter}`;
};

// Query helpers
export const treesQuery = world.with("tree", "position", "renderable");
export const playerQuery = world.with("player", "position");
export const farmerQuery = world.with("farmerState", "position");
export const gridCellsQuery = world.with("gridCell", "position");
