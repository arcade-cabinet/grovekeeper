/**
 * Repo tests — exercise CRUD + idempotency + cascade behavior for every
 * RC redesign repo against an in-memory sql.js drizzle handle.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as chunksRepo from "./chunksRepo";
import * as dialogueRepo from "./dialogueRepo";
import * as grovesRepo from "./grovesRepo";
import * as inventoryRepo from "./inventoryRepo";
import * as recipesRepo from "./recipesRepo";
import * as structuresRepo from "./structuresRepo";
import { createTestDb, type TestDbHandle } from "./testDb";
import * as worldsRepo from "./worldsRepo";

const W1 = "world-1";
const W2 = "world-2";

let h: TestDbHandle;

beforeEach(async () => {
  h = await createTestDb();
  worldsRepo.createWorld(h.db, { id: W1, worldSeed: "seed-A" });
  worldsRepo.createWorld(h.db, { id: W2, worldSeed: "seed-B" });
});

afterEach(() => {
  h.close();
});

describe("worldsRepo", () => {
  it("createWorld + getWorld round-trip", () => {
    const w = worldsRepo.getWorld(h.db, W1);
    expect(w?.id).toBe(W1);
    expect(w?.worldSeed).toBe("seed-A");
    expect(w?.difficulty).toBe("sapling");
  });

  it("listWorlds orders by lastPlayedAt desc", () => {
    worldsRepo.updateLastPlayed(h.db, W1, 1000);
    worldsRepo.updateLastPlayed(h.db, W2, 2000);
    const list = worldsRepo.listWorlds(h.db);
    expect(list.map((w) => w.id)).toEqual([W2, W1]);
  });

  it("renameWorld updates name", () => {
    worldsRepo.renameWorld(h.db, W1, "My Garden");
    expect(worldsRepo.getWorld(h.db, W1)?.name).toBe("My Garden");
  });

  it("deleteWorld removes the row", () => {
    worldsRepo.deleteWorld(h.db, W1);
    expect(worldsRepo.getWorld(h.db, W1)).toBeNull();
  });

  it("deleteWorld cascades to groves, inventory, recipes, dialogue, chunks, structures", () => {
    grovesRepo.discoverGrove(h.db, {
      id: "g1",
      worldId: W1,
      chunkX: 0,
      chunkZ: 0,
      biome: "meadow",
    });
    inventoryRepo.addItem(h.db, W1, "twig", 5);
    recipesRepo.learnRecipe(h.db, W1, "hearth");
    dialogueRepo.recordPhrase(h.db, W1, "spirit", "hello");
    chunksRepo.applyBlockMod(h.db, W1, 0, 0, "meadow", {
      x: 1,
      y: 1,
      z: 1,
      op: "set",
      blockId: "stone",
    });
    structuresRepo.placeStructure(h.db, {
      id: "s1",
      worldId: W1,
      groveId: "g1",
      x: 0,
      y: 0,
      z: 0,
      type: "hearth",
    });

    worldsRepo.deleteWorld(h.db, W1);

    expect(grovesRepo.getGroveById(h.db, "g1")).toBeNull();
    expect(inventoryRepo.listItems(h.db, W1)).toHaveLength(0);
    expect(recipesRepo.listKnownRecipes(h.db, W1)).toHaveLength(0);
    expect(dialogueRepo.getLastPhrase(h.db, W1, "spirit")).toBeNull();
    expect(chunksRepo.hasChunk(h.db, W1, 0, 0)).toBe(false);
    expect(structuresRepo.getStructureById(h.db, "s1")).toBeNull();
  });
});

describe("grovesRepo", () => {
  it("discoverGrove inserts; double-discover is a no-op (idempotent)", () => {
    const a = grovesRepo.discoverGrove(h.db, {
      id: "g1",
      worldId: W1,
      chunkX: 1,
      chunkZ: 2,
      biome: "forest",
    });
    const b = grovesRepo.discoverGrove(h.db, {
      id: "g2", // different id, same chunk
      worldId: W1,
      chunkX: 1,
      chunkZ: 2,
      biome: "forest",
    });
    expect(b.id).toBe(a.id);
    expect(grovesRepo.listGrovesByWorld(h.db, W1)).toHaveLength(1);
  });

  it("claimGrove flips state to claimed and stamps claimedAt", () => {
    grovesRepo.discoverGrove(h.db, {
      id: "g1",
      worldId: W1,
      chunkX: 0,
      chunkZ: 0,
      biome: "meadow",
    });
    const claimed = grovesRepo.claimGrove(h.db, "g1", 12345);
    expect(claimed.state).toBe("claimed");
    expect(claimed.claimedAt).toBe(12345);
  });

  it("claimGrove on already-claimed grove is idempotent", () => {
    grovesRepo.discoverGrove(h.db, {
      id: "g1",
      worldId: W1,
      chunkX: 0,
      chunkZ: 0,
      biome: "meadow",
    });
    grovesRepo.claimGrove(h.db, "g1", 100);
    const second = grovesRepo.claimGrove(h.db, "g1", 200);
    expect(second.claimedAt).toBe(100); // still the first stamp
  });

  it("claimGrove on missing grove throws", () => {
    expect(() => grovesRepo.claimGrove(h.db, "nope")).toThrow();
  });

  it("lightHearth stamps hearthLitAt; double-light is idempotent", () => {
    grovesRepo.discoverGrove(h.db, {
      id: "g1",
      worldId: W1,
      chunkX: 0,
      chunkZ: 0,
      biome: "meadow",
    });
    const lit = grovesRepo.lightHearth(h.db, "g1", 500);
    expect(lit.hearthLitAt).toBe(500);
    const second = grovesRepo.lightHearth(h.db, "g1", 999);
    expect(second.hearthLitAt).toBe(500);
  });

  it("getGroveAt finds by chunk coords", () => {
    grovesRepo.discoverGrove(h.db, {
      id: "g1",
      worldId: W1,
      chunkX: 7,
      chunkZ: -3,
      biome: "coast",
    });
    expect(grovesRepo.getGroveAt(h.db, W1, 7, -3)?.id).toBe("g1");
    expect(grovesRepo.getGroveAt(h.db, W1, 7, 3)).toBeNull();
  });

  it("listGrovesByWorld filters by state", () => {
    grovesRepo.discoverGrove(h.db, {
      id: "g1",
      worldId: W1,
      chunkX: 0,
      chunkZ: 0,
      biome: "meadow",
    });
    grovesRepo.discoverGrove(h.db, {
      id: "g2",
      worldId: W1,
      chunkX: 1,
      chunkZ: 0,
      biome: "meadow",
    });
    grovesRepo.claimGrove(h.db, "g2");
    expect(grovesRepo.listGrovesByWorld(h.db, W1, "claimed")).toHaveLength(1);
    expect(grovesRepo.listGrovesByWorld(h.db, W1, "discovered")).toHaveLength(
      1,
    );
    expect(grovesRepo.listGrovesByWorld(h.db, W1)).toHaveLength(2);
  });
});

describe("chunksRepo", () => {
  it("applyBlockMod creates the row and stores the mod", () => {
    chunksRepo.applyBlockMod(h.db, W1, 5, 5, "forest", {
      x: 1,
      y: 2,
      z: 3,
      op: "set",
      blockId: "log",
    });
    const mods = chunksRepo.getModifiedBlocks(h.db, W1, 5, 5);
    expect(mods).toEqual([{ x: 1, y: 2, z: 3, op: "set", blockId: "log" }]);
  });

  it("applyBlockMod on existing chunk replaces same-voxel mod (latest wins)", () => {
    chunksRepo.applyBlockMod(h.db, W1, 0, 0, "meadow", {
      x: 1,
      y: 1,
      z: 1,
      op: "set",
      blockId: "stone",
    });
    chunksRepo.applyBlockMod(h.db, W1, 0, 0, "meadow", {
      x: 1,
      y: 1,
      z: 1,
      op: "remove",
    });
    const mods = chunksRepo.getModifiedBlocks(h.db, W1, 0, 0);
    expect(mods).toHaveLength(1);
    expect(mods[0].op).toBe("remove");
  });

  it("hasChunk reflects presence", () => {
    expect(chunksRepo.hasChunk(h.db, W1, 0, 0)).toBe(false);
    chunksRepo.applyBlockMod(h.db, W1, 0, 0, "meadow", {
      x: 0,
      y: 0,
      z: 0,
      op: "set",
    });
    expect(chunksRepo.hasChunk(h.db, W1, 0, 0)).toBe(true);
  });

  it("clearChunkMods empties mod list but keeps the row", () => {
    chunksRepo.applyBlockMod(h.db, W1, 0, 0, "meadow", {
      x: 0,
      y: 0,
      z: 0,
      op: "set",
    });
    chunksRepo.clearChunkMods(h.db, W1, 0, 0);
    expect(chunksRepo.hasChunk(h.db, W1, 0, 0)).toBe(true);
    expect(chunksRepo.getModifiedBlocks(h.db, W1, 0, 0)).toEqual([]);
  });

  it("getModifiedBlocks returns [] on missing chunk", () => {
    expect(chunksRepo.getModifiedBlocks(h.db, W1, 99, 99)).toEqual([]);
  });
});

describe("inventoryRepo", () => {
  it("addItem creates row, returns running count", () => {
    expect(inventoryRepo.addItem(h.db, W1, "twig", 3)).toBe(3);
    expect(inventoryRepo.addItem(h.db, W1, "twig", 2)).toBe(5);
    expect(inventoryRepo.getItemCount(h.db, W1, "twig")).toBe(5);
  });

  it("removeItem floors at zero", () => {
    inventoryRepo.addItem(h.db, W1, "twig", 3);
    expect(inventoryRepo.removeItem(h.db, W1, "twig", 10)).toBe(0);
    expect(inventoryRepo.getItemCount(h.db, W1, "twig")).toBe(0);
  });

  it("removeItem on absent row is a no-op", () => {
    expect(inventoryRepo.removeItem(h.db, W1, "absent", 5)).toBe(0);
  });

  it("listItems returns this world only", () => {
    inventoryRepo.addItem(h.db, W1, "twig", 1);
    inventoryRepo.addItem(h.db, W2, "stone", 2);
    expect(inventoryRepo.listItems(h.db, W1)).toHaveLength(1);
    expect(inventoryRepo.listItems(h.db, W2)).toHaveLength(1);
  });

  it("setItemCount clamps and floors", () => {
    inventoryRepo.setItemCount(h.db, W1, "twig", 5);
    expect(inventoryRepo.getItemCount(h.db, W1, "twig")).toBe(5);
    inventoryRepo.setItemCount(h.db, W1, "twig", -10);
    expect(inventoryRepo.getItemCount(h.db, W1, "twig")).toBe(0);
  });
});

describe("recipesRepo", () => {
  it("learnRecipe is idempotent", () => {
    recipesRepo.learnRecipe(h.db, W1, "hearth", 100);
    const second = recipesRepo.learnRecipe(h.db, W1, "hearth", 200);
    expect(second.learnedAt).toBe(100); // first wins
    expect(recipesRepo.listKnownRecipes(h.db, W1)).toHaveLength(1);
  });

  it("isKnown reflects presence", () => {
    expect(recipesRepo.isKnown(h.db, W1, "hearth")).toBe(false);
    recipesRepo.learnRecipe(h.db, W1, "hearth");
    expect(recipesRepo.isKnown(h.db, W1, "hearth")).toBe(true);
  });

  it("forgetRecipe removes", () => {
    recipesRepo.learnRecipe(h.db, W1, "hearth");
    recipesRepo.forgetRecipe(h.db, W1, "hearth");
    expect(recipesRepo.isKnown(h.db, W1, "hearth")).toBe(false);
  });
});

describe("structuresRepo", () => {
  beforeEach(() => {
    grovesRepo.discoverGrove(h.db, {
      id: "g1",
      worldId: W1,
      chunkX: 0,
      chunkZ: 0,
      biome: "meadow",
    });
  });

  it("placeStructure + getStructureById round-trip", () => {
    structuresRepo.placeStructure(h.db, {
      id: "s1",
      worldId: W1,
      groveId: "g1",
      x: 1,
      y: 0,
      z: 2,
      type: "hearth",
      rotation: 1.57,
    });
    const got = structuresRepo.getStructureById(h.db, "s1");
    expect(got?.type).toBe("hearth");
    expect(got?.rotation).toBeCloseTo(1.57);
  });

  it("listStructuresInGrove filters by grove", () => {
    structuresRepo.placeStructure(h.db, {
      id: "s1",
      worldId: W1,
      groveId: "g1",
      x: 0,
      y: 0,
      z: 0,
      type: "hearth",
    });
    structuresRepo.placeStructure(h.db, {
      id: "s2",
      worldId: W1,
      groveId: null,
      x: 5,
      y: 0,
      z: 5,
      type: "fence",
    });
    expect(structuresRepo.listStructuresInGrove(h.db, "g1")).toHaveLength(1);
    expect(structuresRepo.listStructuresInWorld(h.db, W1)).toHaveLength(2);
  });

  it("removeStructure deletes the row", () => {
    structuresRepo.placeStructure(h.db, {
      id: "s1",
      worldId: W1,
      groveId: "g1",
      x: 0,
      y: 0,
      z: 0,
      type: "hearth",
    });
    structuresRepo.removeStructure(h.db, "s1");
    expect(structuresRepo.getStructureById(h.db, "s1")).toBeNull();
  });
});

describe("dialogueRepo", () => {
  it("recordPhrase + getLastPhrase round-trip", () => {
    dialogueRepo.recordPhrase(h.db, W1, "spirit", "hello", 100);
    const last = dialogueRepo.getLastPhrase(h.db, W1, "spirit");
    expect(last?.lastPhraseId).toBe("hello");
    expect(last?.saidAt).toBe(100);
  });

  it("recordPhrase overwrites the previous phrase", () => {
    dialogueRepo.recordPhrase(h.db, W1, "spirit", "first", 100);
    dialogueRepo.recordPhrase(h.db, W1, "spirit", "second", 200);
    const last = dialogueRepo.getLastPhrase(h.db, W1, "spirit");
    expect(last?.lastPhraseId).toBe("second");
    expect(last?.saidAt).toBe(200);
  });

  it("clearNpcHistory removes the row", () => {
    dialogueRepo.recordPhrase(h.db, W1, "spirit", "hello");
    dialogueRepo.clearNpcHistory(h.db, W1, "spirit");
    expect(dialogueRepo.getLastPhrase(h.db, W1, "spirit")).toBeNull();
  });
});
