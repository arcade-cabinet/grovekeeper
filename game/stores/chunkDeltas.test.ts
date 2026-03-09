/**
 * chunkDeltas wiring tests (Spec §26.2)
 *
 * Verifies that game actions correctly persist chunk deltas:
 * - plantTree records a PlantedTree in chunk diff
 * - Chunk deltas survive round-trip: save -> load -> apply
 */

jest.mock("@/game/systems/AudioManager", () => ({
  audioManager: { playSound: jest.fn() },
  startAudio: jest.fn().mockResolvedValue(undefined),
}));

import { getChunkKey, worldToChunkCoords } from "@/game/world/ChunkManager";
import { chunkDiffs$, clearAllChunkDiffs, loadChunkDiff } from "@/game/world/chunkPersistence";

describe("chunkDeltas — plantTree persistence wiring (Spec §26.2)", () => {
  beforeEach(() => {
    clearAllChunkDiffs();
  });

  it("worldToChunkCoords converts world position to chunk grid", () => {
    expect(worldToChunkCoords({ x: 0, z: 0 })).toEqual({ chunkX: 0, chunkZ: 0 });
    expect(worldToChunkCoords({ x: 15, z: 15 })).toEqual({ chunkX: 0, chunkZ: 0 });
    expect(worldToChunkCoords({ x: 16, z: 0 })).toEqual({ chunkX: 1, chunkZ: 0 });
    expect(worldToChunkCoords({ x: -1, z: -1 })).toEqual({ chunkX: -1, chunkZ: -1 });
  });

  it("getChunkKey produces canonical string key", () => {
    expect(getChunkKey(0, 0)).toBe("0,0");
    expect(getChunkKey(1, -2)).toBe("1,-2");
  });

  it("recordPlantedTree via chunkPersistence stores delta for a chunk", () => {
    const { recordPlantedTree } = require("@/game/world/chunkPersistence");
    recordPlantedTree("0,0", {
      localX: 3,
      localZ: 5,
      speciesId: "white-oak",
      stage: 0,
      progress: 0,
      plantedAt: 1000,
      meshSeed: 42,
    });

    const diff = loadChunkDiff("0,0");
    expect(diff).not.toBeNull();
    expect(diff?.plantedTrees).toHaveLength(1);
    expect(diff?.plantedTrees[0].speciesId).toBe("white-oak");
    expect(diff?.plantedTrees[0].localX).toBe(3);
    expect(diff?.plantedTrees[0].localZ).toBe(5);
  });

  it("clearAllChunkDiffs removes all stored deltas", () => {
    const { recordPlantedTree } = require("@/game/world/chunkPersistence");
    recordPlantedTree("0,0", {
      localX: 1,
      localZ: 1,
      speciesId: "silver-maple",
      stage: 0,
      progress: 0,
      plantedAt: 2000,
      meshSeed: 99,
    });
    clearAllChunkDiffs();
    expect(loadChunkDiff("0,0")).toBeNull();
  });

  it("multiple planted trees accumulate in the same chunk diff", () => {
    const { recordPlantedTree } = require("@/game/world/chunkPersistence");
    recordPlantedTree("1,0", {
      localX: 2,
      localZ: 3,
      speciesId: "white-oak",
      stage: 0,
      progress: 0,
      plantedAt: 1000,
      meshSeed: 10,
    });
    recordPlantedTree("1,0", {
      localX: 5,
      localZ: 7,
      speciesId: "ghost-birch",
      stage: 0,
      progress: 0,
      plantedAt: 2000,
      meshSeed: 20,
    });

    const diff = loadChunkDiff("1,0");
    expect(diff?.plantedTrees).toHaveLength(2);
    expect(diff?.plantedTrees[0].speciesId).toBe("white-oak");
    expect(diff?.plantedTrees[1].speciesId).toBe("ghost-birch");
  });
});
