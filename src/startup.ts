import type { Entity } from "koota";
import { koota } from "@/koota";
import type { NpcFunction } from "@/npcs/types";
import { hashString } from "@/shared/utils/seedRNG";
import { getStageScale } from "@/systems/growth";
import { GridCell, Npc, Position, Renderable, Tree } from "@/traits";

/**
 * Koota-native entity spawners — successors to src/archetypes.ts
 * (which still exists for miniplex consumers during coexistence).
 *
 * Pattern ref: reference-codebases/koota/examples/revade/src/actions.ts —
 * spawners return the entity; callers add more traits/relations as
 * needed.
 */

export interface SerializedTreeInput {
  speciesId: string;
  gridX: number;
  gridZ: number;
  stage: 0 | 1 | 2 | 3 | 4;
  progress: number;
  watered: boolean;
  totalGrowthTime: number;
  plantedAt: number;
  meshSeed: number;
}

export function spawnTree(
  gridX: number,
  gridZ: number,
  speciesId: string,
): Entity {
  return koota.spawn(
    Position({ x: gridX, y: 0, z: gridZ }),
    Tree({
      speciesId,
      stage: 0,
      progress: 0,
      watered: false,
      totalGrowthTime: 0,
      plantedAt: Date.now(),
      meshSeed: hashString(`${speciesId}-${gridX}-${gridZ}`),
    }),
    Renderable({ meshId: null, visible: true, scale: 0 }),
  );
}

export function restoreTree(data: SerializedTreeInput): Entity {
  return koota.spawn(
    Position({ x: data.gridX, y: 0, z: data.gridZ }),
    Tree({
      speciesId: data.speciesId,
      stage: data.stage,
      progress: data.progress,
      watered: data.watered,
      totalGrowthTime: data.totalGrowthTime,
      plantedAt: data.plantedAt,
      meshSeed: data.meshSeed,
    }),
    Renderable({
      meshId: null,
      visible: true,
      scale: getStageScale(data.stage, data.progress),
    }),
  );
}

export function spawnWildTree(
  gridX: number,
  gridZ: number,
  speciesId: string,
  stage: 0 | 1 | 2 | 3 | 4,
): Entity {
  const seed = hashString(`wild-${speciesId}-${gridX}-${gridZ}`);
  const progress = ((seed >>> 0) % 1000) / 2000;
  return koota.spawn(
    Position({ x: gridX, y: 0, z: gridZ }),
    Tree({
      speciesId,
      stage,
      progress,
      watered: false,
      totalGrowthTime: 0,
      plantedAt: Date.now(),
      meshSeed: seed,
      wild: true,
    }),
    Renderable({
      meshId: null,
      visible: true,
      scale: getStageScale(stage, progress),
    }),
  );
}

export function spawnGridCell(
  gridX: number,
  gridZ: number,
  type: "soil" | "water" | "rock" | "path" = "soil",
): Entity {
  return koota.spawn(
    Position({ x: gridX, y: 0, z: gridZ }),
    GridCell({
      gridX,
      gridZ,
      type,
      occupied: false,
      treeEntityId: null,
    }),
  );
}

export function spawnNpc(
  worldX: number,
  worldZ: number,
  templateId: string,
  npcFunction: NpcFunction,
  playerLevel: number,
  requiredLevel: number,
): Entity {
  return koota.spawn(
    Position({ x: worldX, y: 0, z: worldZ }),
    Npc({
      templateId,
      function: npcFunction,
      interactable: playerLevel >= requiredLevel,
      requiredLevel,
    }),
    Renderable({ meshId: null, visible: true, scale: 1 }),
  );
}
