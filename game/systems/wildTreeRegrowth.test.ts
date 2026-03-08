import {
  cancelRegrowth,
  checkRegrowth,
  initializeRegrowthState,
  scheduleRegrowth,
  getSeasonSpawnMultiplier,
  shouldSpawnWildTree,
  buildWildTreeSpawn,
  tickWildEcology,
  type ChunkEcologyInput,
} from "./wildTreeRegrowth.ts";

describe("initializeRegrowthState", () => {
  it("creates state with empty timers array", () => {
    expect(initializeRegrowthState()).toEqual({ timers: [] });
  });
});

describe("scheduleRegrowth", () => {
  it("adds a timer with default delay (7 days)", () => {
    const state = initializeRegrowthState();
    const updated = scheduleRegrowth(state, 3, 5, "white-oak", 10);
    expect(updated.timers).toHaveLength(1);
    expect(updated.timers[0]).toEqual({ gridX: 3, gridZ: 5, speciesId: "white-oak", expiresAtDay: 17 });
  });

  it("adds a timer with custom delay", () => {
    const updated = scheduleRegrowth(initializeRegrowthState(), 1, 2, "elder-pine", 5, 3);
    expect(updated.timers[0].expiresAtDay).toBe(8);
  });

  it("preserves existing timers (immutable)", () => {
    let state = initializeRegrowthState();
    state = scheduleRegrowth(state, 0, 0, "white-oak", 1);
    state = scheduleRegrowth(state, 1, 1, "elder-pine", 2);
    expect(state.timers).toHaveLength(2);
    expect(state.timers[0].speciesId).toBe("white-oak");
    expect(state.timers[1].speciesId).toBe("elder-pine");
  });

  it("does not mutate original state", () => {
    const original = initializeRegrowthState();
    scheduleRegrowth(original, 0, 0, "white-oak", 1);
    expect(original.timers).toHaveLength(0);
  });
});

describe("checkRegrowth", () => {
  it("returns no expired timers when all are in the future", () => {
    let state = scheduleRegrowth(initializeRegrowthState(), 0, 0, "white-oak", 1, 5);
    const result = checkRegrowth(state, 3);
    expect(result.expired).toHaveLength(0);
    expect(result.state.timers).toHaveLength(1);
  });

  it("returns expired timer when current day meets expiry", () => {
    let state = scheduleRegrowth(initializeRegrowthState(), 0, 0, "white-oak", 1, 5);
    const result = checkRegrowth(state, 6);
    expect(result.expired).toHaveLength(1);
    expect(result.expired[0].speciesId).toBe("white-oak");
    expect(result.state.timers).toHaveLength(0);
  });

  it("returns expired timer when current day exceeds expiry", () => {
    let state = scheduleRegrowth(initializeRegrowthState(), 0, 0, "white-oak", 1, 5);
    expect(checkRegrowth(state, 100).expired).toHaveLength(1);
  });

  it("separates expired and remaining timers", () => {
    let state = scheduleRegrowth(initializeRegrowthState(), 0, 0, "white-oak", 1, 5);
    state = scheduleRegrowth(state, 1, 1, "elder-pine", 1, 10);
    const result = checkRegrowth(state, 8);
    expect(result.expired).toHaveLength(1);
    expect(result.expired[0].speciesId).toBe("white-oak");
    expect(result.state.timers).toHaveLength(1);
  });

  it("returns same state reference when nothing expired", () => {
    let state = scheduleRegrowth(initializeRegrowthState(), 0, 0, "white-oak", 100, 50);
    expect(checkRegrowth(state, 1).state).toBe(state);
  });
});

describe("cancelRegrowth", () => {
  it("removes timer at specified position", () => {
    let state = scheduleRegrowth(initializeRegrowthState(), 3, 5, "white-oak", 1);
    expect(cancelRegrowth(state, 3, 5).timers).toHaveLength(0);
  });

  it("preserves other timers when cancelling one", () => {
    let state = scheduleRegrowth(initializeRegrowthState(), 0, 0, "white-oak", 1);
    state = scheduleRegrowth(state, 5, 5, "elder-pine", 1);
    const updated = cancelRegrowth(state, 0, 0);
    expect(updated.timers).toHaveLength(1);
    expect(updated.timers[0].speciesId).toBe("elder-pine");
  });

  it("returns same state reference when no timer found at position", () => {
    let state = scheduleRegrowth(initializeRegrowthState(), 0, 0, "white-oak", 1);
    expect(cancelRegrowth(state, 99, 99)).toBe(state);
  });

  it("does not mutate original state", () => {
    let state = scheduleRegrowth(initializeRegrowthState(), 0, 0, "white-oak", 1);
    cancelRegrowth(state, 0, 0);
    expect(state.timers).toHaveLength(1);
  });
});

// -- Chunk ecology tests (Spec §8) ---------------------------------------------

describe("getSeasonSpawnMultiplier (Spec §8)", () => {
  it("spring has the highest multiplier (1.5)", () => {
    expect(getSeasonSpawnMultiplier("spring")).toBe(1.5);
  });

  it("summer is 1.0, autumn is 0.5, winter is 0", () => {
    expect(getSeasonSpawnMultiplier("summer")).toBe(1.0);
    expect(getSeasonSpawnMultiplier("autumn")).toBe(0.5);
    expect(getSeasonSpawnMultiplier("winter")).toBe(0);
  });

  it("unknown season falls back to 0", () => {
    expect(getSeasonSpawnMultiplier("monsoon")).toBe(0);
  });

  it("spring > summer > autumn > winter ordering holds", () => {
    expect(getSeasonSpawnMultiplier("spring")).toBeGreaterThan(getSeasonSpawnMultiplier("summer"));
    expect(getSeasonSpawnMultiplier("summer")).toBeGreaterThan(getSeasonSpawnMultiplier("autumn"));
    expect(getSeasonSpawnMultiplier("autumn")).toBeGreaterThan(getSeasonSpawnMultiplier("winter"));
  });
});

describe("shouldSpawnWildTree (Spec §8)", () => {
  const worldSeed = "TestSeed";

  it("never spawns in winter (season gate)", () => {
    for (let day = 0; day < 20; day++) {
      expect(shouldSpawnWildTree(0, 0, day, 0, "winter", worldSeed)).toBe(false);
    }
  });

  it("never spawns when chunk is at max density (8 trees)", () => {
    for (let day = 0; day < 20; day++) {
      expect(shouldSpawnWildTree(0, 0, day, 8, "spring", worldSeed)).toBe(false);
    }
  });

  it("returns boolean for valid non-winter inputs", () => {
    expect(typeof shouldSpawnWildTree(1, 2, 5, 0, "spring", worldSeed)).toBe("boolean");
  });

  it("is deterministic -- same inputs always produce same result", () => {
    const r1 = shouldSpawnWildTree(3, 4, 10, 2, "summer", worldSeed);
    const r2 = shouldSpawnWildTree(3, 4, 10, 2, "summer", worldSeed);
    expect(r1).toBe(r2);
  });

  it("different days produce independent rolls -- not all same over 30 days", () => {
    const results = Array.from({ length: 30 }, (_, i) =>
      shouldSpawnWildTree(0, 0, i, 0, "spring", worldSeed),
    );
    const trueCount = results.filter(Boolean).length;
    expect(trueCount).toBeGreaterThan(0);
    expect(trueCount).toBeLessThan(30);
  });
});

describe("buildWildTreeSpawn (Spec §8)", () => {
  const worldSeed = "TestSeed";
  const CHUNK_SIZE = 16;
  const heightmap = new Float32Array(CHUNK_SIZE * CHUNK_SIZE).fill(0);

  it("marks tree as wild=true, stage 0, not pruned/fertilized/watered", () => {
    const spawn = buildWildTreeSpawn(0, 0, "starting-grove", 1, worldSeed, heightmap);
    expect(spawn.tree.wild).toBe(true);
    expect(spawn.tree.stage).toBe(0);
    expect(spawn.tree.pruned).toBe(false);
    expect(spawn.tree.fertilized).toBe(false);
    expect(spawn.tree.watered).toBe(false);
  });

  it("position.x is within chunk X bounds", () => {
    const spawn = buildWildTreeSpawn(2, 0, "starting-grove", 1, worldSeed, heightmap);
    expect(spawn.position.x).toBeGreaterThanOrEqual(2 * CHUNK_SIZE);
    expect(spawn.position.x).toBeLessThan(3 * CHUNK_SIZE);
  });

  it("position.z is within chunk Z bounds", () => {
    const spawn = buildWildTreeSpawn(0, 3, "starting-grove", 1, worldSeed, heightmap);
    expect(spawn.position.z).toBeGreaterThanOrEqual(3 * CHUNK_SIZE);
    expect(spawn.position.z).toBeLessThan(4 * CHUNK_SIZE);
  });

  it("speciesId comes from the biome species pool", () => {
    const spawn = buildWildTreeSpawn(0, 0, "frozen-peaks", 1, worldSeed, heightmap);
    expect(["elder-pine", "ghost-birch"]).toContain(spawn.tree.speciesId);
  });

  it("is deterministic -- same inputs produce same spawn", () => {
    const s1 = buildWildTreeSpawn(1, 2, "meadow", 3, worldSeed, heightmap);
    const s2 = buildWildTreeSpawn(1, 2, "meadow", 3, worldSeed, heightmap);
    expect(s1.tree.speciesId).toBe(s2.tree.speciesId);
    expect(s1.position.x).toBe(s2.position.x);
  });
});

describe("tickWildEcology (Spec §8)", () => {
  const worldSeed = "TestSeed";
  const CHUNK_SIZE = 16;
  const heightmap = new Float32Array(CHUNK_SIZE * CHUNK_SIZE).fill(0);

  function makeChunk(
    chunkX: number,
    chunkZ: number,
    biome: ChunkEcologyInput["biome"] = "starting-grove",
    currentTreeCount = 0,
  ): ChunkEcologyInput {
    return { chunkX, chunkZ, biome, currentTreeCount, heightmap };
  }

  it("returns empty array when no chunks provided", () => {
    expect(tickWildEcology([], 1, "spring", worldSeed)).toEqual([]);
  });

  it("returns empty array in winter (season gate)", () => {
    const chunks = [makeChunk(0, 0), makeChunk(1, 0), makeChunk(0, 1)];
    expect(tickWildEcology(chunks, 5, "winter", worldSeed)).toHaveLength(0);
  });

  it("skips chunks at max density (8 trees)", () => {
    const chunks = [makeChunk(0, 0, "starting-grove", 8), makeChunk(1, 0, "meadow", 8)];
    expect(tickWildEcology(chunks, 5, "spring", worldSeed)).toHaveLength(0);
  });

  it("each spawn has wild=true", () => {
    const chunks = Array.from({ length: 20 }, (_, i) => makeChunk(i, 0));
    let foundSpawn = false;
    for (let day = 0; day < 20 && !foundSpawn; day++) {
      const spawns = tickWildEcology(chunks, day, "spring", worldSeed);
      if (spawns.length > 0) {
        for (const s of spawns) expect(s.tree.wild).toBe(true);
        foundSpawn = true;
      }
    }
    expect(foundSpawn).toBe(true);
  });

  it("is deterministic -- same inputs produce same spawns", () => {
    const chunks = [makeChunk(0, 0), makeChunk(1, 1), makeChunk(2, 2)];
    const r1 = tickWildEcology(chunks, 10, "summer", worldSeed);
    const r2 = tickWildEcology(chunks, 10, "summer", worldSeed);
    expect(r1.length).toBe(r2.length);
    if (r1.length > 0) expect(r1[0].tree.speciesId).toBe(r2[0].tree.speciesId);
  });
});
