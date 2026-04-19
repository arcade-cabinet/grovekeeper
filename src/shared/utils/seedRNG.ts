/**
 * Mulberry32 PRNG — deterministic pseudo-random number generator.
 * Used for tree mesh variation so the same tree at the same position
 * always looks identical across saves and sessions.
 *
 * @param seed - Integer seed value
 * @returns A function that returns the next pseudo-random number in [0, 1)
 */
export function createRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple string hash (djb2 variant) — converts a string to a 32-bit integer.
 * Used to derive mesh seeds from `speciesId-col-row`.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}
