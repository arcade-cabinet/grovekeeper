/**
 * tickNpcAI -- NPC AI brain evaluation and walkability grid rebuild (throttled ~2s).
 */
import { NpcBrain, type NpcBrainContext } from "@/game/ai/NpcBrain";
import { npcsQuery, playerQuery, world } from "@/game/ecs/world";
import { tickNpcSchedule } from "@/game/systems/npcSchedule";
import { buildWalkabilityGrid, type WalkabilityGrid } from "@/game/systems/pathfinding";
import type { TimeState } from "@/game/systems/time";
import { MICROSECONDS_PER_GAME_SECOND } from "@/game/systems/time";

const gridCellsQuery = world.with("gridCell", "position");

/** Throttle interval for NPC AI evaluation. */
export const NPC_AI_TICK_INTERVAL = 2;

/** Walkability grid rebuild interval (seconds). */
const GRID_REBUILD_INTERVAL = 5;

export function tickNpcSchedules(
  walkGridRef: { current: WalkabilityGrid | null },
  timeState: TimeState,
): void {
  if (!walkGridRef.current) return;
  const currentHour = (timeState.totalMicroseconds / (MICROSECONDS_PER_GAME_SECOND * 3600)) % 24;
  for (const entity of npcsQuery) {
    if (!entity.position || !entity.npc || !entity.npc.schedule?.length) continue;
    const schedResult = tickNpcSchedule(
      entity.npc.schedule,
      entity.id,
      entity.position.x,
      entity.position.z,
      currentHour,
      walkGridRef.current,
    );
    if (schedResult.animState !== entity.npc.currentAnim) {
      entity.npc.currentAnim = schedResult.animState;
    }
  }
}

export function tickNpcAI(
  npcBrains: Map<string, NpcBrain>,
  walkGridRef: { current: WalkabilityGrid | null },
  gridRebuildTimer: { current: number },
  npcAiTimer: { current: number },
  dt: number,
): void {
  npcAiTimer.current += dt;
  gridRebuildTimer.current += dt;

  if (npcAiTimer.current < NPC_AI_TICK_INTERVAL) return;

  npcAiTimer.current = 0;

  // Rebuild walkability grid periodically
  if (!walkGridRef.current || gridRebuildTimer.current >= GRID_REBUILD_INTERVAL) {
    gridRebuildTimer.current = 0;
    let minX = 0,
      minZ = 0,
      maxX = 12,
      maxZ = 12;
    const walkCells = [];
    for (const cell of gridCellsQuery) {
      if (cell.gridCell) {
        const { gridX, gridZ, type } = cell.gridCell;
        if (gridX < minX) minX = gridX;
        if (gridZ < minZ) minZ = gridZ;
        if (gridX + 1 > maxX) maxX = gridX + 1;
        if (gridZ + 1 > maxZ) maxZ = gridZ + 1;
        walkCells.push({ x: gridX, z: gridZ, walkable: type === "soil" || type === "path" });
      }
    }
    walkGridRef.current = buildWalkabilityGrid(walkCells, { minX, minZ, maxX, maxZ });
  }

  let playerX = 6,
    playerZ = 6;
  for (const p of playerQuery) {
    if (p.position) {
      playerX = p.position.x;
      playerZ = p.position.z;
    }
    break;
  }

  const currentIds = new Set<string>();
  for (const entity of npcsQuery) {
    if (!entity.position || !entity.npc) continue;
    currentIds.add(entity.id);

    let brain = npcBrains.get(entity.id);
    if (!brain) {
      brain = new NpcBrain(entity.id, entity.npc.templateId, entity.position.x, entity.position.z);
      npcBrains.set(entity.id, brain);
    }

    const distToPlayer = Math.max(
      Math.abs(entity.position.x - playerX),
      Math.abs(entity.position.z - playerZ),
    );

    const ctx: NpcBrainContext = {
      grid: walkGridRef.current,
      playerX,
      playerZ,
      npcX: entity.position.x,
      npcZ: entity.position.z,
      homeX: brain.homePosition.x,
      homeZ: brain.homePosition.z,
      distToPlayer,
    };

    brain.update(dt * NPC_AI_TICK_INTERVAL, ctx);
  }

  // Clean up brains for removed NPC entities
  for (const [id, brain] of npcBrains) {
    if (!currentIds.has(id)) {
      brain.dispose();
      npcBrains.delete(id);
    }
  }
}
