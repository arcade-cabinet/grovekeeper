/**
 * villageGenerator -- Generates buildings, NPCs, and campfire for
 * village-type landmark chunks.
 *
 * Spec §19.3 (Procedural NPCs) + §31.1 (landmark village chunks).
 * Spec §17.3a: Rootmere (chunk 0,0) uses FIXED authored structure placements.
 *
 * Village layout:
 *   - Campfire placed at the village center (fast travel point).
 *   - Chunk (0,0) = Rootmere: fixed 7-structure layout (authored, not seeded).
 *   - Other village chunks: 3-8 buildings radially distributed (seeded).
 *   - 2-4 NPCs with seeded appearance, personality, and daily schedules.
 *
 * Pure function — same worldSeed + chunkX + chunkZ + heightmap always
 * produces identical village data. All randomness via scopedRNG.
 */

import gridConfig from "@/config/game/grid.json" with { type: "json" };
import structuresData from "@/config/game/structures.json" with { type: "json" };
import type {
  NpcAnimState,
  NpcComponent,
  NpcFunction,
  NpcPersonalityType,
  NpcScheduleEntry,
} from "@/game/ecs/components/npc";
import type { CampfireComponent, StructureComponent } from "@/game/ecs/components/structures";
import { scopedRNG } from "@/game/utils/seedWords";
import { getLandmarkLocalPos, getLandmarkType } from "./pathGenerator.ts";

const CHUNK_SIZE: number = gridConfig.chunkSize;

// ── Constants (tuning values from config/game/structures.json villageGeneration) ──

const vg = structuresData.villageGeneration;
const MIN_BUILDINGS: number = vg.minBuildings;
const MAX_BUILDINGS: number = vg.maxBuildings;
const MIN_NPC_COUNT: number = vg.minNpcCount;
const MAX_NPC_COUNT: number = vg.maxNpcCount;
const BUILDING_MIN_DISTANCE: number = vg.buildingMinDistance;
const BUILDING_MAX_DISTANCE: number = vg.buildingMaxDistance;
const BUILDING_ANGLE_JITTER: number = vg.buildingAngleJitter;
const NPC_BASE_MODEL_COUNT: number = vg.npcBaseModelCount;
const NPC_SPAWN_RADIUS: number = vg.npcSpawnRadius;
const NPC_SPAWN_MIN_DISTANCE: number = vg.npcSpawnMinDistance;
const SCHEDULE_HOME_OFFSET: number = vg.scheduleHomeOffset;
const SCHEDULE_WORK_OFFSET: number = vg.scheduleWorkOffset;
const SCHEDULE_HOURS = vg.scheduleHours;

/** Structure template IDs eligible for procedural village placement. */
const VILLAGE_BUILDING_IDS: readonly string[] = [
  "house-1",
  "house-2",
  "house-3",
  "house-4",
  "house-5",
  "barn",
  "water-well",
  "storage-1",
  "storage-2",
  "windmill",
  "chicken-coop-1",
  "notice-board",
];

const NPC_FUNCTIONS: NpcFunction[] = ["trading", "quests", "tips", "seeds", "crafting", "lore"];

const NPC_PERSONALITIES: NpcPersonalityType[] = [
  "cheerful",
  "grumpy",
  "wise",
  "shy",
  "bold",
  "curious",
  "stoic",
  "playful",
  "stern",
  "gentle",
];

const NPC_NAMES: readonly string[] = [
  "Fen",
  "Briar",
  "Moss",
  "Rowan",
  "Cedar",
  "Fern",
  "Birch",
  "Ash",
  "Ivy",
  "Wren",
  "Linden",
  "Elara",
  "Thorne",
  "Alder",
  "Reed",
  "Hazel",
  "Clover",
  "Sorrel",
  "Willow",
  "Elder",
];

// ── Types ─────────────────────────────────────────────────────────────────────

/** A structure entity ready to be added to ECS. */
export interface BuildingPlacement {
  position: { x: number; y: number; z: number };
  rotationY: number;
  structure: StructureComponent;
}

/** Campfire entity ready to be added to ECS (holds both components). */
export interface CampfirePlacement {
  position: { x: number; y: number; z: number };
  structure: StructureComponent;
  campfire: CampfireComponent;
}

/** NPC entity ready to be added to ECS. */
export interface NpcPlacement {
  position: { x: number; y: number; z: number };
  npc: NpcComponent;
}

/** All village entity placements for one chunk. */
export interface VillageGenerationResult {
  campfire: CampfirePlacement;
  buildings: BuildingPlacement[];
  npcs: NpcPlacement[];
}

// ── Config lookup ─────────────────────────────────────────────────────────────

interface StructureEntry {
  id: string;
  category: string;
  modelPath: string;
  effectType?: string;
  effectRadius?: number;
  effectMagnitude?: number;
  maxDurability?: number;
  level: number;
  buildCost: Array<{ resource: string; amount: number }>;
}

const structureMap = new Map<string, StructureEntry>(
  (structuresData.structures as StructureEntry[]).map((s) => [s.id, s]),
);

/** Resolve a structure template to a StructureComponent. */
function resolveStructure(templateId: string): StructureComponent {
  const s = structureMap.get(templateId);
  if (!s) throw new Error(`villageGenerator: unknown structure templateId "${templateId}"`);
  return {
    templateId: s.id,
    category: s.category as StructureComponent["category"],
    modelPath: s.modelPath,
    effectType: s.effectType as StructureComponent["effectType"],
    effectRadius: s.effectRadius,
    effectMagnitude: s.effectMagnitude,
    maxDurability: s.maxDurability,
    level: s.level,
    // Pre-placed village structures have no build cost (they already exist).
    buildCost: [],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clampToChunk(v: number): number {
  return Math.min(Math.max(v, 1), CHUNK_SIZE - 2);
}

function heightAt(heightmap: Float32Array, localX: number, localZ: number): number {
  const ix = Math.min(Math.floor(Math.max(localX, 0)), CHUNK_SIZE - 1);
  const iz = Math.min(Math.floor(Math.max(localZ, 0)), CHUNK_SIZE - 1);
  return heightmap[iz * CHUNK_SIZE + ix];
}

/**
 * Build a 4-entry NPC daily schedule around a village center.
 * Positions are in world space.
 */
function buildNpcSchedule(
  chunkX: number,
  chunkZ: number,
  centerLocalX: number,
  centerLocalZ: number,
  rng: () => number,
): NpcScheduleEntry[] {
  const homeX = clampToChunk(centerLocalX + (rng() - 0.5) * SCHEDULE_HOME_OFFSET);
  const homeZ = clampToChunk(centerLocalZ + (rng() - 0.5) * SCHEDULE_HOME_OFFSET);
  const workX = clampToChunk(centerLocalX + (rng() - 0.5) * SCHEDULE_WORK_OFFSET);
  const workZ = clampToChunk(centerLocalZ + (rng() - 0.5) * SCHEDULE_WORK_OFFSET);
  const wX = chunkX * CHUNK_SIZE;
  const wZ = chunkZ * CHUNK_SIZE;
  return [
    { hour: SCHEDULE_HOURS.wake, activity: "wake", position: { x: wX + homeX, z: wZ + homeZ } },
    { hour: SCHEDULE_HOURS.work, activity: "work", position: { x: wX + workX, z: wZ + workZ } },
    {
      hour: SCHEDULE_HOURS.wander,
      activity: "wander",
      position: { x: wX + centerLocalX, z: wZ + centerLocalZ },
    },
    { hour: SCHEDULE_HOURS.sleep, activity: "sleep", position: { x: wX + homeX, z: wZ + homeZ } },
  ];
}


// ── Rootmere fixed layout (Spec §17.3a) ──────────────────────────────────────

/**
 * Village center for Rootmere (chunk 0,0): tile (8,8) = world (8,8).
 */
const ROOTMERE_CENTER_X = 8;
const ROOTMERE_CENTER_Z = 8;

/**
 * Name of the starting village. Spec §17.3a: "Village is named 'Rootmere'".
 */
export const ROOTMERE_NAME = "Rootmere";

/**
 * Fixed structure placements for Rootmere (chunk 0,0).
 * Offsets are relative to the village center tile (8,8).
 *
 * Spec §17.3a layout:
 *   Elder Rowan's Hut:     offset (0, 0)   -> world (8, 8)   — house-1
 *   Village Well:          offset (3, 0)   -> world (11, 8)  — water-well
 *   Campfire Ring:         offset (-3, 2)  -> world (5, 10)  — campfire-2
 *   Seed Merchant Stall:   offset (2, 3)   -> world (10, 11) — notice-board
 *   Storage Shed:          offset (-2, -3) -> world (6, 5)   — storage-1
 *   Notice Board:          offset (0, 3)   -> world (8, 11)  — notice-board
 *   Village Gate:          offset (0, -8)  -> world (8, 0)   — wooden-frame
 */
interface RootmereFixedBuilding {
  offsetX: number;
  offsetZ: number;
  templateId: string;
  rotationY: number;
}

const ROOTMERE_FIXED_BUILDINGS: readonly RootmereFixedBuilding[] = [
  { offsetX: 0, offsetZ: 0, templateId: "house-1", rotationY: 0 },
  { offsetX: 3, offsetZ: 0, templateId: "water-well", rotationY: 0 },
  { offsetX: -3, offsetZ: 2, templateId: "campfire-2", rotationY: 0 },
  { offsetX: 2, offsetZ: 3, templateId: "notice-board", rotationY: Math.PI / 2 },
  { offsetX: -2, offsetZ: -3, templateId: "storage-1", rotationY: Math.PI },
  { offsetX: 0, offsetZ: 3, templateId: "notice-board", rotationY: 0 },
  { offsetX: 0, offsetZ: -8, templateId: "wooden-frame", rotationY: 0 },
];

/**
 * Generate the fixed Rootmere village layout for chunk (0,0).
 * Buildings are authored (not seeded); NPCs are still seeded.
 */
function generateRootmere(worldSeed: string, heightmap: Float32Array): VillageGenerationResult {
  const rng = scopedRNG("village", worldSeed, 0, 0);
  const centerY = heightAt(heightmap, ROOTMERE_CENTER_X, ROOTMERE_CENTER_Z);

  const campfire: CampfirePlacement = {
    position: { x: ROOTMERE_CENTER_X, y: centerY, z: ROOTMERE_CENTER_Z },
    structure: resolveStructure("campfire-1"),
    campfire: { lit: true, fastTravelId: "village-0-0", cookingSlots: 2 },
  };

  const buildings: BuildingPlacement[] = ROOTMERE_FIXED_BUILDINGS.map((fb) => {
    const lx = clampToChunk(ROOTMERE_CENTER_X + fb.offsetX);
    const lz = clampToChunk(ROOTMERE_CENTER_Z + fb.offsetZ);
    return {
      position: { x: lx, y: heightAt(heightmap, lx, lz), z: lz },
      rotationY: fb.rotationY,
      structure: resolveStructure(fb.templateId),
    };
  });

  const npcCount = MIN_NPC_COUNT + Math.floor(rng() * (MAX_NPC_COUNT - MIN_NPC_COUNT + 1));
  const npcs: NpcPlacement[] = [];
  for (let i = 0; i < npcCount; i++) {
    const angle = rng() * Math.PI * 2;
    const distance = NPC_SPAWN_MIN_DISTANCE + rng() * NPC_SPAWN_RADIUS;
    const lx = clampToChunk(ROOTMERE_CENTER_X + Math.cos(angle) * distance);
    const lz = clampToChunk(ROOTMERE_CENTER_Z + Math.sin(angle) * distance);
    const y = heightAt(heightmap, lx, lz);
    const modelIndex = 1 + Math.floor(rng() * NPC_BASE_MODEL_COUNT);
    const npcFunction = NPC_FUNCTIONS[Math.floor(rng() * NPC_FUNCTIONS.length)];
    const personality = NPC_PERSONALITIES[Math.floor(rng() * NPC_PERSONALITIES.length)];
    const name = NPC_NAMES[Math.floor(rng() * NPC_NAMES.length)];
    const schedule = buildNpcSchedule(0, 0, ROOTMERE_CENTER_X, ROOTMERE_CENTER_Z, rng);
    npcs.push({
      position: { x: lx, y, z: lz },
      npc: {
        templateId: `rootmere-npc-${i}`,
        function: npcFunction,
        interactable: true,
        requiredLevel: 1,
        baseModel: `assets/models/npcs/chibi-${modelIndex}.glb`,
        useEmission: false,
        items: {},
        colorPalette: "#FFCCBC",
        name,
        personality,
        dialogue: `rootmere-npc-${i}`,
        schedule,
        currentAnim: "idle" as NpcAnimState,
        animProgress: 0,
        animSpeed: 1,
      },
    });
  }
  return { campfire, buildings, npcs };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a village for a landmark chunk.
 *
 * Returns null if the chunk is not a village-type landmark.
 *
 * Algorithm:
 *   1. Guard: return null unless getLandmarkType === "village".
 *   2. Place campfire at village center with a unique fast travel ID.
 *   3. Place 3-8 buildings radially around the center (seeded angle + distance).
 *   4. Spawn 2-4 NPCs near the center with seeded appearance and schedules.
 *
 * Spec §19.3: Procedural NPC population.
 * Spec §31.1: Village landmark chunks.
 *
 * @param worldSeed  World seed string.
 * @param chunkX     Chunk X grid coordinate.
 * @param chunkZ     Chunk Z grid coordinate.
 * @param heightmap  CHUNK_SIZE×CHUNK_SIZE Float32Array (row-major: z*size+x).
 * @returns          Village placements, or null if not a village chunk.
 */
export function generateVillage(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  heightmap: Float32Array,
): VillageGenerationResult | null {
  if (getLandmarkType(worldSeed, chunkX, chunkZ) !== "village") return null;

  // ── Chunk (0,0) = Rootmere: fixed authored layout (Spec §17.3a) ───────────
  if (chunkX === 0 && chunkZ === 0) {
    return generateRootmere(worldSeed, heightmap);
  }

  // ── Other village chunks: procedural layout ───────────────────────────────
  const { localX, localZ } = getLandmarkLocalPos(worldSeed, chunkX, chunkZ);
  const rng = scopedRNG("village", worldSeed, chunkX, chunkZ);

  const worldBaseX = chunkX * CHUNK_SIZE;
  const worldBaseZ = chunkZ * CHUNK_SIZE;
  const centerY = heightAt(heightmap, localX, localZ);

  // ── Campfire at village center ─────────────────────────────────────────────
  const campfire: CampfirePlacement = {
    position: { x: worldBaseX + localX, y: centerY, z: worldBaseZ + localZ },
    structure: resolveStructure("campfire-1"),
    campfire: {
      lit: true,
      fastTravelId: `village-${chunkX}-${chunkZ}`,
      cookingSlots: 2,
    },
  };

  // ── Buildings radially distributed around center ───────────────────────────
  const buildingCount = MIN_BUILDINGS + Math.floor(rng() * (MAX_BUILDINGS - MIN_BUILDINGS + 1));
  const buildings: BuildingPlacement[] = [];

  for (let i = 0; i < buildingCount; i++) {
    // Evenly spread angles with seeded jitter so buildings don't cluster.
    const angle = (i / buildingCount) * Math.PI * 2 + (rng() - 0.5) * BUILDING_ANGLE_JITTER;
    const distance =
      BUILDING_MIN_DISTANCE + rng() * (BUILDING_MAX_DISTANCE - BUILDING_MIN_DISTANCE);
    const lx = clampToChunk(localX + Math.cos(angle) * distance);
    const lz = clampToChunk(localZ + Math.sin(angle) * distance);
    const templateId = VILLAGE_BUILDING_IDS[Math.floor(rng() * VILLAGE_BUILDING_IDS.length)];
    const rotationY = rng() * Math.PI * 2;
    const y = heightAt(heightmap, lx, lz);

    buildings.push({
      position: { x: worldBaseX + lx, y, z: worldBaseZ + lz },
      rotationY,
      structure: resolveStructure(templateId),
    });
  }

  // ── NPCs near village center ───────────────────────────────────────────────
  const npcCount = MIN_NPC_COUNT + Math.floor(rng() * (MAX_NPC_COUNT - MIN_NPC_COUNT + 1));
  const npcs: NpcPlacement[] = [];

  for (let i = 0; i < npcCount; i++) {
    const angle = rng() * Math.PI * 2;
    const distance = NPC_SPAWN_MIN_DISTANCE + rng() * NPC_SPAWN_RADIUS;
    const lx = clampToChunk(localX + Math.cos(angle) * distance);
    const lz = clampToChunk(localZ + Math.sin(angle) * distance);
    const y = heightAt(heightmap, lx, lz);

    const modelIndex = 1 + Math.floor(rng() * NPC_BASE_MODEL_COUNT);
    const npcFunction = NPC_FUNCTIONS[Math.floor(rng() * NPC_FUNCTIONS.length)];
    const personality = NPC_PERSONALITIES[Math.floor(rng() * NPC_PERSONALITIES.length)];
    const name = NPC_NAMES[Math.floor(rng() * NPC_NAMES.length)];
    const schedule = buildNpcSchedule(chunkX, chunkZ, localX, localZ, rng);

    npcs.push({
      position: { x: worldBaseX + lx, y, z: worldBaseZ + lz },
      npc: {
        templateId: `village-npc-${chunkX}-${chunkZ}-${i}`,
        function: npcFunction,
        interactable: true,
        requiredLevel: 1,
        baseModel: `assets/models/npcs/chibi-${modelIndex}.glb`,
        useEmission: false,
        items: {},
        colorPalette: "#FFCCBC",
        name,
        personality,
        dialogue: `village-${chunkX}-${chunkZ}-npc-${i}`,
        schedule,
        currentAnim: "idle" as NpcAnimState,
        animProgress: 0,
        animSpeed: 1,
      },
    });
  }

  return { campfire, buildings, npcs };
}