/**
 * Threshold chime system — Sub-wave C of the Journey wave.
 *
 * Plays a soft chime when the player crosses the boundary between a
 * grove chunk and a non-grove chunk (in either direction). The chime
 * is the diegetic counterpart to the visual grove glow.
 *
 * Debounce
 * --------
 * The chime fires at most once per (lastChunk, currentChunk) pair
 * within a 5-second window — pacing back and forth across the same
 * boundary is silent after the first crossing. The window resets the
 * moment the player wanders to a *different* chunk.
 *
 * Determinism
 * -----------
 * Pure of `Math.random` and `Date.now`. The clock source (`now`) and
 * audio sink (`playChime`) are both injected — runtime wires real
 * impls; tests pass deterministic stubs.
 */

import { isGroveChunk } from "./grovePlacement";

/** Default debounce window in ms. */
export const THRESHOLD_DEBOUNCE_MS = 5000;

interface ChunkPos {
  chunkX: number;
  chunkZ: number;
}

export interface ThresholdSystemDeps {
  worldSeed: number;
  chunkSize: number;
  playChime: () => void;
  now?: () => number;
  debounceMs?: number;
}

export interface ThresholdSystem {
  update(playerPos: { x: number; z: number }): void;
  reset(): void;
}

export function createThresholdSystem(
  deps: ThresholdSystemDeps,
): ThresholdSystem {
  const {
    worldSeed,
    chunkSize,
    playChime,
    now = () =>
      typeof performance !== "undefined" ? performance.now() : Date.now(),
    debounceMs = THRESHOLD_DEBOUNCE_MS,
  } = deps;

  let lastChunk: ChunkPos | null = null;
  let lastInGrove = false;
  const recentFires = new Map<string, number>();

  function chunkOf(x: number, z: number): ChunkPos {
    return {
      chunkX: Math.floor(x / chunkSize),
      chunkZ: Math.floor(z / chunkSize),
    };
  }

  function pairKey(a: ChunkPos, b: ChunkPos): string {
    const sa = `${a.chunkX},${a.chunkZ}`;
    const sb = `${b.chunkX},${b.chunkZ}`;
    return sa < sb ? `${sa}|${sb}` : `${sb}|${sa}`;
  }

  return {
    update(playerPos) {
      const next = chunkOf(playerPos.x, playerPos.z);
      if (
        lastChunk !== null &&
        lastChunk.chunkX === next.chunkX &&
        lastChunk.chunkZ === next.chunkZ
      ) {
        return;
      }

      const wasInGrove = lastInGrove;
      const nowInGrove = isGroveChunk(worldSeed, next.chunkX, next.chunkZ);

      if (lastChunk !== null && wasInGrove !== nowInGrove) {
        const key = pairKey(lastChunk, next);
        const t = now();
        const lastFire = recentFires.get(key);
        if (lastFire == null || t - lastFire >= debounceMs) {
          playChime();
          recentFires.set(key, t);
        }
      }

      lastChunk = next;
      lastInGrove = nowInGrove;
    },
    reset() {
      lastChunk = null;
      lastInGrove = false;
      recentFires.clear();
    },
  };
}
