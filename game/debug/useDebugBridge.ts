/**
 * useDebugBridge — Attaches window.__GROVEKEEPER__ in dev/test mode only.
 *
 * Exposes game state, ECS stats, a milestone recorder, and full control
 * methods (teleport, setTime, lookAt, queryEntities, executeAction,
 * getStructureDetails) so Playwright tests can observe and drive the game
 * without polling DOM or React internals.
 *
 * Production builds exclude this entirely (process.env.NODE_ENV guard).
 *
 * Spec: §D.1 (Debug Bridge)
 */

import { useEffect } from "react";
import {
  bushesQuery,
  campfiresQuery,
  dayNightQuery,
  enemiesQuery,
  npcsQuery,
  playerQuery,
  structuresQuery,
  terrainChunksQuery,
  treesQuery,
  waterBodiesQuery,
} from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import { executeAction, lookAt, setTime, teleport } from "./bridgeActions.ts";
import { getStructureDetails, queryEntities } from "./bridgeQueries.ts";
import type {
  DebugGameState,
  ECSStats,
  GrovekeeperBridge,
  MilestoneRecord,
} from "./bridgeTypes.ts";

// Re-export types so consumers can import from a single path.
export type {
  DebugGameState,
  ECSStats,
  GrovekeeperBridge,
  MilestoneRecord,
} from "./bridgeTypes.ts";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDebugBridge(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Metro dev server sets NODE_ENV=production, so use __DEV__ (React Native global)
    // to detect dev builds. Fall back to NODE_ENV only for non-RN environments.
    const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";
    if (!isDev) return;

    const milestones: MilestoneRecord[] = [];

    const bridge: GrovekeeperBridge = {
      version: "2.0.0",

      get milestones() {
        return milestones;
      },

      // ── Read-only observation ───────────────────────────────────────────────

      getState(): DebugGameState {
        const s = useGameStore.getState();
        return {
          screen: s.screen,
          level: s.level,
          xp: s.xp,
          coins: s.coins,
          resources: { ...s.resources },
          selectedTool: s.selectedTool,
          gridSize: s.gridSize,
          currentSeason: String(s.currentSeason),
          gameTimeMicroseconds: s.gameTimeMicroseconds,
          treesPlanted: s.treesPlanted,
          treesMatured: s.treesMatured,
          unlockedSpecies: [...s.unlockedSpecies],
          prestigeCount: s.prestigeCount,
          worldSeed: s.worldSeed,
          difficulty: s.difficulty,
          stamina: s.stamina,
        };
      },

      getECSStats(): ECSStats {
        return {
          terrainChunks: terrainChunksQuery.entities.length,
          trees: treesQuery.entities.length,
          bushes: bushesQuery.entities.length,
          npcs: npcsQuery.entities.length,
          enemies: enemiesQuery.entities.length,
          structures: structuresQuery.entities.length,
          campfires: campfiresQuery.entities.length,
          waterBodies: waterBodiesQuery.entities.length,
          player: playerQuery.entities.length,
          dayNight: dayNightQuery.entities.length,
        };
      },

      getDiagnostics(): Record<string, unknown> {
        const visibleTrees = treesQuery.entities.filter((e) => e.renderable?.visible);
        const firstTree = visibleTrees[0];
        const playerEntity = playerQuery.entities[0];
        const dnEntity = dayNightQuery.entities[0];
        return {
          visibleTreeCount: visibleTrees.length,
          firstTreePos: firstTree
            ? [firstTree.position.x, firstTree.position.y, firstTree.position.z]
            : null,
          playerPos: playerEntity
            ? [playerEntity.position.x, playerEntity.position.y, playerEntity.position.z]
            : null,
          dayNightHour: dnEntity?.dayNight?.gameHour ?? null,
          dayNightTimeOfDay: dnEntity?.dayNight?.timeOfDay ?? null,
          dayNightSunIntensity: dnEntity?.dayNight?.sunIntensity ?? null,
          dayNightAmbientIntensity: dnEntity?.dayNight?.ambientIntensity ?? null,
          dayNightSkyZenith: dnEntity?.dayNight?.skyZenithColor ?? null,
          dayNightSkyHorizon: dnEntity?.dayNight?.skyHorizonColor ?? null,
        };
      },

      recordMilestone(name: string, data?: unknown): void {
        const s = useGameStore.getState();
        milestones.push({
          name,
          timestamp: Date.now(),
          gameTimeMicroseconds: s.gameTimeMicroseconds,
          data,
        });
        window.dispatchEvent(new CustomEvent("grovekeeper:milestone", { detail: { name, data } }));
      },

      getMilestones(): MilestoneRecord[] {
        return [...milestones];
      },

      // ── Full control ────────────────────────────────────────────────────────

      teleport,
      setTime,
      lookAt,
      queryEntities,
      executeAction,
      getStructureDetails,
    };

    window.__GROVEKEEPER__ = bridge;

    return () => {
      delete window.__GROVEKEEPER__;
    };
  }, []);
}
