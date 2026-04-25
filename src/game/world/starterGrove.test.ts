/**
 * Starter grove seeding tests — Sub-wave C.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chunksRepo, grovesRepo, recipesRepo, worldsRepo } from "@/db/repos";
import { createTestDb, type TestDbHandle } from "@/db/repos/testDb";
import { STARTER_GROVE_CHUNK } from "./grovePlacement";
import {
  isStarterGroveSeeded,
  LOG_PILE_BLOCK_ID,
  LOG_PILE_LOCAL_POSITIONS,
  seedStarterGrove,
  starterGroveId,
  STARTER_PROP_Y,
  STARTER_RECIPE_ID,
  STONE_CAIRN_BLOCK_ID,
  STONE_CAIRN_LOCAL_POSITIONS,
} from "./starterGrove";

const WORLD_ID = "starter-grove-test-world";

async function setup(): Promise<TestDbHandle> {
  const handle = await createTestDb();
  worldsRepo.createWorld(handle.db, {
    id: WORLD_ID,
    name: "Starter test",
    gardenerName: "Test Gardener",
    worldSeed: "0",
    difficulty: "sapling",
  });
  return handle;
}

describe("seedStarterGrove", () => {
  let handle: TestDbHandle;

  beforeEach(async () => {
    handle = await setup();
  });

  afterEach(() => {
    handle.close();
  });

  it("creates the grove row at chunk (3, 0) in `discovered` state", () => {
    seedStarterGrove(handle.db, WORLD_ID);
    const grove = grovesRepo.getGroveById(handle.db, starterGroveId());
    expect(grove).not.toBeNull();
    expect(grove?.chunkX).toBe(STARTER_GROVE_CHUNK.x);
    expect(grove?.chunkZ).toBe(STARTER_GROVE_CHUNK.z);
    expect(grove?.state).toBe("discovered");
    expect(grove?.claimedAt).toBeNull();
    expect(grove?.hearthLitAt).toBeNull();
  });

  it("places 4 log voxels with the correct block id", () => {
    seedStarterGrove(handle.db, WORLD_ID);
    const mods = chunksRepo.getModifiedBlocks(
      handle.db,
      WORLD_ID,
      STARTER_GROVE_CHUNK.x,
      STARTER_GROVE_CHUNK.z,
    );
    const logMods = mods.filter((m) => m.blockId === LOG_PILE_BLOCK_ID);
    expect(logMods).toHaveLength(4);
    expect(logMods).toHaveLength(LOG_PILE_LOCAL_POSITIONS.length);
    for (const pos of LOG_PILE_LOCAL_POSITIONS) {
      expect(
        logMods.some(
          (m) => m.x === pos.x && m.y === STARTER_PROP_Y && m.z === pos.z,
        ),
      ).toBe(true);
    }
  });

  it("places 3 stone voxels with the correct block id", () => {
    seedStarterGrove(handle.db, WORLD_ID);
    const mods = chunksRepo.getModifiedBlocks(
      handle.db,
      WORLD_ID,
      STARTER_GROVE_CHUNK.x,
      STARTER_GROVE_CHUNK.z,
    );
    const stoneMods = mods.filter((m) => m.blockId === STONE_CAIRN_BLOCK_ID);
    expect(stoneMods).toHaveLength(3);
    expect(stoneMods).toHaveLength(STONE_CAIRN_LOCAL_POSITIONS.length);
    for (const pos of STONE_CAIRN_LOCAL_POSITIONS) {
      expect(
        stoneMods.some(
          (m) => m.x === pos.x && m.y === STARTER_PROP_Y && m.z === pos.z,
        ),
      ).toBe(true);
    }
  });

  it("learns recipe.hearth", () => {
    expect(recipesRepo.isKnown(handle.db, WORLD_ID, STARTER_RECIPE_ID)).toBe(
      false,
    );
    seedStarterGrove(handle.db, WORLD_ID);
    expect(recipesRepo.isKnown(handle.db, WORLD_ID, STARTER_RECIPE_ID)).toBe(
      true,
    );
  });

  it("is idempotent — second seed produces same mod count and recipe row", () => {
    seedStarterGrove(handle.db, WORLD_ID);
    const firstMods = chunksRepo.getModifiedBlocks(
      handle.db,
      WORLD_ID,
      STARTER_GROVE_CHUNK.x,
      STARTER_GROVE_CHUNK.z,
    ).length;
    const firstRecipes = recipesRepo.listKnownRecipes(handle.db, WORLD_ID);

    seedStarterGrove(handle.db, WORLD_ID);
    seedStarterGrove(handle.db, WORLD_ID);

    const secondMods = chunksRepo.getModifiedBlocks(
      handle.db,
      WORLD_ID,
      STARTER_GROVE_CHUNK.x,
      STARTER_GROVE_CHUNK.z,
    ).length;
    const secondRecipes = recipesRepo.listKnownRecipes(handle.db, WORLD_ID);
    expect(secondMods).toBe(firstMods);
    expect(secondRecipes.length).toBe(firstRecipes.length);
  });

  it("isStarterGroveSeeded reports false before, true after", () => {
    expect(isStarterGroveSeeded(handle.db, WORLD_ID)).toBe(false);
    seedStarterGrove(handle.db, WORLD_ID);
    expect(isStarterGroveSeeded(handle.db, WORLD_ID)).toBe(true);
  });
});
