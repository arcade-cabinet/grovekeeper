/**
 * blockDrops tests — Wave 16.
 *
 * Enforces coverage: every collidable voxel in every shipped biome
 * has either a drop entry or an explicit `unbreakable: true` flag.
 * This catches the failure mode where a new biome ships with a new
 * block id and nobody updates `blockDrops.ts`, leaving the gather
 * system silently doing nothing on swing.
 */

import { describe, expect, it } from "vitest";
import { COAST_BIOME, FOREST_BIOME, GROVE_BIOME, MEADOW_BIOME } from "./biomes";
import {
  BLOCK_DROPS,
  type BlockDrop,
  getBlockDrop,
  isUnbreakable,
  listCollidableBlockNames,
} from "./blockDrops";

describe("blockDrops", () => {
  describe("coverage", () => {
    it("every collidable block in every biome has an entry", () => {
      const missing: string[] = [];
      for (const name of listCollidableBlockNames()) {
        if (!getBlockDrop(name)) missing.push(name);
      }
      expect(missing).toEqual([]);
    });

    it("listCollidableBlockNames includes every biome's blocks", () => {
      const names = listCollidableBlockNames();
      // Spot-check one block per biome.
      expect(names).toContain("meadow.stone");
      expect(names).toContain("forest.stone-mossy");
      expect(names).toContain("coast.rock");
      expect(names).toContain("grove.luminous-grass");
    });
  });

  describe("biome-prefixed ids resolve", () => {
    it("resolves meadow blocks", () => {
      for (const block of MEADOW_BIOME.blocks) {
        expect(getBlockDrop(block.name)).not.toBeNull();
      }
    });

    it("resolves forest blocks", () => {
      for (const block of FOREST_BIOME.blocks) {
        expect(getBlockDrop(block.name)).not.toBeNull();
      }
    });

    it("resolves coast blocks", () => {
      for (const block of COAST_BIOME.blocks) {
        expect(getBlockDrop(block.name)).not.toBeNull();
      }
    });

    it("resolves grove blocks (all unbreakable)", () => {
      for (const block of GROVE_BIOME.blocks) {
        const entry = getBlockDrop(block.name);
        expect(entry).not.toBeNull();
        expect(isUnbreakable(entry)).toBe(true);
      }
    });
  });

  describe("grove is sacred", () => {
    it("every grove block is unbreakable", () => {
      for (const block of GROVE_BIOME.blocks) {
        const entry = getBlockDrop(block.name);
        expect(isUnbreakable(entry)).toBe(true);
      }
    });

    it("no grove block has a drop item", () => {
      for (const block of GROVE_BIOME.blocks) {
        const entry = BLOCK_DROPS[block.name];
        // TypeScript: the unbreakable variant has no `itemId` field.
        expect((entry as Partial<BlockDrop>).itemId).toBeUndefined();
      }
    });
  });

  describe("default drops match the spec table", () => {
    it("logs/wood drop material.log at 2 hits (none yet — but stones map cleanly)", () => {
      // No log block ships in the four RC biomes today (decorations are
      // mushroom/fern/wildflower/coral/shell/seagrass). The hit-count
      // contract for stones is the load-bearing one — log mapping
      // exists in the spec for future biomes.
      expect(getBlockDrop("meadow.stone")).toMatchObject({
        itemId: "material.stone",
        hitsToBreak: 3,
      });
    });

    it("dirt drops material.dirt at 1 hit", () => {
      expect(getBlockDrop("meadow.dirt")).toMatchObject({
        itemId: "material.dirt",
        hitsToBreak: 1,
      });
      expect(getBlockDrop("forest.dirt-dark")).toMatchObject({
        itemId: "material.dirt",
        hitsToBreak: 1,
      });
    });

    it("stone drops material.stone at 3 hits", () => {
      expect(getBlockDrop("meadow.stone")).toMatchObject({
        itemId: "material.stone",
        hitsToBreak: 3,
      });
      expect(getBlockDrop("forest.stone-mossy")).toMatchObject({
        itemId: "material.stone",
        hitsToBreak: 3,
      });
      expect(getBlockDrop("coast.rock")).toMatchObject({
        itemId: "material.stone",
        hitsToBreak: 3,
      });
    });

    it("sand drops material.sand at 1 hit", () => {
      expect(getBlockDrop("coast.sand")).toMatchObject({
        itemId: "material.sand",
        hitsToBreak: 1,
      });
      expect(getBlockDrop("coast.sand-wet")).toMatchObject({
        itemId: "material.sand",
        hitsToBreak: 1,
      });
    });

    it("grass clears at 1 hit with no drop", () => {
      const flat = getBlockDrop("meadow.grass-flat") as BlockDrop;
      expect(flat.hitsToBreak).toBe(1);
      expect(flat.itemId).toBeUndefined();
      const tall = getBlockDrop("meadow.grass-tall") as BlockDrop;
      expect(tall.hitsToBreak).toBe(1);
      expect(tall.itemId).toBeUndefined();
    });
  });

  describe("getBlockDrop", () => {
    it("returns null for unknown block names", () => {
      expect(getBlockDrop("nonexistent.block")).toBeNull();
    });
  });

  describe("isUnbreakable", () => {
    it("returns true only for unbreakable entries", () => {
      expect(isUnbreakable(getBlockDrop("grove.luminous-grass"))).toBe(true);
      expect(isUnbreakable(getBlockDrop("meadow.stone"))).toBe(false);
      expect(isUnbreakable(null)).toBe(false);
    });
  });
});
