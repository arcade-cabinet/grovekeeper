/**
 * Target resolution + selection helpers for the PlayerGovernor.
 * All functions are pure (no class state) -- they receive what they need.
 */

import {
  findHarvestableTrees,
  findMatureTrees,
  findPlantableTiles,
  findWaterableTrees,
  getPlayerTile,
} from "@/game/actions";
import type { ResourceType } from "@/game/config/resources";
import { getSpeciesById } from "@/game/config/species";
import { useGameStore } from "@/game/stores";
import { scopedRNG } from "@/game/utils/seedWords";
import type { ActionTarget, ActionType, GovernorProfile, PlayerGovernorConfig } from "./types.ts";

type TileCell = { gridX: number; gridZ: number };

// ──────────────────────────────────────────────
// Selection helpers
// ──────────────────────────────────────────────

export function pickSpecies(profile: GovernorProfile): string | null {
  const store = useGameStore.getState();
  const LOW_THRESHOLD = 5;
  const neededResources: ResourceType[] = [];
  if (store.resources.sap < LOW_THRESHOLD) neededResources.push("sap");
  if (store.resources.fruit < LOW_THRESHOLD) neededResources.push("fruit");
  if (store.resources.acorns < LOW_THRESHOLD) neededResources.push("acorns");

  if (neededResources.length > 0) {
    for (const [sp, count] of Object.entries(store.seeds)) {
      if (count <= 0) continue;
      const species = getSpeciesById(sp);
      if (!species) continue;
      if (species.yield.some((y) => neededResources.includes(y.resource as ResourceType))) {
        return sp;
      }
    }
  }

  if (profile.preferredSpecies) {
    for (const sp of profile.preferredSpecies) {
      if ((store.seeds[sp] ?? 0) > 0 && getSpeciesById(sp)) return sp;
    }
  }

  for (const [sp, count] of Object.entries(store.seeds)) {
    if (count > 0 && getSpeciesById(sp)) return sp;
  }
  return null;
}

export function pickNearestTile(tiles: TileCell[], px: number, pz: number): TileCell {
  let closest = tiles[0];
  let minDist = Number.POSITIVE_INFINITY;
  for (const tile of tiles) {
    const dx = tile.gridX - px;
    const dz = tile.gridZ - pz;
    const dist = dx * dx + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      closest = tile;
    }
  }
  return closest;
}

export function pickNearestEntity(
  entities: { id: string; position?: { x: number; z: number } }[],
  px: number,
  pz: number,
): (typeof entities)[0] {
  let closest = entities[0];
  let minDist = Number.POSITIVE_INFINITY;
  for (const entity of entities) {
    if (!entity.position) continue;
    const dx = entity.position.x - px;
    const dz = entity.position.z - pz;
    const dist = dx * dx + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      closest = entity;
    }
  }
  return closest;
}

// ──────────────────────────────────────────────
// Target resolution
// ──────────────────────────────────────────────

/**
 * Find the specific tile + entity for a chosen action.
 * exploreCountRef.current is incremented on each explore decision for unique RNG.
 */
export function resolveTarget(
  action: ActionType,
  config: PlayerGovernorConfig,
  profile: GovernorProfile,
  exploreCountRef: { current: number },
): ActionTarget | null {
  const playerTile = getPlayerTile();
  const px = playerTile?.gridX ?? 0;
  const pz = playerTile?.gridZ ?? 0;

  switch (action) {
    case "plant": {
      const tiles = findPlantableTiles();
      if (tiles.length === 0) return null;
      const speciesId = pickSpecies(profile);
      if (!speciesId) return null;
      const tile = pickNearestTile(tiles, px, pz);
      return { action: "plant", tileX: tile.gridX, tileZ: tile.gridZ, speciesId };
    }
    case "water": {
      const trees = findWaterableTrees();
      if (trees.length === 0) return null;
      const tree = pickNearestEntity(trees, px, pz);
      return {
        action: "water",
        tileX: Math.round(tree.position?.x ?? 0),
        tileZ: Math.round(tree.position?.z ?? 0),
        entityId: tree.id,
      };
    }
    case "harvest": {
      const trees = findHarvestableTrees();
      if (trees.length === 0) return null;
      const tree = pickNearestEntity(trees, px, pz);
      return {
        action: "harvest",
        tileX: Math.round(tree.position?.x ?? 0),
        tileZ: Math.round(tree.position?.z ?? 0),
        entityId: tree.id,
      };
    }
    case "prune": {
      const trees = findMatureTrees().filter((t) => t.tree && !t.tree.pruned);
      if (trees.length === 0) return null;
      const tree = pickNearestEntity(trees, px, pz);
      return {
        action: "prune",
        tileX: Math.round(tree.position?.x ?? 0),
        tileZ: Math.round(tree.position?.z ?? 0),
        entityId: tree.id,
      };
    }
    case "trade":
      return { action: "trade", tileX: px, tileZ: pz };
    case "explore": {
      const bounds = config.getWorldBounds();
      const rangeX = bounds.maxX - bounds.minX;
      const rangeZ = bounds.maxZ - bounds.minZ;
      const worldSeed = useGameStore.getState().worldSeed;
      const rng = scopedRNG("governor-explore", worldSeed, exploreCountRef.current++);
      const tx = bounds.minX + Math.floor(rng() * rangeX);
      const tz = bounds.minZ + Math.floor(rng() * rangeZ);
      return { action: "explore", tileX: tx, tileZ: tz };
    }
  }
}
