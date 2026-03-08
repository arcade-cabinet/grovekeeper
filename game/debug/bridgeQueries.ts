/**
 * bridgeQueries — ECS serialisation helpers for the Grovekeeper debug bridge.
 *
 * All functions are pure (no side effects beyond reading ECS) and exported for
 * unit testing without a running R3F scene.
 *
 * Spec: §D.1 (Debug Bridge)
 */

import {
  bushesQuery,
  campfiresQuery,
  enemiesQuery,
  npcsQuery,
  proceduralBuildingsQuery,
  rocksQuery,
  structuresQuery,
  treesQuery,
} from "@/game/ecs/world";
import type {
  EnemyEntitySnapshot,
  EntitySnapshot,
  NpcEntitySnapshot,
  ProceduralBuildingSnapshot,
  StructureEntitySnapshot,
  TreeEntitySnapshot,
} from "./bridgeTypes.ts";

// ── Serialisers (no circular refs, safe for JSON.stringify) ─────────────────

function serializeTrees(): TreeEntitySnapshot[] {
  return treesQuery.entities.map((e) => ({
    id: e.id,
    position: [e.position.x, e.position.y, e.position.z] as [number, number, number],
    speciesId: e.tree?.speciesId ?? "",
    stage: e.tree?.stage ?? 0,
    wild: e.tree?.wild ?? false,
    watered: e.tree?.watered ?? false,
  }));
}

function serializeNpcs(): NpcEntitySnapshot[] {
  return npcsQuery.entities.map((e) => ({
    id: e.id,
    position: [e.position.x, e.position.y, e.position.z] as [number, number, number],
    name: e.npc?.name ?? "",
    function: e.npc?.function ?? "",
    personality: e.npc?.personality ?? "",
    currentAnim: e.npc?.currentAnim ?? "idle",
  }));
}

function serializeEnemies(): EnemyEntitySnapshot[] {
  return enemiesQuery.entities.map((e) => ({
    id: e.id,
    position: [e.position.x, e.position.y, e.position.z] as [number, number, number],
    enemyType: e.enemy?.enemyType ?? "",
    tier: e.enemy?.tier ?? 0,
    behavior: e.enemy?.behavior ?? "patrol",
  }));
}

function serializeStructures(): StructureEntitySnapshot[] {
  return structuresQuery.entities.map((e) => ({
    id: e.id,
    position: [e.position.x, e.position.y, e.position.z] as [number, number, number],
    templateId: e.structure?.templateId ?? "",
    category: e.structure?.category ?? "",
    level: e.structure?.level ?? 0,
    ...(e.structure?.durability !== undefined ? { durability: e.structure.durability } : {}),
    ...(e.structure?.maxDurability !== undefined
      ? { maxDurability: e.structure.maxDurability }
      : {}),
  }));
}

function serializeCampfires(): StructureEntitySnapshot[] {
  return campfiresQuery.entities.map((e) => ({
    id: e.id,
    position: [e.position.x, e.position.y, e.position.z] as [number, number, number],
    templateId: "campfire",
    category: "essential",
    level: 1,
    lit: e.campfire?.lit,
    fastTravelId: e.campfire?.fastTravelId ?? null,
  })) as StructureEntitySnapshot[];
}

function serializeProceduralBuildings(): ProceduralBuildingSnapshot[] {
  return proceduralBuildingsQuery.entities.map((e) => ({
    id: e.id,
    position: [e.position.x, e.position.y, e.position.z] as [number, number, number],
    blueprintId: e.proceduralBuilding?.blueprintId ?? "",
    facing: e.proceduralBuilding?.facing ?? 0,
    variation: e.proceduralBuilding?.variation ?? 0,
    stories: e.proceduralBuilding?.stories ?? 1,
    materialType: e.proceduralBuilding?.materialType ?? "timber",
  }));
}

function serializeRocks(): EntitySnapshot[] {
  return rocksQuery.entities.map((e) => ({
    id: e.id,
    position: [e.position.x, e.position.y, e.position.z] as [number, number, number],
    templateId: "rock",
    category: "terrain",
    level: 0,
  })) as StructureEntitySnapshot[];
}

function serializeBushes(): EntitySnapshot[] {
  return bushesQuery.entities.map((e) => ({
    id: e.id,
    position: [e.position.x, e.position.y, e.position.z] as [number, number, number],
    bushShape: e.bush?.bushShape ?? "",
    season: e.bush?.season ?? "spring",
    hasRoots: e.bush?.hasRoots ?? false,
  }));
}

// ── Public API ───────────────────────────────────────────────────────────────

const QUERY_MAP: Record<string, () => EntitySnapshot[]> = {
  trees: serializeTrees,
  npcs: serializeNpcs,
  enemies: serializeEnemies,
  structures: serializeStructures,
  campfires: serializeCampfires,
  proceduralBuildings: serializeProceduralBuildings,
  rocks: serializeRocks,
  bushes: serializeBushes,
};

/**
 * Return serialisable snapshots of ECS entities by type name.
 * Returns an empty array for unknown type names (safe for Playwright callers).
 */
export function queryEntities(type: string): EntitySnapshot[] {
  const fn = QUERY_MAP[type];
  if (!fn) return [];
  return fn();
}

/** Return supported query type names (used by tests). */
export function getSupportedQueryTypes(): string[] {
  return Object.keys(QUERY_MAP);
}

/**
 * Return detailed snapshots of all procedural buildings.
 * Includes blueprintId, facing, variation, stories, and materialType.
 */
export function getStructureDetails(): ProceduralBuildingSnapshot[] {
  return serializeProceduralBuildings();
}

/**
 * Convert a game hour (0–24) to gameTimeMicroseconds.
 * Game day = 600 real seconds. Formula: hour / 24 * 600 * 1_000_000.
 * Exported for unit testing (pure, no side effects).
 */
export function hourToMicroseconds(hour: number): number {
  return (hour / 24) * 600 * 1_000_000;
}
