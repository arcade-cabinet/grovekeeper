/**
 * Minimap snapshot — reads ECS + store state into a plain MinimapSnapshot.
 *
 * Two exported surfaces:
 *   buildMinimapSnapshot(params) -- pure function, testable with plain objects
 *   readMinimapSnapshot()        -- ECS adapter; calls buildMinimapSnapshot
 *
 * Spec §17.6 (Map & Navigation): explored chunks, biome colors, feature icons.
 */

import gridConfig from "@/config/game/grid.json" with { type: "json" };
import {
  campfiresQuery,
  grovekeeperSpiritsQuery,
  npcsQuery,
  playerQuery,
  terrainChunksQuery,
} from "@/game/ecs/world";
import { useGameStore } from "@/game/stores/gameStore";
import { isLabyrinthChunk } from "@/game/world/mazeGenerator";

import { DISCOVERED_FALLBACK_COLOR } from "./colors.ts";
import type {
  MinimapCampfire,
  MinimapChunk,
  MinimapLabyrinth,
  MinimapNpc,
  MinimapSnapshot,
  MinimapSpirit,
} from "./types.ts";

const CHUNK_SIZE: number = gridConfig.chunkSize;

/** How many chunks to show on each side of the player (view = 2*R+1 square). */
export const VIEW_RADIUS = 3;

// ---------------------------------------------------------------------------
// Pure builder — testable without ECS
// ---------------------------------------------------------------------------

export interface BuildSnapshotParams {
  /** Active terrain chunks from ECS. */
  activeChunks: Array<{ chunkX: number; chunkZ: number; baseColor: string }>;
  /** Previously discovered chunk colors from store. key = "cx,cz". */
  discoveredStore: Record<string, string>;
  /** Campfire entities from ECS. */
  campfireEntities: Array<{
    worldX: number;
    worldZ: number;
    fastTravelId: string | null;
    lit: boolean;
  }>;
  /** NPC entities from ECS. */
  npcEntities: Array<{ worldX: number; worldZ: number }>;
  /** Labyrinth center positions within view. */
  labyrinthEntities: Array<{ worldX: number; worldZ: number; explored: boolean }>;
  /** Grovekeeper Spirit entities from ECS. */
  spiritEntities: Array<{ worldX: number; worldZ: number; spiritId: string; discovered: boolean }>;
  /** Player world position; null if no player entity. */
  playerPos: { x: number; z: number } | null;
  chunkSize: number;
  viewRadius: number;
}

export function buildMinimapSnapshot(params: BuildSnapshotParams): MinimapSnapshot {
  const {
    activeChunks,
    discoveredStore,
    campfireEntities,
    npcEntities,
    labyrinthEntities,
    spiritEntities,
    playerPos,
    chunkSize,
    viewRadius,
  } = params;

  // Derive player chunk coords
  const playerChunkX = playerPos ? Math.floor(playerPos.x / chunkSize) : 0;
  const playerChunkZ = playerPos ? Math.floor(playerPos.z / chunkSize) : 0;

  // Build a fast lookup: "cx,cz" -> baseColor for active chunks
  const activeMap = new Map<string, string>();
  for (const c of activeChunks) {
    activeMap.set(`${c.chunkX},${c.chunkZ}`, c.baseColor);
  }

  // Build chunk grid for view: (2*viewRadius+1)^2 cells centered on player
  const chunks: MinimapChunk[] = [];
  for (let dz = -viewRadius; dz <= viewRadius; dz++) {
    for (let dx = -viewRadius; dx <= viewRadius; dx++) {
      const cx = playerChunkX + dx;
      const cz = playerChunkZ + dz;
      const key = `${cx},${cz}`;
      const activeColor = activeMap.get(key);
      if (activeColor !== undefined) {
        chunks.push({ chunkX: cx, chunkZ: cz, biomeColor: activeColor, discovered: true });
      } else if (discoveredStore[key]) {
        chunks.push({
          chunkX: cx,
          chunkZ: cz,
          biomeColor: discoveredStore[key] ?? DISCOVERED_FALLBACK_COLOR,
          discovered: true,
        });
      } else {
        chunks.push({ chunkX: cx, chunkZ: cz, biomeColor: "", discovered: false });
      }
    }
  }

  // Filter campfires within view bounds
  const viewWorldRadius = viewRadius * chunkSize;
  const px = playerPos?.x ?? 0;
  const pz = playerPos?.z ?? 0;
  const campfires: MinimapCampfire[] = campfireEntities.filter(
    (c) => Math.abs(c.worldX - px) <= viewWorldRadius && Math.abs(c.worldZ - pz) <= viewWorldRadius,
  );

  // Filter NPCs within view bounds
  const npcs: MinimapNpc[] = npcEntities.filter(
    (n) => Math.abs(n.worldX - px) <= viewWorldRadius && Math.abs(n.worldZ - pz) <= viewWorldRadius,
  );

  // Filter labyrinths within view bounds
  const labyrinths: MinimapLabyrinth[] = labyrinthEntities.filter(
    (l) => Math.abs(l.worldX - px) <= viewWorldRadius && Math.abs(l.worldZ - pz) <= viewWorldRadius,
  );

  // Filter spirits within view bounds
  const spirits: MinimapSpirit[] = spiritEntities.filter(
    (s) => Math.abs(s.worldX - px) <= viewWorldRadius && Math.abs(s.worldZ - pz) <= viewWorldRadius,
  );

  return {
    chunks,
    campfires,
    npcs,
    labyrinths,
    spirits,
    player: playerPos,
    playerChunkX,
    playerChunkZ,
  };
}

// ---------------------------------------------------------------------------
// ECS adapter — auto-discovers active chunks as a side effect
// ---------------------------------------------------------------------------

export function readMinimapSnapshot(): MinimapSnapshot {
  const store = useGameStore.getState();

  // Collect active terrain chunks + auto-discover them
  const activeChunks: Array<{ chunkX: number; chunkZ: number; baseColor: string }> = [];
  for (const entity of terrainChunksQuery) {
    const tc = entity.terrainChunk;
    const ch = entity.chunk;
    if (!tc || !ch) continue;
    activeChunks.push({ chunkX: ch.chunkX, chunkZ: ch.chunkZ, baseColor: tc.baseColor });
    // Side-effect: persist discovery for fog-of-war
    store.discoverChunk(ch.chunkX, ch.chunkZ, tc.baseColor);
  }

  // Collect campfire entities
  const campfireEntities: Array<{
    worldX: number;
    worldZ: number;
    fastTravelId: string | null;
    lit: boolean;
  }> = [];
  for (const entity of campfiresQuery) {
    const cf = entity.campfire;
    const pos = entity.position;
    if (!cf || !pos) continue;
    campfireEntities.push({
      worldX: pos.x,
      worldZ: pos.z,
      fastTravelId: cf.fastTravelId,
      lit: cf.lit,
    });
  }

  // Collect nearby NPC entities
  const npcEntities: Array<{ worldX: number; worldZ: number }> = [];
  for (const entity of npcsQuery) {
    const pos = entity.position;
    if (!pos) continue;
    npcEntities.push({ worldX: pos.x, worldZ: pos.z });
  }

  // Collect labyrinth center positions from terrain chunk scan.
  // isLabyrinthChunk() determines whether a chunk hosts a labyrinth based on
  // worldSeed + chunk coords (no additional ECS component needed).
  const labyrinthEntities: Array<{ worldX: number; worldZ: number; explored: boolean }> = [];
  const worldSeed = store.worldSeed || "default";
  for (const entity of terrainChunksQuery) {
    const ch = entity.chunk;
    if (!ch) continue;
    if (!isLabyrinthChunk(worldSeed, ch.chunkX, ch.chunkZ)) continue;
    // Center of maze chunk in world space
    const worldX = ch.chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
    const worldZ = ch.chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2;
    const key = `${ch.chunkX},${ch.chunkZ}`;
    const explored = key in store.discoveredChunks;
    labyrinthEntities.push({ worldX, worldZ, explored });
  }

  // Collect Grovekeeper Spirit entities
  const spiritEntities: Array<{
    worldX: number;
    worldZ: number;
    spiritId: string;
    discovered: boolean;
  }> = [];
  for (const entity of grovekeeperSpiritsQuery) {
    const spirit = entity.grovekeeperSpirit;
    const pos = entity.position;
    if (!spirit || !pos) continue;
    spiritEntities.push({
      worldX: pos.x,
      worldZ: pos.z,
      spiritId: spirit.spiritId,
      discovered: store.discoveredSpiritIds.includes(spirit.spiritId),
    });
  }

  // Player position
  let playerPos: { x: number; z: number } | null = null;
  for (const entity of playerQuery) {
    const pos = entity.position;
    if (!pos) continue;
    playerPos = { x: pos.x, z: pos.z };
    break;
  }

  return buildMinimapSnapshot({
    activeChunks,
    discoveredStore: store.discoveredChunks,
    campfireEntities,
    npcEntities,
    labyrinthEntities,
    spiritEntities,
    playerPos,
    chunkSize: CHUNK_SIZE,
    viewRadius: VIEW_RADIUS,
  });
}
