import { describe, it, expect } from "vitest";
import { TOOLS, getToolById, type ToolData } from "./tools";

describe("Tool Definitions", () => {
  it("has exactly 8 tools", () => {
    expect(TOOLS).toHaveLength(8);
  });

  it("every tool has required fields", () => {
    for (const tool of TOOLS) {
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(typeof tool.staminaCost).toBe("number");
      expect(tool.staminaCost).toBeGreaterThanOrEqual(0);
      expect(tool.unlockLevel).toBeGreaterThanOrEqual(1);
    }
  });

  it("includes all 8 spec tools", () => {
    const ids = TOOLS.map((t) => t.id);
    expect(ids).toContain("trowel");
    expect(ids).toContain("watering-can");
    expect(ids).toContain("almanac");
    expect(ids).toContain("pruning-shears");
    expect(ids).toContain("seed-pouch");
    expect(ids).toContain("shovel");
    expect(ids).toContain("axe");
    expect(ids).toContain("compost-bin");
  });

  it("trowel and watering-can unlock at level 1", () => {
    expect(getToolById("trowel")!.unlockLevel).toBe(1);
    expect(getToolById("watering-can")!.unlockLevel).toBe(1);
  });

  it("almanac costs 0 stamina", () => {
    expect(getToolById("almanac")!.staminaCost).toBe(0);
  });

  it("seed-pouch costs 0 stamina", () => {
    expect(getToolById("seed-pouch")!.staminaCost).toBe(0);
  });

  it("axe is most expensive (10 stamina)", () => {
    expect(getToolById("axe")!.staminaCost).toBe(10);
  });

  it("getToolById returns undefined for unknown id", () => {
    expect(getToolById("nonexistent")).toBeUndefined();
  });
});
