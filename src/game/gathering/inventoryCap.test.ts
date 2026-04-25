/**
 * inventoryCap tests — Wave 16.
 *
 * Pure-arithmetic checks for the cozy-tier carry cap. Verifies both
 * limits (per-stack and stack-types) and confirms the
 * `accepted` / `capped` reporting matches the gather system's
 * expectations (drop SFX vs reject SFX).
 */

import { describe, expect, it } from "vitest";
import { applyInventoryCap, INVENTORY_CAP_CONFIG } from "./inventoryCap";

describe("applyInventoryCap", () => {
  it("loads the configured cap from inventory.config.json", () => {
    expect(INVENTORY_CAP_CONFIG.maxItemsPerStack).toBeGreaterThan(0);
    expect(INVENTORY_CAP_CONFIG.maxStackTypes).toBeGreaterThan(0);
  });

  describe("per-stack ceiling", () => {
    it("accepts when the stack has room", () => {
      const result = applyInventoryCap(
        "material.stone",
        1,
        { currentCounts: { "material.stone": 5 } },
        { maxItemsPerStack: 99, maxStackTypes: 16 },
      );
      expect(result).toEqual({ accepted: 1, capped: false });
    });

    it("partially accepts when the stack overflows mid-add", () => {
      const result = applyInventoryCap(
        "material.stone",
        10,
        { currentCounts: { "material.stone": 95 } },
        { maxItemsPerStack: 99, maxStackTypes: 16 },
      );
      expect(result).toEqual({ accepted: 4, capped: true });
    });

    it("rejects entirely when the stack is full", () => {
      const result = applyInventoryCap(
        "material.stone",
        5,
        { currentCounts: { "material.stone": 99 } },
        { maxItemsPerStack: 99, maxStackTypes: 16 },
      );
      expect(result).toEqual({ accepted: 0, capped: true });
    });
  });

  describe("distinct stack types", () => {
    it("accepts a new id when there is a free slot", () => {
      const result = applyInventoryCap(
        "material.stone",
        1,
        { currentCounts: { "material.dirt": 3 } },
        { maxItemsPerStack: 99, maxStackTypes: 16 },
      );
      expect(result).toEqual({ accepted: 1, capped: false });
    });

    it("rejects a brand-new id when all slots are full", () => {
      const counts: Record<string, number> = {};
      for (let i = 0; i < 16; i++) counts[`material.fake${i}`] = 1;
      const result = applyInventoryCap(
        "material.stone",
        1,
        { currentCounts: counts },
        { maxItemsPerStack: 99, maxStackTypes: 16 },
      );
      expect(result).toEqual({ accepted: 0, capped: true });
    });

    it("still tops up an existing id when all slots are full", () => {
      const counts: Record<string, number> = { "material.stone": 50 };
      for (let i = 0; i < 15; i++) counts[`material.fake${i}`] = 1;
      const result = applyInventoryCap(
        "material.stone",
        2,
        { currentCounts: counts },
        { maxItemsPerStack: 99, maxStackTypes: 16 },
      );
      expect(result).toEqual({ accepted: 2, capped: false });
    });
  });

  describe("Map<string, number> input", () => {
    it("accepts a Map for currentCounts", () => {
      const map = new Map<string, number>([["material.stone", 10]]);
      const result = applyInventoryCap(
        "material.stone",
        1,
        { currentCounts: map },
        { maxItemsPerStack: 99, maxStackTypes: 16 },
      );
      expect(result).toEqual({ accepted: 1, capped: false });
    });
  });
});
