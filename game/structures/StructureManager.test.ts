import {
  canPlace,
  canUpgrade,
  getAllTemplates,
  getAvailableTemplates,
  getEffectsAtPosition,
  getGrowthMultiplier,
  getHarvestMultiplier,
  getStaminaMultiplier,
  getTemplate,
  getUpgradeCost,
  getUpgradeTarget,
} from "./StructureManager.ts";

function makeCell(gridX: number, gridZ: number, type: string = "soil", occupied = false) {
  return {
    gridCell: {
      gridX,
      gridZ,
      type,
      occupied,
    },
  };
}

function makeStructureEntity(
  x: number,
  z: number,
  effectType: string,
  effectRadius: number,
  effectMagnitude: number,
) {
  return {
    structure: {
      templateId: "test",
      category: "essential" as const,
      modelPath: "",
      effectType: effectType as "growth_boost",
      effectRadius,
      effectMagnitude,
      level: 1,
      buildCost: [],
    },
    position: { x, z },
  };
}

describe("StructureManager", () => {
  describe("getTemplate", () => {
    it("returns the wooden-fence template", () => {
      const t = getTemplate("wooden-fence");
      expect(t).toBeDefined();
      expect(t!.id).toBe("wooden-fence");
      expect(t!.name).toBe("Wooden Fence");
      expect(t!.footprint).toEqual({ width: 1, depth: 1 });
    });

    it("returns the tool-shed template with effect", () => {
      const t = getTemplate("tool-shed");
      expect(t).toBeDefined();
      expect(t!.effect).toBeDefined();
      expect(t!.effect!.type).toBe("stamina_regen");
      expect(t!.effect!.radius).toBe(3);
    });

    it("returns the greenhouse template", () => {
      const t = getTemplate("greenhouse");
      expect(t).toBeDefined();
      expect(t!.effect!.type).toBe("growth_boost");
    });

    it("returns undefined for unknown template", () => {
      expect(getTemplate("nonexistent")).toBeUndefined();
    });
  });

  describe("getAllTemplates", () => {
    it("returns all structure templates", () => {
      const templates = getAllTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(10);
      const ids = templates.map((t) => t.id);
      expect(ids).toContain("wooden-fence");
      expect(ids).toContain("tool-shed");
      expect(ids).toContain("greenhouse");
      expect(ids).toContain("market-stall");
      expect(ids).toContain("well");
      expect(ids).toContain("bench");
    });
  });

  describe("getAvailableTemplates", () => {
    it("returns templates at or below the given level", () => {
      const atLevel3 = getAvailableTemplates(3);
      const ids = atLevel3.map((t) => t.id);
      expect(ids).toContain("wooden-fence"); // level 3
      expect(ids).not.toContain("tool-shed"); // level 5
    });

    it("returns more templates at higher levels", () => {
      const atLevel3 = getAvailableTemplates(3);
      const atLevel10 = getAvailableTemplates(10);
      expect(atLevel10.length).toBeGreaterThan(atLevel3.length);
    });

    it("sorts by requiredLevel ascending", () => {
      const templates = getAvailableTemplates(25);
      for (let i = 1; i < templates.length; i++) {
        expect(templates[i].requiredLevel).toBeGreaterThanOrEqual(templates[i - 1].requiredLevel);
      }
    });
  });

  describe("canPlace", () => {
    it("allows placement on empty soil tiles", () => {
      const cells = [makeCell(0, 0, "soil")];
      expect(canPlace("wooden-fence", 0, 0, cells)).toBe(true);
    });

    it("allows placement on path tiles", () => {
      const cells = [makeCell(0, 0, "path")];
      expect(canPlace("wooden-fence", 0, 0, cells)).toBe(true);
    });

    it("rejects placement on water tiles", () => {
      const cells = [makeCell(0, 0, "water")];
      expect(canPlace("wooden-fence", 0, 0, cells)).toBe(false);
    });

    it("rejects placement on rock tiles", () => {
      const cells = [makeCell(0, 0, "rock")];
      expect(canPlace("wooden-fence", 0, 0, cells)).toBe(false);
    });

    it("rejects placement on occupied tiles", () => {
      const cells = [makeCell(0, 0, "soil", true)];
      expect(canPlace("wooden-fence", 0, 0, cells)).toBe(false);
    });

    it("checks full footprint for multi-tile structures", () => {
      const cells = [makeCell(0, 0, "soil"), makeCell(1, 0, "soil")];
      expect(canPlace("tool-shed", 0, 0, cells)).toBe(true);
    });

    it("rejects when any tile in footprint is missing", () => {
      const cells = [makeCell(0, 0, "soil")];
      expect(canPlace("tool-shed", 0, 0, cells)).toBe(false);
    });

    it("rejects when any tile in footprint is water", () => {
      const cells = [makeCell(0, 0, "soil"), makeCell(1, 0, "water")];
      expect(canPlace("tool-shed", 0, 0, cells)).toBe(false);
    });

    it("rejects when any tile in footprint is occupied", () => {
      const cells = [makeCell(0, 0, "soil"), makeCell(1, 0, "soil", true)];
      expect(canPlace("tool-shed", 0, 0, cells)).toBe(false);
    });

    it("handles 2x2 footprint structures correctly", () => {
      const cells = [
        makeCell(0, 0, "soil"),
        makeCell(1, 0, "soil"),
        makeCell(0, 1, "soil"),
        makeCell(1, 1, "soil"),
      ];
      expect(canPlace("greenhouse", 0, 0, cells)).toBe(true);
    });

    it("rejects 2x2 placement when one corner is missing", () => {
      const cells = [makeCell(0, 0, "soil"), makeCell(1, 0, "soil"), makeCell(0, 1, "soil")];
      expect(canPlace("greenhouse", 0, 0, cells)).toBe(false);
    });

    it("handles offset placement positions", () => {
      const cells = [makeCell(5, 3, "soil")];
      expect(canPlace("wooden-fence", 5, 3, cells)).toBe(true);
    });

    it("returns false for unknown template", () => {
      const cells = [makeCell(0, 0, "soil")];
      expect(canPlace("nonexistent", 0, 0, cells)).toBe(false);
    });

    it("handles entities without gridCell component", () => {
      const cells = [{ gridCell: undefined }, makeCell(0, 0, "soil")];
      expect(canPlace("wooden-fence", 0, 0, cells)).toBe(true);
    });

    it("validates 3x2 footprint structure", () => {
      const cells = [
        makeCell(0, 0, "soil"),
        makeCell(1, 0, "soil"),
        makeCell(2, 0, "soil"),
        makeCell(0, 1, "soil"),
        makeCell(1, 1, "soil"),
        makeCell(2, 1, "soil"),
      ];
      expect(canPlace("forge", 0, 0, cells)).toBe(true);
    });
  });

  describe("getEffectsAtPosition", () => {
    it("returns effects from structures within radius", () => {
      const structures = [makeStructureEntity(0, 0, "growth_boost", 3, 0.2)];
      const effects = getEffectsAtPosition(1, 1, structures);
      expect(effects).toEqual([{ type: "growth_boost", magnitude: 0.2 }]);
    });

    it("excludes structures outside radius", () => {
      const structures = [makeStructureEntity(0, 0, "growth_boost", 2, 0.2)];
      const effects = getEffectsAtPosition(10, 10, structures);
      expect(effects).toEqual([]);
    });

    it("returns multiple effects from overlapping structures", () => {
      const structures = [
        makeStructureEntity(0, 0, "growth_boost", 5, 0.2),
        makeStructureEntity(2, 0, "harvest_boost", 5, 0.3),
      ];
      const effects = getEffectsAtPosition(1, 0, structures);
      expect(effects.length).toBe(2);
    });

    it("skips entities without structure or position", () => {
      const structures = [
        { structure: undefined, position: { x: 0, z: 0 } },
        { structure: { templateId: "test" }, position: undefined },
      ];
      // biome-ignore lint/suspicious/noExplicitAny: intentionally testing malformed input
      const effects = getEffectsAtPosition(0, 0, structures as any);
      expect(effects).toEqual([]);
    });
  });

  describe("multiplier helpers", () => {
    it("getGrowthMultiplier returns 1 with no structures", () => {
      expect(getGrowthMultiplier(0, 0, [])).toBe(1);
    });

    it("getGrowthMultiplier sums growth_boost magnitudes", () => {
      const structures = [
        makeStructureEntity(0, 0, "growth_boost", 5, 0.2),
        makeStructureEntity(1, 0, "growth_boost", 5, 0.3),
      ];
      expect(getGrowthMultiplier(0, 0, structures)).toBeCloseTo(1.5);
    });

    it("getHarvestMultiplier sums harvest_boost magnitudes", () => {
      const structures = [makeStructureEntity(0, 0, "harvest_boost", 5, 0.4)];
      expect(getHarvestMultiplier(0, 0, structures)).toBeCloseTo(1.4);
    });

    it("getStaminaMultiplier reduces from 1, capped at 0.5", () => {
      const structures = [makeStructureEntity(0, 0, "stamina_regen", 5, 0.3)];
      expect(getStaminaMultiplier(0, 0, structures)).toBeCloseTo(0.7);
    });

    it("getStaminaMultiplier does not go below 0.5", () => {
      const structures = [
        makeStructureEntity(0, 0, "stamina_regen", 5, 0.4),
        makeStructureEntity(1, 0, "stamina_regen", 5, 0.4),
      ];
      expect(getStaminaMultiplier(0, 0, structures)).toBe(0.5);
    });
  });

  describe("upgrade helpers", () => {
    it("canUpgrade returns true for structures with upgradeTo", () => {
      expect(canUpgrade("tool-shed")).toBe(true);
      expect(canUpgrade("greenhouse")).toBe(true);
    });

    it("canUpgrade returns false for structures without upgradeTo", () => {
      expect(canUpgrade("bench")).toBe(false);
      expect(canUpgrade("forge")).toBe(false);
    });

    it("getUpgradeTarget returns the upgrade template ID", () => {
      expect(getUpgradeTarget("tool-shed")).toBe("workshop");
      expect(getUpgradeTarget("well")).toBe("irrigation-system");
    });

    it("getUpgradeTarget returns null for non-upgradeable", () => {
      expect(getUpgradeTarget("bench")).toBeNull();
    });

    it("getUpgradeCost returns the cost of the upgrade target", () => {
      const cost = getUpgradeCost("tool-shed");
      expect(cost).not.toBeNull();
      // workshop costs: timber 100, sap 40
      expect(cost!.timber).toBe(100);
      expect(cost!.sap).toBe(40);
    });

    it("getUpgradeCost returns null for non-upgradeable", () => {
      expect(getUpgradeCost("bench")).toBeNull();
    });
  });
});
