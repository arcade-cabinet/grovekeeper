import { World } from "miniplex";

export * from "./components/building.ts";
export * from "./components/combat.ts";
// Re-export all component types for backward compatibility
export * from "./components/core.ts";
export * from "./components/dialogue.ts";
export * from "./components/items.ts";
export * from "./components/npc.ts";
export * from "./components/procedural/index.ts";
export * from "./components/structures.ts";
export * from "./components/terrain.ts";
export * from "./components/vegetation.ts";

import type {
  BuildableComponent,
  LightSourceComponent,
  ModularPieceComponent,
} from "./components/building.ts";
import type {
  CombatComponent,
  EnemyComponent,
  HealthComponent,
  LootDropComponent,
} from "./components/combat.ts";
import type {
  ChunkComponent,
  Harvestable,
  PlayerComponent,
  Position,
  PropComponent,
  RainCatcherComponent,
  Renderable,
  ScarecrowComponent,
} from "./components/core.ts";
import type { DialogueComponent, QuestBranchComponent } from "./components/dialogue.ts";
import type { FoodComponent, ToolComponent, TrapComponent } from "./components/items.ts";
import type { NpcComponent } from "./components/npc.ts";
import type {
  BirmotherComponent,
  DayNightComponent,
  FogVolumeComponent,
  GrovekeeperSpiritComponent,
  ParticleEmitterComponent,
  PathSegmentComponent,
  SignpostComponent,
  SkyComponent,
  SoundscapeComponent,
  TerrainChunkComponent,
  WaterBodyComponent,
  WeatherComponent,
} from "./components/procedural/index.ts";
import type {
  CampfireComponent,
  CropComponent,
  StructureComponent,
} from "./components/structures.ts";
import type {
  FenceComponent,
  HedgeComponent,
  HedgeDecorationComponent,
  RockComponent,
} from "./components/terrain.ts";
import type { BushComponent, GrassComponent, TreeComponent } from "./components/vegetation.ts";

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
  gridCell?: {
    gridX: number;
    gridZ: number;
    type: "soil" | "water" | "rock" | "path";
    occupied: boolean;
    treeEntityId: string | null;
  };

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
