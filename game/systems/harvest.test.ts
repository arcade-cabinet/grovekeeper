import type { Entity } from "@/game/ecs/world";
import {
  collectHarvest,
  computeYieldMultiplier,
  harvestCooldownTick,
  initHarvestable,
} from "@/game/systems/harvest";

// Mock the ECS world module
jest.mock("@/game/ecs/world", () => ({
  world: {
    addComponent: jest.fn((entity: Entity, key: string, value: unknown) => {
      (entity as unknown as Record<string, unknown>)[key] = value;
    }),
  },
}));

// Mock species config
jest.mock("@/game/config/species", () => ({
  getSpeciesById: (id: string) => {
    const species: Record<string, unknown> = {
      "white-oak": {
        id: "white-oak",
        yield: [{ resource: "timber", amount: 2 }],
        harvestCycleSec: 45,
      },
      ironbark: {
        id: "ironbark",
        yield: [{ resource: "timber", amount: 4 }],
        harvestCycleSec: 100,
      },
      "golden-apple": {
        id: "golden-apple",
        yield: [{ resource: "fruit", amount: 3 }],
        harvestCycleSec: 70,
      },
      baobab: {
        id: "baobab",
        yield: [
          { resource: "timber", amount: 2 },
          { resource: "sap", amount: 2 },
          { resource: "fruit", amount: 2 },
        ],
        harvestCycleSec: 150,
      },
    };
    return species[id] ?? undefined;
  },
}));

function makeTreeEntity(
  speciesId: string,
  stage: 0 | 1 | 2 | 3 | 4,
  overrides: Partial<Entity> = {},
): Entity {
  return {
    id: "test-tree",
    tree: {
      speciesId,
      stage,
      progress: 0,
      watered: false,
      totalGrowthTime: 0,
      plantedAt: 0,
      meshSeed: 0,
      wild: false,
      pruned: false,
      fertilized: false,
      baseModel: "tree01",
      winterModel: "",
      useWinterModel: false,
      seasonTint: "#228B22",
      ...overrides.tree,
    },
    position: { x: 0, y: 0, z: 0 },
    renderable: { visible: true, scale: 1 },
    ...overrides,
  };
}

describe("harvest system", () => {
  // ── initHarvestable ────────────────────────────────────────────

  describe("initHarvestable", () => {
    it("adds harvestable component to mature tree (stage 3)", () => {
      const entity = makeTreeEntity("white-oak", 3);
      initHarvestable(entity);
      expect(entity.harvestable).toBeDefined();
      expect(entity.harvestable!.resources).toEqual([{ type: "timber", amount: 2 }]);
      expect(entity.harvestable!.cooldownTotal).toBe(45);
      expect(entity.harvestable!.cooldownElapsed).toBe(0);
      expect(entity.harvestable!.ready).toBe(false);
    });

    it("adds harvestable to old growth tree (stage 4)", () => {
      const entity = makeTreeEntity("white-oak", 4);
      initHarvestable(entity);
      expect(entity.harvestable).toBeDefined();
    });

    it("does not add harvestable to sapling (stage 2)", () => {
      const entity = makeTreeEntity("white-oak", 2);
      initHarvestable(entity);
      expect(entity.harvestable).toBeUndefined();
    });

    it("does not add harvestable to seed (stage 0)", () => {
      const entity = makeTreeEntity("white-oak", 0);
      initHarvestable(entity);
      expect(entity.harvestable).toBeUndefined();
    });

    it("does not add harvestable if no tree component", () => {
      const entity: Entity = { id: "no-tree" };
      initHarvestable(entity);
      expect(entity.harvestable).toBeUndefined();
    });

    it("does not add harvestable for unknown species", () => {
      const entity = makeTreeEntity("nonexistent", 4);
      initHarvestable(entity);
      expect(entity.harvestable).toBeUndefined();
    });

    it("handles multi-resource species (baobab)", () => {
      const entity = makeTreeEntity("baobab", 3);
      initHarvestable(entity);
      expect(entity.harvestable!.resources).toHaveLength(3);
      expect(entity.harvestable!.cooldownTotal).toBe(150);
    });
  });

  // ── harvestCooldownTick ────────────────────────────────────────

  describe("harvestCooldownTick", () => {
    it("advances cooldown elapsed by deltaTime", () => {
      const entity = makeTreeEntity("white-oak", 3);
      entity.harvestable = {
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 0,
        cooldownTotal: 45,
        ready: false,
      };
      harvestCooldownTick(entity, 10);
      expect(entity.harvestable.cooldownElapsed).toBe(10);
    });

    it("marks ready when cooldown completes", () => {
      const entity = makeTreeEntity("white-oak", 3);
      entity.harvestable = {
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 40,
        cooldownTotal: 45,
        ready: false,
      };
      harvestCooldownTick(entity, 5);
      expect(entity.harvestable.ready).toBe(true);
    });

    it("marks ready when cooldown is exceeded", () => {
      const entity = makeTreeEntity("white-oak", 3);
      entity.harvestable = {
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 0,
        cooldownTotal: 45,
        ready: false,
      };
      harvestCooldownTick(entity, 100);
      expect(entity.harvestable.ready).toBe(true);
    });

    it("does nothing if already ready", () => {
      const entity = makeTreeEntity("white-oak", 3);
      entity.harvestable = {
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 45,
        cooldownTotal: 45,
        ready: true,
      };
      harvestCooldownTick(entity, 10);
      // cooldownElapsed should not change
      expect(entity.harvestable.cooldownElapsed).toBe(45);
    });

    it("does nothing if no harvestable component", () => {
      const entity = makeTreeEntity("white-oak", 3);
      // No harvestable component, should not throw
      expect(() => harvestCooldownTick(entity, 10)).not.toThrow();
    });
  });

  // ── computeYieldMultiplier ─────────────────────────────────────

  describe("computeYieldMultiplier", () => {
    it("returns 1.0 for mature (stage 3) non-special tree", () => {
      const entity = makeTreeEntity("white-oak", 3);
      expect(computeYieldMultiplier(entity)).toBe(1.0);
    });

    it("returns 1.5 for old growth (stage 4)", () => {
      const entity = makeTreeEntity("white-oak", 4);
      expect(computeYieldMultiplier(entity)).toBe(1.5);
    });

    it("applies pruned bonus (1.5x)", () => {
      const entity = makeTreeEntity("white-oak", 3);
      entity.tree!.pruned = true;
      expect(computeYieldMultiplier(entity)).toBe(1.5);
    });

    it("stacks old growth and pruned bonuses", () => {
      const entity = makeTreeEntity("white-oak", 4);
      entity.tree!.pruned = true;
      // 1.5 * 1.5 = 2.25
      expect(computeYieldMultiplier(entity)).toBeCloseTo(2.25, 6);
    });

    it("applies ironbark 3x at old growth", () => {
      const entity = makeTreeEntity("ironbark", 4);
      // stageMultiplier 1.5 * ironbarkMult 3.0 = 4.5
      expect(computeYieldMultiplier(entity)).toBeCloseTo(4.5, 6);
    });

    it("does not apply ironbark bonus at mature", () => {
      const entity = makeTreeEntity("ironbark", 3);
      expect(computeYieldMultiplier(entity)).toBe(1.0);
    });

    it("applies golden-apple 3x in autumn", () => {
      const entity = makeTreeEntity("golden-apple", 3);
      expect(computeYieldMultiplier(entity, "autumn")).toBe(3.0);
    });

    it("does not apply golden-apple bonus in other seasons", () => {
      const entity = makeTreeEntity("golden-apple", 3);
      expect(computeYieldMultiplier(entity, "spring")).toBe(1.0);
      expect(computeYieldMultiplier(entity, "summer")).toBe(1.0);
      expect(computeYieldMultiplier(entity, "winter")).toBe(1.0);
    });

    it("returns 1.0 if no tree component", () => {
      const entity: Entity = { id: "no-tree" };
      expect(computeYieldMultiplier(entity)).toBe(1.0);
    });
  });

  // ── collectHarvest ─────────────────────────────────────────────

  describe("collectHarvest", () => {
    it("returns resources when ready", () => {
      const entity = makeTreeEntity("white-oak", 3);
      entity.harvestable = {
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 45,
        cooldownTotal: 45,
        ready: true,
      };
      const result = collectHarvest(entity);
      expect(result).toEqual([{ type: "timber", amount: 2 }]);
    });

    it("returns null when not ready", () => {
      const entity = makeTreeEntity("white-oak", 3);
      entity.harvestable = {
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 10,
        cooldownTotal: 45,
        ready: false,
      };
      expect(collectHarvest(entity)).toBeNull();
    });

    it("returns null when no harvestable component", () => {
      const entity = makeTreeEntity("white-oak", 3);
      expect(collectHarvest(entity)).toBeNull();
    });

    it("resets cooldown after collecting", () => {
      const entity = makeTreeEntity("white-oak", 3);
      entity.harvestable = {
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 50,
        cooldownTotal: 45,
        ready: true,
      };
      collectHarvest(entity);
      expect(entity.harvestable.ready).toBe(false);
      expect(entity.harvestable.cooldownElapsed).toBe(0);
    });

    it("applies yield multiplier (Math.ceil)", () => {
      const entity = makeTreeEntity("white-oak", 4);
      entity.harvestable = {
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 45,
        cooldownTotal: 45,
        ready: true,
      };
      // Old growth mult = 1.5, amount = 2 * 1.5 = 3
      const result = collectHarvest(entity);
      expect(result).toEqual([{ type: "timber", amount: 3 }]);
    });

    it("clears pruned flag after harvest", () => {
      const entity = makeTreeEntity("white-oak", 3);
      entity.tree!.pruned = true;
      entity.harvestable = {
        resources: [{ type: "timber", amount: 2 }],
        cooldownElapsed: 45,
        cooldownTotal: 45,
        ready: true,
      };
      collectHarvest(entity);
      expect(entity.tree!.pruned).toBe(false);
    });

    it("handles multi-resource harvest with multiplier", () => {
      const entity = makeTreeEntity("baobab", 4);
      entity.harvestable = {
        resources: [
          { type: "timber", amount: 2 },
          { type: "sap", amount: 2 },
          { type: "fruit", amount: 2 },
        ],
        cooldownElapsed: 150,
        cooldownTotal: 150,
        ready: true,
      };
      // Old growth mult = 1.5 => each resource = ceil(2 * 1.5) = 3
      const result = collectHarvest(entity);
      expect(result).toEqual([
        { type: "timber", amount: 3 },
        { type: "sap", amount: 3 },
        { type: "fruit", amount: 3 },
      ]);
    });
  });
});
