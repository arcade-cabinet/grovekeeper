/**
 * Grove discovery system tests — Wave 10.
 *
 * Verifies the chunk-transition state machine:
 *   - Entering a grove writes a discovery row.
 *   - Re-entering the same grove is idempotent (no duplicate row).
 *   - Audio swaps to grove music on enter, back to wilderness on leave.
 *   - Movement within the same chunk does not fire any transition.
 *
 * The audio module is mocked so we can assert on the exact biome ids
 * passed to `setBiomeMusic`. The DB is the real in-memory sql.js
 * fixture from `testDb.ts` so the repo path is exercised end-to-end.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/audio", () => ({
  setBiomeMusic: vi.fn().mockResolvedValue(undefined),
}));

import { setBiomeMusic } from "@/audio";
import { createTestDb, type TestDbHandle } from "@/db/repos/testDb";
import { worlds } from "@/db/schema/rc";
import type { BiomeId } from "./biomes";
import { createGroveDiscoverySystem } from "./groveDiscovery";
import { isGroveChunk, STARTER_GROVE_CHUNK } from "./grovePlacement";

const CHUNK_SIZE = 16;
const WORLD_ID = "world-1";
const WORLD_SEED = 0;

function center(cx: number, cz: number): { x: number; z: number } {
  return {
    x: cx * CHUNK_SIZE + CHUNK_SIZE / 2,
    z: cz * CHUNK_SIZE + CHUNK_SIZE / 2,
  };
}

async function setup(): Promise<TestDbHandle> {
  const handle = await createTestDb();
  handle.db
    .insert(worlds)
    .values({
      id: WORLD_ID,
      name: "Test",
      gardenerName: "Tester",
      worldSeed: String(WORLD_SEED),
      difficulty: "sapling",
      createdAt: 0,
      lastPlayedAt: 0,
    })
    .run();
  return handle;
}

const surroundingBiome = (_x: number, _z: number): BiomeId => "meadow";

describe("groveDiscovery", () => {
  let handle: TestDbHandle;

  beforeEach(async () => {
    vi.clearAllMocks();
    handle = await setup();
  });

  afterEach(() => {
    handle.close();
  });

  it("records discovery when player enters a grove chunk for the first time", () => {
    const sys = createGroveDiscoverySystem({
      db: handle.db,
      worldId: WORLD_ID,
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      resolveSurroundingBiome: surroundingBiome,
    });

    expect(isGroveChunk(WORLD_SEED, 0, 0)).toBe(false);
    sys.update(center(0, 0));

    expect(
      isGroveChunk(WORLD_SEED, STARTER_GROVE_CHUNK.x, STARTER_GROVE_CHUNK.z),
    ).toBe(true);
    sys.update(center(STARTER_GROVE_CHUNK.x, STARTER_GROVE_CHUNK.z));

    const rows = handle.sqlDb.exec(
      "SELECT id, world_id, chunk_x, chunk_z, state FROM groves",
    );
    expect(rows[0]?.values).toEqual([
      [
        `grove-${STARTER_GROVE_CHUNK.x}-${STARTER_GROVE_CHUNK.z}`,
        WORLD_ID,
        STARTER_GROVE_CHUNK.x,
        STARTER_GROVE_CHUNK.z,
        "discovered",
      ],
    ]);

    expect(setBiomeMusic).toHaveBeenCalledWith("grove");
  });

  it("is idempotent on re-entry — no duplicate rows, no mid-chunk spam", () => {
    const sys = createGroveDiscoverySystem({
      db: handle.db,
      worldId: WORLD_ID,
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      resolveSurroundingBiome: surroundingBiome,
    });

    sys.update(center(0, 0));
    sys.update(center(3, 0));
    sys.update(center(0, 0));
    vi.mocked(setBiomeMusic).mockClear();

    sys.update(center(3, 0));
    sys.update(center(3, 0));

    expect(setBiomeMusic).toHaveBeenCalledTimes(1);
    expect(setBiomeMusic).toHaveBeenCalledWith("grove");

    const rows = handle.sqlDb.exec("SELECT count(*) FROM groves");
    expect(rows[0]?.values?.[0]?.[0]).toBe(1);
  });

  it("crossfades back to wilderness music when leaving a grove", () => {
    const sys = createGroveDiscoverySystem({
      db: handle.db,
      worldId: WORLD_ID,
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      resolveSurroundingBiome: () => "forest",
    });

    sys.update(center(0, 0));
    sys.update(center(3, 0));
    vi.mocked(setBiomeMusic).mockClear();

    sys.update(center(4, 0));
    expect(isGroveChunk(WORLD_SEED, 4, 0)).toBe(false);

    expect(setBiomeMusic).toHaveBeenCalledTimes(1);
    expect(setBiomeMusic).toHaveBeenCalledWith("forest");
  });

  it("does not fire on intra-chunk movement", () => {
    const sys = createGroveDiscoverySystem({
      db: handle.db,
      worldId: WORLD_ID,
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      resolveSurroundingBiome: surroundingBiome,
    });

    sys.update({ x: 1, z: 1 });
    sys.update({ x: 2, z: 2 });
    sys.update({ x: 5, z: 8 });

    expect(setBiomeMusic).not.toHaveBeenCalled();
    const rows = handle.sqlDb.exec("SELECT count(*) FROM groves");
    expect(rows[0]?.values?.[0]?.[0]).toBe(0);
  });

  it("treats negative coordinates correctly via floor-divide", () => {
    const sys = createGroveDiscoverySystem({
      db: handle.db,
      worldId: WORLD_ID,
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      resolveSurroundingBiome: surroundingBiome,
    });

    sys.update({ x: 0, z: 0 });
    expect(() => sys.update({ x: -1, z: 0 })).not.toThrow();
  });
});
