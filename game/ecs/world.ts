import { World } from "miniplex";

// Re-export all component types for backward compatibility
export * from "./components/core";
export * from "./components/npc";
export * from "./components/combat";
export * from "./components/building";
export * from "./components/structures";
export * from "./components/items";
export * from "./components/vegetation";
export * from "./components/terrain";
export * from "./components/procedural";
export * from "./components/dialogue";

import type {
  Position,
  Renderable,
  PlayerComponent,
  PropComponent,
  RainCatcherComponent,
  ScarecrowComponent,
  Harvestable,
  ChunkComponent,
} from "./components/core";

import type { NpcComponent } from "./components/npc";

import type {
  EnemyComponent,
  HealthComponent,
  CombatComponent,
  LootDropComponent,
} from "./components/combat";

import type {
  ModularPieceComponent,
  BuildableComponent,
  LightSourceComponent,
} from "./components/building";

import type {
  StructureComponent,
  CampfireComponent,
  CropComponent,
} from "./components/structures";

import type {
  FoodComponent,
  ToolComponent,
  TrapComponent,
} from "./components/items";

import type {
  TreeComponent,
  BushComponent,
  GrassComponent,
} from "./components/vegetation";

import type {
  FenceComponent,
  RockComponent,
  HedgeComponent,
  HedgeDecorationComponent,
} from "./components/terrain";

import type {
  TerrainChunkComponent,
  PathSegmentComponent,
  SignpostComponent,
  WaterBodyComponent,
  SkyComponent,
  DayNightComponent,
  WeatherComponent,
  FogVolumeComponent,
  ParticleEmitterComponent,
  SoundscapeComponent,
  GrovekeeperSpiritComponent,
  BirmotherComponent,
} from "./components/procedural";

import type {
  DialogueComponent,
  QuestBranchComponent,
} from "./components/dialogue";

/** Unified entity definition — all components optional. */
export interface Entity {
  id: string;

  // Core spatial
  position?: Position;
  renderable?: Renderable;
  /** Y-axis rotation in radians. Used by static entity batch renderers. */
  rotationY?: number;
  chunk?: ChunkComponent;
  zoneId?: string;

  // Player
  player?: PlayerComponent;

  // Trees & vegetation
  tree?: TreeComponent;
  harvestable?: Harvestable;
  bush?: BushComponent;
  grass?: GrassComponent;
  crop?: CropComponent;

  // NPCs (appearance + personality + animation all in NpcComponent)
  npc?: NpcComponent;

  // Combat & enemies
  enemy?: EnemyComponent;
  health?: HealthComponent;
  combat?: CombatComponent;
  lootDrop?: LootDropComponent;

  // Structures
  structure?: StructureComponent;
  campfire?: CampfireComponent;

  // Base building (Fallout-style kitbashing)
  modularPiece?: ModularPieceComponent;
  buildable?: BuildableComponent;
  lightSource?: LightSourceComponent;

  // Terrain features
  fence?: FenceComponent;
  rock?: RockComponent;
  hedge?: HedgeComponent;
  hedgeDecoration?: HedgeDecorationComponent;
  gridCell?: { gridX: number; gridZ: number; type: "soil" | "water" | "rock" | "path"; occupied: boolean; treeEntityId: string | null };

  // Items
  food?: FoodComponent;
  tool?: ToolComponent;
  trap?: TrapComponent;

  // Props & effects
  prop?: PropComponent;
  rainCatcher?: RainCatcherComponent;
  scarecrow?: ScarecrowComponent;

  // Procedural (shader/particle — no GLB models)
  terrainChunk?: TerrainChunkComponent;
  pathSegment?: PathSegmentComponent;
  signpost?: SignpostComponent;
  waterBody?: WaterBodyComponent;
  sky?: SkyComponent;
  dayNight?: DayNightComponent;
  weather?: WeatherComponent;
  fogVolume?: FogVolumeComponent;
  particleEmitter?: ParticleEmitterComponent;
  ambientZone?: SoundscapeComponent;
  grovekeeperSpirit?: GrovekeeperSpiritComponent;
  birchmother?: BirmotherComponent;

  // Dialogue & quest branching
  dialogue?: DialogueComponent;
  questBranch?: QuestBranchComponent;
}

// Create the ECS world
export const world = new World<Entity>();

let entityIdCounter = 0;
export const generateEntityId = (): string => {
  entityIdCounter += 1;
  return `entity_${Date.now()}_${entityIdCounter}`;
};

// --- Queries ---

// Trees & vegetation
export const treesQuery = world.with("tree", "position", "renderable");
export const harvestableQuery = world.with("tree", "harvestable");
export const bushesQuery = world.with("bush", "position", "renderable");
export const grassQuery = world.with("grass", "position");
export const cropsQuery = world.with("crop", "position", "renderable");

// NPCs
export const npcsQuery = world.with("npc", "position", "renderable");

// Combat & enemies
export const enemiesQuery = world.with("enemy", "position", "renderable");
export const combatQuery = world.with("combat", "health", "position");
export const lootDropsQuery = world.with("lootDrop", "position");

// Structures
export const structuresQuery = world.with("structure", "position");
export const campfiresQuery = world.with("campfire", "position");
export const rainCatchersQuery = world.with("rainCatcher", "position");
export const scarecrowsQuery = world.with("scarecrow", "position");

// Base building
export const modularPiecesQuery = world.with("modularPiece", "position");
export const buildablesQuery = world.with("buildable");
export const lightSourcesQuery = world.with("lightSource", "position");

// Terrain features
export const fencesQuery = world.with("fence", "position", "renderable");
export const rocksQuery = world.with("rock", "position", "renderable");
export const hedgesQuery = world.with("hedge", "position");
export const hedgeDecorationsQuery = world.with("hedgeDecoration", "position");

// Items
export const foodQuery = world.with("food", "position");
export const trapsQuery = world.with("trap", "position");

// Props
export const propsQuery = world.with("prop", "position");

// Player
export const playerQuery = world.with("player", "position");

// Procedural
export const terrainChunksQuery = world.with("terrainChunk", "position");
export const pathSegmentsQuery = world.with("pathSegment", "position");
export const signpostsQuery = world.with("signpost", "position");
export const waterBodiesQuery = world.with("waterBody", "position");
export const skyQuery = world.with("sky");
export const dayNightQuery = world.with("dayNight");
export const weatherQuery = world.with("weather");
export const fogVolumesQuery = world.with("fogVolume", "position");
export const particleEmittersQuery = world.with("particleEmitter", "position");
export const ambientZonesQuery = world.with("ambientZone", "position");
export const grovekeeperSpiritsQuery = world.with("grovekeeperSpirit", "position");
export const birmotherQuery = world.with("birchmother", "position");

// Dialogue & quest branching
export const dialogueQuery = world.with("dialogue");
export const activeDialogueQuery = world.with("dialogue", "position");
export const questBranchQuery = world.with("questBranch");

