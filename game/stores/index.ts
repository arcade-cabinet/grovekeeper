/**
 * index.ts -- Barrel that assembles all domain action files into the Zustand-compatible
 * useGameStore API. Consumers can import from "@/game/stores" or "@/game/stores/gameStore".
 * Spec §5
 */

import { observe } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { gameState$, getState, initialState, type GameStateData } from "./core";
import * as playerStateActions from "./playerState";
import * as progressionActions from "./progression";
import * as survivalActions from "./survivalState";
import * as inventoryActions from "./inventory";
import * as questStateActions from "./questState";
import * as settingsActions from "./settings";

// ---------------------------------------------------------------------------
// Assembled actions object (all domain functions combined)
// ---------------------------------------------------------------------------

const actions = {
  ...playerStateActions,
  ...progressionActions,
  ...survivalActions,
  ...inventoryActions,
  ...questStateActions,
  ...settingsActions,
};

type GameState = GameStateData & typeof actions;

// ---------------------------------------------------------------------------
// Zustand-compatible API wrapper
// ---------------------------------------------------------------------------

/**
 * useGameStore -- drop-in replacement for Zustand's useStore hook.
 * Consumers call: `useGameStore((s) => s.level)` or `useGameStore()` (full state)
 */
function useGameStoreHook(): GameState;
function useGameStoreHook<T>(selector: (state: GameState) => T): T;
function useGameStoreHook<T>(selector?: (state: GameState) => T): T | GameState {
  return useSelector(() => {
    const snapshot = gameState$.get();
    const combined = { ...snapshot, ...actions } as GameState;
    return selector ? selector(combined) : combined;
  });
}

/**
 * getState() -- imperative access for non-React code (hooks, tests, game systems).
 * Returns state + action methods.
 */
function getStateWithActions(): GameState {
  return { ...getState(), ...actions } as GameState;
}

/**
 * setState() -- partial state update (used by tests).
 */
function setState(partial: Partial<GameStateData>): void {
  gameState$.set({ ...getState(), ...partial });
}

/**
 * getInitialState() -- returns the initial state (used by tests for reset).
 */
function getInitialState(): GameStateData {
  return structuredClone(initialState);
}

/**
 * subscribe() -- change listener (used by useAutoSave).
 * Returns unsubscribe function.
 */
function subscribe(listener: () => void): () => void {
  return observe(gameState$, listener);
}

export const useGameStore = Object.assign(useGameStoreHook, {
  getState: getStateWithActions,
  setState,
  getInitialState,
  subscribe,
});

// ---------------------------------------------------------------------------
// Re-export everything from domain files for direct import convenience
// ---------------------------------------------------------------------------

export * from "./core";
export * from "./chunkDeltas";
