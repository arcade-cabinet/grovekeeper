/**
 * placeMode + placement state-machine tests.
 *
 * Verifies the pure transitions (idle ↔ placing) without touching the
 * persistence layer. The persistence integration test for
 * `commitBlueprintPlacement` lives below, exercising the full chunk-
 * mod + structure-row path against a sql.js handle.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chunksRepo, structuresRepo, worldsRepo } from "@/db/repos";
import { createTestDb, type TestDbHandle } from "@/db/repos/testDb";
import {
  anchorInFrontOfPlayer,
  blueprintFootprint,
  cancelPlacing,
  commitBlueprintPlacement,
  commitPlacing,
  enterPlacing,
  getBlueprint,
  IDLE_STATE,
  updateAnchor,
  worldVoxelToChunk,
} from "./index";

describe("placeMode state machine", () => {
  it("starts in idle", () => {
    expect(IDLE_STATE.kind).toBe("idle");
  });

  it("enterPlacing transitions idle → placing with the right blueprint + anchor", () => {
    const next = enterPlacing(IDLE_STATE, "blueprint.hearth", {
      x: 5,
      y: 6,
      z: 7,
    });
    expect(next.kind).toBe("placing");
    if (next.kind !== "placing") return;
    expect(next.blueprintId).toBe("blueprint.hearth");
    expect(next.anchor).toEqual({ x: 5, y: 6, z: 7 });
  });

  it("enterPlacing copies the anchor (callers can mutate without leaking)", () => {
    const anchor = { x: 1, y: 2, z: 3 };
    const next = enterPlacing(IDLE_STATE, "blueprint.fence-section", anchor);
    anchor.x = 99;
    if (next.kind !== "placing") throw new Error("expected placing");
    expect(next.anchor.x).toBe(1);
  });

  it("updateAnchor moves the ghost while in place mode", () => {
    const placing = enterPlacing(IDLE_STATE, "blueprint.hearth", {
      x: 0,
      y: 0,
      z: 0,
    });
    const moved = updateAnchor(placing, { x: 4, y: 0, z: 5 });
    if (moved.kind !== "placing") throw new Error("expected placing");
    expect(moved.anchor).toEqual({ x: 4, y: 0, z: 5 });
  });

  it("updateAnchor is a no-op when not placing", () => {
    const after = updateAnchor(IDLE_STATE, { x: 4, y: 0, z: 5 });
    expect(after).toBe(IDLE_STATE);
  });

  it("updateAnchor returns the same state object when anchor unchanged", () => {
    const placing = enterPlacing(IDLE_STATE, "blueprint.hearth", {
      x: 1,
      y: 2,
      z: 3,
    });
    const same = updateAnchor(placing, { x: 1, y: 2, z: 3 });
    expect(same).toBe(placing);
  });

  it("cancelPlacing returns to idle without committing", () => {
    const placing = enterPlacing(IDLE_STATE, "blueprint.hearth", {
      x: 0,
      y: 0,
      z: 0,
    });
    expect(cancelPlacing(placing).kind).toBe("idle");
  });

  it("commitPlacing transitions placing → idle (caller does the side effects)", () => {
    const placing = enterPlacing(IDLE_STATE, "blueprint.hearth", {
      x: 0,
      y: 0,
      z: 0,
    });
    expect(commitPlacing(placing).kind).toBe("idle");
  });
});

describe("blueprintFootprint", () => {
  it("offsets every block by the anchor", () => {
    const blueprint = getBlueprint("blueprint.hearth");
    if (!blueprint) throw new Error("hearth blueprint missing");
    const stamps = blueprintFootprint(blueprint, { x: 10, y: 6, z: 20 });
    expect(stamps.length).toBe(blueprint.blocks.length);
    for (let i = 0; i < blueprint.blocks.length; i++) {
      const block = blueprint.blocks[i];
      expect(stamps[i]).toEqual({
        x: 10 + block.dx,
        y: 6 + block.dy,
        z: 20 + block.dz,
      });
    }
  });
});

describe("anchorInFrontOfPlayer", () => {
  it("snaps to the integer voxel grid", () => {
    const anchor = anchorInFrontOfPlayer({ x: 0, z: 0, yaw: 0 }, 6, 1.5);
    expect(Number.isInteger(anchor.x)).toBe(true);
    expect(Number.isInteger(anchor.z)).toBe(true);
    expect(anchor.y).toBe(6);
  });

  it("places the anchor in front of a player facing +Z (yaw=0)", () => {
    const anchor = anchorInFrontOfPlayer({ x: 8, z: 8, yaw: 0 }, 6, 2);
    // yaw=0 → forward = +Z
    expect(anchor.z).toBeGreaterThan(8);
    expect(anchor.x).toBe(8);
  });

  it("places the anchor in front of a player facing +X (yaw=π/2)", () => {
    const anchor = anchorInFrontOfPlayer(
      { x: 8, z: 8, yaw: Math.PI / 2 },
      6,
      2,
    );
    expect(anchor.x).toBeGreaterThan(8);
    expect(anchor.z).toBe(8);
  });
});

describe("worldVoxelToChunk", () => {
  it("decomposes positive coords correctly", () => {
    const r = worldVoxelToChunk({ x: 18, y: 5, z: 33 }, 16);
    expect(r.chunkX).toBe(1);
    expect(r.localX).toBe(2);
    expect(r.chunkZ).toBe(2);
    expect(r.localZ).toBe(1);
  });

  it("decomposes negative coords correctly (player walks across origin)", () => {
    const r = worldVoxelToChunk({ x: -1, y: 5, z: -17 }, 16);
    // floor(-1/16) = -1, local = -1 - (-1)*16 = 15.
    expect(r.chunkX).toBe(-1);
    expect(r.localX).toBe(15);
    expect(r.chunkZ).toBe(-2);
    expect(r.localZ).toBe(15);
  });
});

describe("commitBlueprintPlacement (persistence integration)", () => {
  let h: TestDbHandle;
  const W = "world-test";

  beforeEach(async () => {
    h = await createTestDb();
    worldsRepo.createWorld(h.db, { id: W, worldSeed: "seed-craft" });
  });

  afterEach(() => {
    h.close();
  });

  it("stamps every blueprint block onto the renderer", () => {
    const setBlock = vi.fn(() => true);
    const result = commitBlueprintPlacement({
      db: h.db,
      worldId: W,
      blueprintId: "blueprint.hearth",
      anchor: { x: 8, y: 6, z: 8 },
      chunkSize: 16,
      biome: "meadow",
      setBlock,
    });
    expect(result.success).toBe(true);
    expect(result.stamped.length).toBeGreaterThan(0);
    expect(setBlock).toHaveBeenCalledTimes(result.stamped.length);
  });

  it("persists each block as a chunk mod", () => {
    commitBlueprintPlacement({
      db: h.db,
      worldId: W,
      blueprintId: "blueprint.cooking-fire",
      anchor: { x: 4, y: 6, z: 4 },
      chunkSize: 16,
      biome: "meadow",
      setBlock: () => true,
    });
    const mods = chunksRepo.getModifiedBlocks(h.db, W, 0, 0);
    expect(mods.length).toBe(1);
    expect(mods[0].op).toBe("set");
    expect(mods[0].blockId).toBe("meadow.stone");
  });

  it("creates a placedStructures row tagged with the structure type", () => {
    const result = commitBlueprintPlacement({
      db: h.db,
      worldId: W,
      blueprintId: "blueprint.hearth",
      anchor: { x: 1, y: 6, z: 1 },
      chunkSize: 16,
      biome: "meadow",
      setBlock: () => true,
    });
    expect(result.structureId).not.toBeNull();
    if (!result.structureId) return;
    const row = structuresRepo.getStructureById(h.db, result.structureId);
    expect(row).not.toBeNull();
    expect(row?.type).toBe("hearth");
  });

  it("returns success=false (and skips persistence) when the renderer rejects", () => {
    let calls = 0;
    const result = commitBlueprintPlacement({
      db: h.db,
      worldId: W,
      blueprintId: "blueprint.hearth",
      anchor: { x: 1, y: 6, z: 1 },
      chunkSize: 16,
      biome: "meadow",
      // Reject the second voxel.
      setBlock: () => {
        calls++;
        return calls < 2;
      },
    });
    expect(result.success).toBe(false);
    expect(result.structureId).toBeNull();
    // Persistence should NOT have written a chunk mod.
    expect(chunksRepo.getModifiedBlocks(h.db, W, 0, 0).length).toBe(0);
  });

  it("returns success=false on unknown blueprint id", () => {
    const result = commitBlueprintPlacement({
      db: h.db,
      worldId: W,
      blueprintId: "blueprint.does-not-exist",
      anchor: { x: 0, y: 6, z: 0 },
      chunkSize: 16,
      biome: "meadow",
      setBlock: () => true,
    });
    expect(result.success).toBe(false);
  });
});
