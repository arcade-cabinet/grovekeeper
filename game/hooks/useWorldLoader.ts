/**
 * useWorldLoader -- Bootstraps the open-world chunk streaming system.
 *
 * Architecture (Spec §17.1):
 *   - Creates a ChunkManager singleton seeded from the game store's worldSeed.
 *   - Stores the singleton in a module-level ref so it survives React re-renders
 *     and is accessible from ChunkStreamer without prop-drilling or context.
 *   - ChunkStreamer is a null-rendering R3F component that must be mounted inside
 *     <Canvas>; it calls chunkManager.update(playerPos) on every frame via
 *     useFrame, which triggers async chunk generation via requestIdleCallback.
 *
 * Integration:
 *   - useWorldLoader() must be called from the game screen component (outside Canvas).
 *   - <ChunkStreamer /> must be rendered inside <Canvas> (e.g. inside GameSystems).
 *
 * Migration note:
 *   The legacy starting-world.json / ZoneLoader path is bypassed. ChunkManager
 *   generates the starting zone procedurally from the worldSeed.  If worldSeed is
 *   empty (first boot before the player has set a seed) a default seed is used so
 *   the world is always populated rather than blank.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { playerQuery } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores";
import { ChunkManager } from "@/game/world/ChunkManager";

// ─── Module-level singleton ───────────────────────────────────────────────────

/**
 * The single ChunkManager instance for the current play session.
 * Replaced when useWorldLoader() is called with a new seed (e.g. after prestige
 * or new game).
 */
let _chunkManager: ChunkManager | null = null;

/**
 * Returns the current ChunkManager singleton.
 * Throws if called before useWorldLoader() has initialised it.
 */
export function getChunkManager(): ChunkManager {
  if (!_chunkManager) {
    throw new Error(
      "ChunkManager is not initialised. Ensure useWorldLoader() has been called before getChunkManager().",
    );
  }
  return _chunkManager;
}

/** Default seed used when no worldSeed has been set in the store yet. */
const DEFAULT_SEED = "grovekeeper-default";

// ─── Hook (call outside Canvas) ──────────────────────────────────────────────

/**
 * Initialises (or re-initialises) the ChunkManager singleton.
 * Must be called from the game screen component, outside the R3F <Canvas>.
 * Idempotent for the same seed — no-op if the manager is already seeded.
 */
export function useWorldLoader(): void {
  const activeSeedRef = useRef<string | null>(null);

  useEffect(() => {
    const store = useGameStore.getState();
    const seed = store.worldSeed || DEFAULT_SEED;

    // Only create a new manager when the seed changes (new game / prestige)
    if (activeSeedRef.current === seed && _chunkManager !== null) return;

    _chunkManager = new ChunkManager(seed);
    activeSeedRef.current = seed;

    // Mark zone as discovered so existing store integrations stay consistent
    store.discoverZone(store.currentZoneId);
    store.setCurrentZoneId(store.currentZoneId);
  }, []);
}

// ─── ChunkStreamer (call inside Canvas) ──────────────────────────────────────

/**
 * Null-rendering R3F component that drives ChunkManager.update() every frame.
 *
 * Must be rendered inside <Canvas> so that useFrame is available.
 * Reads the player entity's position from ECS and passes it to the manager.
 * Falls back to the world origin (0, 0, 0) when no player entity exists yet
 * (first few frames before Player component mounts).
 */
export function ChunkStreamer(): null {
  useFrame(() => {
    if (!_chunkManager) return;

    const players = playerQuery.entities;
    const playerPos =
      players.length > 0 && players[0].position ? players[0].position : { x: 0, y: 0, z: 0 };

    _chunkManager.update(playerPos);
  });

  return null;
}
