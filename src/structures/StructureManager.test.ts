import { describe, expect, it } from "vitest";
import {
  canPlace,
  getAvailableTemplates,
  getEffectsAtPosition,
  getGrowthMultiplier,
  getHarvestMultiplier,
  getStaminaMultiplier,
  getTemplate,
} from "./StructureManager";

// ============================================
// Helpers
// ============================================

/**
 * Build a grid of clear soil cells covering the given range.
 */
function makeGridCells(
  width: number,
  depth: number,
  overrides?: Record<string, { occupied?: boolean; type?: string }>,
) {
  const cells = [];
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      const key = `${x},${z}`;
      const override = overrides?.[key];
      cells.push({
        gridCell: {
          gridX: x,
          gridZ: z,
          occupied: override?.occupied ?? false,
          type: override?.type ?? "soil",
        },
      });
    }
  }
  return cells;
}

/**
 * Build a structure entity with a given effect at a given position.
 */
function makeStructureEntity(
  x: number,
  z: number,
  effectType: "growth_boost" | "harvest_boost" | "stamina_regen" | "storage",
  effectRadius: number,
  effectMagnitude: number,
) {
  return {
    structure: {
      templateId: "test",
      effectType,
      effectRadius,
      effectMagnitude,
    },
    position: { x, z },
  };
}

// ============================================
// getTemplate
// ============================================

describe("getTemplate", () => {
  it("returns the greenhouse template by ID", () => {
    const t = getTemplate("greenhouse");
    expect(t).toBeDefined();
    expect(t?.name).toBe("Greenhouse");
    expect(t?.requiredLevel).toBe(10);
  });

  it("returns the tool-shed template by ID", () => {
    const t = getTemplate("tool-shed");
    expect(t).toBeDefined();
    expect(t?.name).toBe("Tool Shed");
    expect(t?.effect?.type).toBe("stamina_regen");
  });

  it("returns undefined for an unknown template ID", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });

  it("returns correct cost for wooden-fence", () => {
    const t = getTemplate("wooden-fence");
    expect(t).toBeDefined();
    expect(t?.cost).toEqual({ timber: 5 });
  });

  it("returns correct cost for greenhouse", () => {
    const t = getTemplate("greenhouse");
    expect(t?.cost).toEqual({ timber: 100, sap: 50, fruit: 30 });
  });

  it("bench has no effect (decorative)", () => {
    const t = getTemplate("bench");
    expect(t).toBeDefined();
    expect(t?.effect).toBeUndefined();
  });
});

// ============================================
// getAvailableTemplates
// ============================================

describe("getAvailableTemplates", () => {
  it("returns nothing at level 0", () => {
    const available = getAvailableTemplates(0);
    expect(available).toHaveLength(0);
  });

  it("returns only wooden-fence at level 3", () => {
    const available = getAvailableTemplates(3);
    const ids = available.map((t) => t.id);
    expect(ids).toContain("wooden-fence");
    expect(ids).not.toContain("tool-shed");
    expect(ids).not.toContain("greenhouse");
  });

  it("returns fence and bench at level 4", () => {
    const available = getAvailableTemplates(4);
    const ids = available.map((t) => t.id);
    expect(ids).toContain("wooden-fence");
    expect(ids).toContain("bench");
    expect(available).toHaveLength(2);
  });

  it("returns all 6 templates at level 10", () => {
    const available = getAvailableTemplates(10);
    expect(available).toHaveLength(6);
  });

  it("results are sorted by requiredLevel ascending", () => {
    const available = getAvailableTemplates(10);
    for (let i = 1; i < available.length; i++) {
      expect(available[i].requiredLevel).toBeGreaterThanOrEqual(
        available[i - 1].requiredLevel,
      );
    }
  });

  it("returns templates at exactly the required level", () => {
    const available = getAvailableTemplates(5);
    const ids = available.map((t) => t.id);
    expect(ids).toContain("tool-shed"); // requiredLevel: 5
  });
});

// ============================================
// canPlace — occupied cells
// ============================================

describe("canPlace — occupied cells", () => {
  it("returns false when a cell is occupied", () => {
    const cells = makeGridCells(4, 4, { "0,0": { occupied: true } });
    expect(canPlace("wooden-fence", 0, 0, cells)).toBe(false);
  });

  it("returns false when any cell in the footprint is occupied (2x1 shed)", () => {
    const cells = makeGridCells(4, 4, { "1,0": { occupied: true } });
    expect(canPlace("tool-shed", 0, 0, cells)).toBe(false);
  });

  it("returns false when any cell in a 2x2 footprint is occupied", () => {
    const cells = makeGridCells(4, 4, { "1,1": { occupied: true } });
    expect(canPlace("greenhouse", 0, 0, cells)).toBe(false);
  });
});

// ============================================
// canPlace — water/rock tiles
// ============================================

describe("canPlace — water and rock tiles", () => {
  it("returns false for water tile", () => {
    const cells = makeGridCells(4, 4, { "0,0": { type: "water" } });
    expect(canPlace("wooden-fence", 0, 0, cells)).toBe(false);
  });

  it("returns false for rock tile", () => {
    const cells = makeGridCells(4, 4, { "0,0": { type: "rock" } });
    expect(canPlace("wooden-fence", 0, 0, cells)).toBe(false);
  });

  it("returns false when second cell in footprint is water", () => {
    const cells = makeGridCells(4, 4, { "1,0": { type: "water" } });
    expect(canPlace("tool-shed", 0, 0, cells)).toBe(false);
  });
});

// ============================================
// canPlace — clear soil cells
// ============================================

describe("canPlace — valid placement", () => {
  it("returns true for a 1x1 structure on clear soil", () => {
    const cells = makeGridCells(4, 4);
    expect(canPlace("wooden-fence", 0, 0, cells)).toBe(true);
  });

  it("returns true for a 2x1 structure on clear soil", () => {
    const cells = makeGridCells(4, 4);
    expect(canPlace("tool-shed", 0, 0, cells)).toBe(true);
  });

  it("returns true for a 2x2 structure on clear soil", () => {
    const cells = makeGridCells(4, 4);
    expect(canPlace("greenhouse", 0, 0, cells)).toBe(true);
  });

  it("allows placement on path tiles", () => {
    const cells = makeGridCells(4, 4, {
      "0,0": { type: "path" },
    });
    expect(canPlace("wooden-fence", 0, 0, cells)).toBe(true);
  });

  it("returns false when footprint extends beyond known grid cells", () => {
    // Only provide a 1x1 grid; tool-shed needs 2x1
    const cells = makeGridCells(1, 1);
    expect(canPlace("tool-shed", 0, 0, cells)).toBe(false);
  });
});

// ============================================
// canPlace — unknown template
// ============================================

describe("canPlace — unknown template", () => {
  it("returns false for an unknown template ID", () => {
    const cells = makeGridCells(4, 4);
    expect(canPlace("nonexistent", 0, 0, cells)).toBe(false);
  });
});

// ============================================
// getEffectsAtPosition
// ============================================

describe("getEffectsAtPosition", () => {
  it("returns empty array with no structures", () => {
    const effects = getEffectsAtPosition(0, 0, []);
    expect(effects).toEqual([]);
  });

  it("returns the effect when within radius", () => {
    const structures = [makeStructureEntity(0, 0, "growth_boost", 3, 0.2)];
    const effects = getEffectsAtPosition(1, 1, structures);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe("growth_boost");
    expect(effects[0].magnitude).toBe(0.2);
  });

  it("returns empty when outside radius", () => {
    const structures = [makeStructureEntity(0, 0, "growth_boost", 2, 0.2)];
    const effects = getEffectsAtPosition(5, 5, structures);
    expect(effects).toHaveLength(0);
  });

  it("returns multiple effects from different structures", () => {
    const structures = [
      makeStructureEntity(0, 0, "growth_boost", 5, 0.2),
      makeStructureEntity(1, 1, "harvest_boost", 5, 0.3),
    ];
    const effects = getEffectsAtPosition(0, 0, structures);
    expect(effects).toHaveLength(2);
  });

  it("includes structure at exactly the radius boundary", () => {
    const structures = [makeStructureEntity(0, 0, "growth_boost", 3, 0.15)];
    // Distance from (0,0) to (3,0) is exactly 3
    const effects = getEffectsAtPosition(3, 0, structures);
    expect(effects).toHaveLength(1);
  });

  it("skips structures with no effect data", () => {
    const structures = [
      {
        structure: { templateId: "bench" },
        position: { x: 0, z: 0 },
      },
    ];
    const effects = getEffectsAtPosition(0, 0, structures);
    expect(effects).toHaveLength(0);
  });
});

// ============================================
// getGrowthMultiplier
// ============================================

describe("getGrowthMultiplier", () => {
  it("returns 1.0 with no structures", () => {
    expect(getGrowthMultiplier(0, 0, [])).toBe(1.0);
  });

  it("returns boosted value near a greenhouse", () => {
    const structures = [makeStructureEntity(0, 0, "growth_boost", 4, 0.2)];
    expect(getGrowthMultiplier(1, 1, structures)).toBe(1.2);
  });

  it("stacks multiple growth boosts", () => {
    const structures = [
      makeStructureEntity(0, 0, "growth_boost", 5, 0.2), // greenhouse
      makeStructureEntity(2, 0, "growth_boost", 5, 0.15), // well
    ];
    expect(getGrowthMultiplier(1, 0, structures)).toBeCloseTo(1.35);
  });

  it("ignores non-growth effects", () => {
    const structures = [
      makeStructureEntity(0, 0, "harvest_boost", 5, 0.3),
      makeStructureEntity(0, 0, "stamina_regen", 5, 0.2),
    ];
    expect(getGrowthMultiplier(0, 0, structures)).toBe(1.0);
  });

  it("returns 1.0 when out of all growth structure radii", () => {
    const structures = [makeStructureEntity(0, 0, "growth_boost", 2, 0.2)];
    expect(getGrowthMultiplier(10, 10, structures)).toBe(1.0);
  });
});

// ============================================
// getHarvestMultiplier
// ============================================

describe("getHarvestMultiplier", () => {
  it("returns 1.0 with no structures", () => {
    expect(getHarvestMultiplier(0, 0, [])).toBe(1.0);
  });

  it("returns boosted value near a market stall", () => {
    const structures = [makeStructureEntity(0, 0, "harvest_boost", 3, 0.3)];
    expect(getHarvestMultiplier(1, 0, structures)).toBe(1.3);
  });

  it("stacks multiple harvest boosts", () => {
    const structures = [
      makeStructureEntity(0, 0, "harvest_boost", 5, 0.3),
      makeStructureEntity(2, 0, "harvest_boost", 5, 0.3),
    ];
    expect(getHarvestMultiplier(1, 0, structures)).toBeCloseTo(1.6);
  });

  it("ignores non-harvest effects", () => {
    const structures = [makeStructureEntity(0, 0, "growth_boost", 5, 0.2)];
    expect(getHarvestMultiplier(0, 0, structures)).toBe(1.0);
  });
});

// ============================================
// getStaminaMultiplier
// ============================================

describe("getStaminaMultiplier", () => {
  it("returns 1.0 with no structures", () => {
    expect(getStaminaMultiplier(0, 0, [])).toBe(1.0);
  });

  it("returns reduced value near a tool shed", () => {
    const structures = [makeStructureEntity(0, 0, "stamina_regen", 3, 0.2)];
    expect(getStaminaMultiplier(1, 0, structures)).toBe(0.8);
  });

  it("stacks multiple stamina reductions", () => {
    const structures = [
      makeStructureEntity(0, 0, "stamina_regen", 5, 0.2),
      makeStructureEntity(2, 0, "stamina_regen", 5, 0.2),
    ];
    // 1 - 0.4 = 0.6
    expect(getStaminaMultiplier(1, 0, structures)).toBeCloseTo(0.6);
  });

  it("is capped at 0.5 minimum", () => {
    const structures = [
      makeStructureEntity(0, 0, "stamina_regen", 5, 0.3),
      makeStructureEntity(1, 0, "stamina_regen", 5, 0.3),
    ];
    // 1 - 0.6 = 0.4 => capped to 0.5
    expect(getStaminaMultiplier(0.5, 0, structures)).toBe(0.5);
  });

  it("caps at 0.5 even with extreme reduction", () => {
    const structures = [
      makeStructureEntity(0, 0, "stamina_regen", 10, 0.5),
      makeStructureEntity(1, 0, "stamina_regen", 10, 0.5),
    ];
    // 1 - 1.0 = 0.0 => capped to 0.5
    expect(getStaminaMultiplier(0, 0, structures)).toBe(0.5);
  });

  it("ignores non-stamina effects", () => {
    const structures = [
      makeStructureEntity(0, 0, "growth_boost", 5, 0.5),
      makeStructureEntity(0, 0, "harvest_boost", 5, 0.5),
    ];
    expect(getStaminaMultiplier(0, 0, structures)).toBe(1.0);
  });
});
