/**
 * usePersistence -- startup hydration from expo-sqlite + offline growth.
 *
 * On mount:
 * 1. Run localStorage migration (web only, one-time)
 * 2. Hydrate the Zustand store from the relational SQLite tables
 * 3. Deserialize ECS entities from grove data
 * 4. Calculate offline growth based on elapsed time
 */

import { useEffect, useState } from "react";
import { migrateFromLocalStorage } from "@/game/db/migrate-localStorage";
import { hydrateGameStore } from "@/game/db/queries";
import { useGameStore } from "@/game/stores/gameStore";
import {
  calculateAllOfflineGrowth,
  type OfflineSpeciesData,
  type OfflineTreeState,
} from "@/game/systems/offlineGrowth";
import {
  deserializeGrove,
  type GroveSaveData,
  loadGroveFromStorage,
} from "@/game/systems/saveLoad";

/** Look up species data for offline growth. Inline to avoid circular deps. */
function getSpeciesDataForOffline(
  speciesId: string,
  speciesGetter: (id: string) => OfflineSpeciesData | undefined,
): OfflineSpeciesData | undefined {
  return speciesGetter(speciesId);
}

export function usePersistence(getSpecies: (id: string) => OfflineSpeciesData | undefined): {
  ready: boolean;
} {
  const [ready, setReady] = useState(false);
  const hydrateFromDb = useGameStore((s) => s.hydrateFromDb);

  useEffect(() => {
    let cancelled = false;

    async function hydrate(): Promise<void> {
      // 0. One-time localStorage migration (web only)
      try {
        await migrateFromLocalStorage();
      } catch {
        // Non-critical -- continue without migration
      }

      // 1. Hydrate Zustand store from relational SQLite tables
      const dbState = await hydrateGameStore();
      if (dbState && !cancelled) {
        hydrateFromDb(dbState);
      }

      // 2. Load grove ECS data
      // Try the relational trees table first, then fall back to the
      // legacy JSON-blob save (loadGroveFromStorage)
      let groveData: GroveSaveData | null = null;

      if (dbState?.groveData) {
        // Convert HydratedGameState.groveData to GroveSaveData format
        groveData = {
          version: 1,
          timestamp: Date.now(), // No elapsed time for relational data
          gridSize: dbState.gridSize,
          seed: dbState.worldSeed,
          tiles: [], // Tiles are loaded separately via ECS
          trees: dbState.groveData.trees.map((t) => ({
            col: t.gridX,
            row: t.gridZ,
            speciesId: t.speciesId,
            meshSeed: t.meshSeed,
            stage: t.stage,
            progress: t.progress,
            watered: t.watered,
            totalGrowthTime: t.totalGrowthTime,
            plantedAt: t.plantedAt,
          })),
        };
      } else {
        // Fall back to legacy JSON-blob saves table
        groveData = await loadGroveFromStorage();
      }

      if (groveData && !cancelled) {
        // 3. Calculate offline growth
        const elapsedSeconds = Math.max(0, (Date.now() - groveData.timestamp) / 1000);

        if (elapsedSeconds > 0 && groveData.trees.length > 0) {
          const offlineTrees: OfflineTreeState[] = groveData.trees.map((t) => ({
            speciesId: t.speciesId,
            stage: t.stage,
            progress: t.progress,
            watered: t.watered,
          }));

          const results = calculateAllOfflineGrowth(offlineTrees, elapsedSeconds, (id) =>
            getSpeciesDataForOffline(id, getSpecies),
          );

          // Apply offline growth results back to grove data before deserializing
          for (let i = 0; i < groveData.trees.length; i++) {
            const result = results[i];
            if (result) {
              groveData.trees[i].stage = result.stage;
              groveData.trees[i].progress = result.progress;
              groveData.trees[i].watered = result.watered;
            }
          }
        }

        // 4. Deserialize into ECS world
        deserializeGrove(groveData);
      }

      if (!cancelled) {
        setReady(true);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [hydrateFromDb, getSpecies]);

  return { ready };
}
