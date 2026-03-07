/**
 * useAutoSave -- debounced auto-save that writes to expo-sqlite.
 *
 * Subscribes to gameStore changes and saves after 2 seconds of inactivity.
 * Also saves when the app transitions to background/inactive (React Native AppState).
 *
 * Uses persistGameStore() to write all Zustand state into the relational
 * SQLite tables and saveGroveToDb() to write ECS tree data.
 */

import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { persistGameStore, saveGroveToDb } from "@/game/db/queries";
import { useGameStore } from "@/game/stores/gameStore";
import type { SerializedTreeDb } from "@/game/db/queries";

const DEBOUNCE_MS = 2_000;

/**
 * Persist the full Zustand store state into relational SQLite tables.
 */
async function persistStoreState(): Promise<void> {
  const state = useGameStore.getState();

  // Extract only serializable data (strip action functions)
  const serializable: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (typeof value !== "function") {
      serializable[key] = value;
    }
  }

  await persistGameStore(serializable);
}

/**
 * Full save: grove ECS data (via relational trees table) + store state.
 */
async function performSave(): Promise<void> {
  const state = useGameStore.getState();

  // Save grove tree data to the trees table
  if (state.groveData) {
    const treesData: SerializedTreeDb[] = state.groveData.trees.map((t) => ({
      speciesId: t.speciesId,
      gridX: t.gridX,
      gridZ: t.gridZ,
      stage: t.stage,
      progress: t.progress,
      watered: t.watered,
      totalGrowthTime: t.totalGrowthTime,
      plantedAt: t.plantedAt,
      meshSeed: t.meshSeed,
    }));
    await saveGroveToDb(treesData, state.groveData.playerPosition);
  }

  // Save store state to relational tables
  await persistStoreState();
}

export function useAutoSave(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving = useRef(false);

  // Debounced save on store changes
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!isSaving.current) {
          isSaving.current = true;
          performSave().finally(() => {
            isSaving.current = false;
          });
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Immediate save on app background/inactive
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        // Cancel pending debounce and save immediately
        if (timerRef.current) clearTimeout(timerRef.current);
        performSave();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);
}
