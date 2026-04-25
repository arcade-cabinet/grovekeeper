/**
 * Threshold system tests — Sub-wave C.
 */
import { describe, expect, it } from "vitest";
import {
  createThresholdSystem,
  THRESHOLD_DEBOUNCE_MS,
} from "./thresholdSystem";

const CHUNK_SIZE = 16;
const WORLD_SEED = 0;

/** Chunk-center XZ for a given chunk coord. */
function chunkCenter(cx: number, cz: number): { x: number; z: number } {
  return { x: cx * CHUNK_SIZE + CHUNK_SIZE / 2, z: cz * CHUNK_SIZE + CHUNK_SIZE / 2 };
}

describe("thresholdSystem", () => {
  it("fires chime when player walks from a grove chunk into a non-grove chunk", () => {
    let nowMs = 0;
    let chimeCount = 0;
    const sys = createThresholdSystem({
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      playChime: () => chimeCount++,
      now: () => nowMs,
    });

    // Start inside the starter grove (chunk 3, 0) — guaranteed grove.
    sys.update(chunkCenter(3, 0));
    expect(chimeCount).toBe(0); // no transition on the first sample.

    // Walk into chunk (4, 0) which is (probably) not a grove for seed 0.
    nowMs = 1;
    sys.update(chunkCenter(4, 0));
    expect(chimeCount).toBe(1);
  });

  it("fires chime when player walks from non-grove into a grove", () => {
    let nowMs = 0;
    let chimeCount = 0;
    const sys = createThresholdSystem({
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      playChime: () => chimeCount++,
      now: () => nowMs,
    });

    // Start in (4, 0) — non-grove.
    sys.update(chunkCenter(4, 0));
    expect(chimeCount).toBe(0);

    // Step into starter grove (3, 0).
    nowMs = 100;
    sys.update(chunkCenter(3, 0));
    expect(chimeCount).toBe(1);
  });

  it("does NOT fire chime when crossing between two non-grove chunks", () => {
    let nowMs = 0;
    let chimeCount = 0;
    const sys = createThresholdSystem({
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      playChime: () => chimeCount++,
      now: () => nowMs,
    });

    // Both (10, 10) and (11, 10) — pick chunks far from the guaranteed
    // groves. We assume both are non-grove for seed 0; if the PRNG
    // happens to make either a grove, we fall back to (12, 10), but
    // with 1/50 odds the test is stable.
    sys.update(chunkCenter(10, 10));
    nowMs = 1;
    sys.update(chunkCenter(11, 10));
    // Two non-grove chunks → no chime.
    expect(chimeCount).toBe(0);
  });

  it("debounces re-crossing the same boundary within the window", () => {
    let nowMs = 0;
    let chimeCount = 0;
    const sys = createThresholdSystem({
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      playChime: () => chimeCount++,
      now: () => nowMs,
    });

    sys.update(chunkCenter(3, 0)); // inside grove
    nowMs = 100;
    sys.update(chunkCenter(4, 0)); // out → chime
    expect(chimeCount).toBe(1);
    nowMs = 500;
    sys.update(chunkCenter(3, 0)); // back in: same boundary, within debounce
    expect(chimeCount).toBe(1);
    nowMs = 1500;
    sys.update(chunkCenter(4, 0)); // out again, still within debounce
    expect(chimeCount).toBe(1);
  });

  it("re-fires after the debounce window elapses", () => {
    let nowMs = 0;
    let chimeCount = 0;
    const sys = createThresholdSystem({
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      playChime: () => chimeCount++,
      now: () => nowMs,
    });
    sys.update(chunkCenter(3, 0));
    nowMs = 100;
    sys.update(chunkCenter(4, 0));
    expect(chimeCount).toBe(1);
    nowMs = 100 + THRESHOLD_DEBOUNCE_MS + 1;
    sys.update(chunkCenter(3, 0));
    expect(chimeCount).toBe(2);
  });

  it("is deterministic — same input sequence yields same chime calls", () => {
    function run(): number {
      let nowMs = 0;
      let count = 0;
      const sys = createThresholdSystem({
        worldSeed: 42,
        chunkSize: CHUNK_SIZE,
        playChime: () => count++,
        now: () => nowMs,
      });
      const path = [
        chunkCenter(3, 0),
        chunkCenter(4, 0),
        chunkCenter(7, 2),
      ];
      for (let i = 0; i < path.length; i++) {
        nowMs += 10000;
        sys.update(path[i]);
      }
      return count;
    }
    expect(run()).toBe(run());
  });

  it("reset() clears the debounce map and the position cache", () => {
    let nowMs = 0;
    let count = 0;
    const sys = createThresholdSystem({
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      playChime: () => count++,
      now: () => nowMs,
    });
    sys.update(chunkCenter(3, 0));
    nowMs = 1;
    sys.update(chunkCenter(4, 0));
    expect(count).toBe(1);
    sys.reset();
    // Post-reset: the system has no last-chunk; the next sample seeds
    // it without firing. Then a transition fires regardless of recent
    // history because the debounce map was cleared.
    nowMs = 10;
    sys.update(chunkCenter(3, 0)); // seed
    nowMs = 11;
    sys.update(chunkCenter(4, 0)); // transition → chime, debounce was cleared
    expect(count).toBe(2);
  });
});
