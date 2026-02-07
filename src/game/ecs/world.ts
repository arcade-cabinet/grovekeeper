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
  wild?: boolean; // true for trees spawned naturally in wild zones
  pruned?: boolean; // pruned for harvest yield bonus
  fertilized?: boolean; // fertilized for 2x growth for 1 stage cycle
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

export interface ZoneComponent {
  zoneId: string;
  localX: number;
  localZ: number;
}

export interface PropComponent {
  propId: string;
  meshId: string;
}

export interface StructureComponent {
  templateId: string;
  effectType?: "growth_boost" | "harvest_boost" | "stamina_regen" | "storage";
  effectRadius?: number;
  effectMagnitude?: number;
}

export interface RainCatcherComponent {
  radius: number;
}

export interface ScarecrowComponent {
  radius: number;
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
  harvestable?: {
    resources: { type: string; amount: number }[];
    cooldownElapsed: number;
    cooldownTotal: number;
    ready: boolean;
  };
  zone?: ZoneComponent;
  prop?: PropComponent;
  structure?: StructureComponent;
  rainCatcher?: RainCatcherComponent;
  scarecrow?: ScarecrowComponent;
  zoneId?: string;
}

// Create the ECS world
export const world = new World<Entity>();

// Helper to generate unique IDs — uses timestamp prefix to avoid collisions
// after page reload (restored entities get new IDs from this counter)
let entityIdCounter = 0;
export const generateEntityId = (): string => {
  entityIdCounter += 1;
  return `entity_${Date.now()}_${entityIdCounter}`;
};

// Query helpers
export const treesQuery = world.with("tree", "position", "renderable");
export const playerQuery = world.with("player", "position");
export const farmerQuery = world.with("farmerState", "position");
export const gridCellsQuery = world.with("gridCell", "position");
export const harvestableQuery = world.with("tree", "harvestable");
export const structuresQuery = world.with("structure", "position");
export const propsQuery = world.with("prop", "position");
export const rainCatchersQuery = world.with("rainCatcher", "position");
export const scarecrowsQuery = world.with("scarecrow", "position");
