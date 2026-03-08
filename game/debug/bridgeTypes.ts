/**
 * bridgeTypes — Public type definitions for the Grovekeeper debug bridge.
 *
 * Spec: §D.1 (Debug Bridge)
 */

// ── Existing read-only types ──────────────────────────────────────────────────

export interface MilestoneRecord {
  name: string;
  timestamp: number;
  gameTimeMicroseconds: number;
  data?: unknown;
}

export interface ECSStats {
  terrainChunks: number;
  trees: number;
  bushes: number;
  npcs: number;
  enemies: number;
  structures: number;
  campfires: number;
  waterBodies: number;
  player: number;
  dayNight: number;
}

export interface DebugGameState {
  screen: string;
  level: number;
  xp: number;
  coins: number;
  resources: Record<string, number>;
  selectedTool: string;
  gridSize: number;
  currentSeason: string;
  gameTimeMicroseconds: number;
  treesPlanted: number;
  treesMatured: number;
  unlockedSpecies: string[];
  prestigeCount: number;
  worldSeed: string;
  difficulty: string;
  stamina: number;
}

// ── Serialised entity snapshots ───────────────────────────────────────────────

export interface TreeEntitySnapshot {
  id: string;
  position: [number, number, number];
  speciesId: string;
  stage: number;
  wild: boolean;
  watered: boolean;
}

export interface NpcEntitySnapshot {
  id: string;
  position: [number, number, number];
  name: string;
  function: string;
  personality: string;
  currentAnim: string;
}

export interface EnemyEntitySnapshot {
  id: string;
  position: [number, number, number];
  enemyType: string;
  tier: number;
  behavior: string;
}

export interface StructureEntitySnapshot {
  id: string;
  position: [number, number, number];
  templateId: string;
  category: string;
  level: number;
  durability?: number;
  maxDurability?: number;
}

export interface ProceduralBuildingSnapshot {
  id: string;
  position: [number, number, number];
  blueprintId: string;
  facing: number;
  variation: number;
  stories: number;
  materialType: string;
}

export interface BushEntitySnapshot {
  id: string;
  position: [number, number, number];
  bushShape: string;
  season: string;
  hasRoots: boolean;
}

export interface RockEntitySnapshot {
  id: string;
  position: [number, number, number];
  templateId: string;
  category: string;
  level: number;
}

export type EntitySnapshot =
  | TreeEntitySnapshot
  | NpcEntitySnapshot
  | EnemyEntitySnapshot
  | StructureEntitySnapshot
  | ProceduralBuildingSnapshot
  | BushEntitySnapshot
  | RockEntitySnapshot;

// ── Bridge interface ──────────────────────────────────────────────────────────

export interface GrovekeeperBridge {
  version: string;

  // ── Read-only observation ───────────────────────────────────────────────────
  /** Snapshot of the Legend State game store (serialisable). */
  getState: () => DebugGameState;
  /** Live ECS entity counts. */
  getECSStats: () => ECSStats;
  /** Extra diagnostics — entity visibility, positions, dayNight ECS values. */
  getDiagnostics: () => Record<string, unknown>;
  /** All milestones recorded so far. */
  getMilestones: () => MilestoneRecord[];
  /** Record a named milestone (called from game logic at key events). */
  recordMilestone: (name: string, data?: unknown) => void;
  /** Direct access to the milestone array (live reference). */
  milestones: MilestoneRecord[];

  // ── Full control (testing) ──────────────────────────────────────────────────
  /**
   * Teleport the player's Rapier rigid body to world coordinates.
   * Clears linear velocity to prevent carry-over momentum.
   */
  teleport: (x: number, y: number, z: number) => void;
  /**
   * Set game time to the given hour (0–24).
   * Uses the formula: hour / 24 * 600 * 1_000_000 microseconds per game day.
   */
  setTime: (hour: number) => void;
  /**
   * Directly set camera yaw (horizontal, radians) and pitch (vertical, radians).
   * Works without pointer lock — writes directly to the useMouseLook refs.
   */
  lookAt: (yaw: number, pitch: number) => void;
  /**
   * Return serialisable snapshots of ECS entities by type name.
   * Supported types: "trees", "structures", "npcs", "enemies",
   * "campfires", "proceduralBuildings", "rocks", "bushes".
   */
  queryEntities: (type: string) => EntitySnapshot[];
  /**
   * Trigger a game action programmatically by action string.
   * Passes minimal context so crafting-station and simple tool actions fire.
   */
  executeAction: (action: string) => void;
  /**
   * Return detailed info about all structures including proceduralBuilding data.
   */
  getStructureDetails: () => ProceduralBuildingSnapshot[];
}

declare global {
  interface Window {
    __GROVEKEEPER__?: GrovekeeperBridge;
  }
}
