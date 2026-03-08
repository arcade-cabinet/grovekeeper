/**
 * Entity lookup helpers for interaction -- find entities by grid position.
 */
import type { TileState } from "@/components/game/ActionButton";
import type { Entity } from "@/game/ecs/world";
import {
  campfiresQuery,
  npcsQuery,
  playerQuery,
  rocksQuery,
  structuresQuery,
  trapsQuery,
  treesQuery,
  waterBodiesQuery,
} from "@/game/ecs/world";
import type { InteractionSelection } from "./types.ts";
import { NPC_INTERACT_RANGE } from "./types.ts";

/** Convert world position to grid coords (round to nearest integer). */
export function worldToGrid(worldX: number, worldZ: number): { gridX: number; gridZ: number } {
  return {
    gridX: Math.round(worldX),
    gridZ: Math.round(worldZ),
  };
}

/** Find a rock entity at a given grid position. */
export function findRockAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const rock of rocksQuery) {
    if (
      rock.position &&
      Math.round(rock.position.x) === gridX &&
      Math.round(rock.position.z) === gridZ
    ) {
      return rock;
    }
  }
  return null;
}

/** Find a tree entity at a given grid position. */
export function findTreeAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const tree of treesQuery) {
    if (
      tree.position &&
      Math.round(tree.position.x) === gridX &&
      Math.round(tree.position.z) === gridZ
    ) {
      return tree;
    }
  }
  return null;
}

/** Find an NPC entity near a given grid position. */
export function findNpcNear(gridX: number, gridZ: number): Entity | null {
  let closest: Entity | null = null;
  let closestDist = NPC_INTERACT_RANGE;

  for (const npc of npcsQuery) {
    if (!npc.position) continue;
    const dx = npc.position.x - gridX;
    const dz = npc.position.z - gridZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < closestDist) {
      closestDist = dist;
      closest = npc;
    }
  }
  return closest;
}

/** Find a campfire entity at a given grid position. */
export function findCampfireAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const e of campfiresQuery) {
    if (e.position && Math.round(e.position.x) === gridX && Math.round(e.position.z) === gridZ) {
      return e;
    }
  }
  return null;
}

/** Find a forge structure entity at a given grid position. */
export function findForgeAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const e of structuresQuery) {
    if (
      e.structure?.effectType === "forging" &&
      e.position &&
      Math.round(e.position.x) === gridX &&
      Math.round(e.position.z) === gridZ
    ) {
      return e;
    }
  }
  return null;
}

/** Find a water body entity at a given grid position. */
export function findWaterAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const e of waterBodiesQuery) {
    if (e.position && Math.round(e.position.x) === gridX && Math.round(e.position.z) === gridZ) {
      return e;
    }
  }
  return null;
}

/** Find a trap entity at a given grid position. */
export function findTrapAtGrid(gridX: number, gridZ: number): Entity | null {
  for (const e of trapsQuery) {
    if (e.position && Math.round(e.position.x) === gridX && Math.round(e.position.z) === gridZ) {
      return e;
    }
  }
  return null;
}

/** Check if the player is within interaction range of a position. */
export function isPlayerInRange(gridX: number, gridZ: number, range: number): boolean {
  const player = playerQuery.first;
  if (!player?.position) return true;
  const dx = player.position.x - gridX;
  const dz = player.position.z - gridZ;
  return Math.sqrt(dx * dx + dz * dz) <= range;
}

/** Build TileState from current selection using chunk-based entity lookups. */
export function buildTileState(sel: InteractionSelection | null): TileState | null {
  if (!sel) return null;

  const tree = findTreeAtGrid(sel.gridX, sel.gridZ);
  const rock = findRockAtGrid(sel.gridX, sel.gridZ);

  return {
    occupied: !!tree || !!rock,
    treeStage: tree?.tree?.stage ?? -1,
    cellType: rock ? "rock" : "soil",
  };
}
