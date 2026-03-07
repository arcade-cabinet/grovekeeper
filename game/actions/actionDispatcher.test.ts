/**
 * actionDispatcher.test.ts
 *
 * Tests for the action dispatch system (Spec §11).
 * Maps tool type + target entity type -> GameAction -> executes system function.
 */

import {
  dispatchAction,
  resolveAction,
  type DispatchContext,
  type TargetEntityType,
} from "@/game/actions/actionDispatcher";

// Mock the GameActions module — dispatcher tests verify routing only.
jest.mock("@/game/actions/GameActions", () => ({
  harvestTree: jest.fn(() => [{ type: "timber", amount: 2 }]),
  waterTree: jest.fn(() => true),
  pruneTree: jest.fn(() => true),
  plantTree: jest.fn(() => true),
  clearRock: jest.fn(() => true),
}));

import {
  harvestTree,
  waterTree,
  pruneTree,
  plantTree,
  clearRock,
} from "@/game/actions/GameActions";

const mockHarvestTree = harvestTree as jest.Mock;
const mockWaterTree = waterTree as jest.Mock;
const mockPruneTree = pruneTree as jest.Mock;
const mockPlantTree = plantTree as jest.Mock;
const mockClearRock = clearRock as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── resolveAction ─────────────────────────────────────────────────────────────

describe("resolveAction (Spec §11)", () => {
  it("axe + tree -> CHOP", () => {
    expect(resolveAction("axe", "tree")).toBe("CHOP");
  });

  it("watering-can + tree -> WATER", () => {
    expect(resolveAction("watering-can", "tree")).toBe("WATER");
  });

  it("pruning-shears + tree -> PRUNE", () => {
    expect(resolveAction("pruning-shears", "tree")).toBe("PRUNE");
  });

  it("trowel + soil -> PLANT", () => {
    expect(resolveAction("trowel", "soil")).toBe("PLANT");
  });

  it("trowel + null -> PLANT (empty ground target)", () => {
    expect(resolveAction("trowel", null)).toBe("PLANT");
  });

  it("shovel + rock -> DIG", () => {
    expect(resolveAction("shovel", "rock")).toBe("DIG");
  });

  it("axe + npc -> null (no valid action)", () => {
    expect(resolveAction("axe", "npc")).toBeNull();
  });

  it("watering-can + rock -> null", () => {
    expect(resolveAction("watering-can", "rock")).toBeNull();
  });

  it("almanac + tree -> null (INSPECT is not a game verb)", () => {
    expect(resolveAction("almanac", "tree")).toBeNull();
  });

  it("pruning-shears + soil -> null", () => {
    expect(resolveAction("pruning-shears", "soil")).toBeNull();
  });

  it("unknown tool -> null", () => {
    expect(resolveAction("seed-pouch", "tree")).toBeNull();
  });
});

// ── dispatchAction ────────────────────────────────────────────────────────────

describe("dispatchAction (Spec §11)", () => {
  const mockTreeEntity = { id: "tree_001", tree: { speciesId: "white-oak", stage: 3 } };
  const mockSaplingEntity = { id: "tree_002", tree: { speciesId: "white-oak", stage: 1 } };

  describe("CHOP — axe on tree", () => {
    it("calls harvestTree with entity id and returns true on success", () => {
      const ctx: DispatchContext = {
        toolId: "axe",
        targetType: "tree",
        entity: mockTreeEntity as never,
      };
      const result = dispatchAction(ctx);
      expect(mockHarvestTree).toHaveBeenCalledWith("tree_001");
      expect(result).toBe(true);
    });

    it("returns false when harvestTree returns null", () => {
      mockHarvestTree.mockReturnValueOnce(null);
      const ctx: DispatchContext = {
        toolId: "axe",
        targetType: "tree",
        entity: mockSaplingEntity as never,
      };
      expect(dispatchAction(ctx)).toBe(false);
    });

    it("returns false when entity is missing", () => {
      const ctx: DispatchContext = { toolId: "axe", targetType: "tree" };
      expect(dispatchAction(ctx)).toBe(false);
      expect(mockHarvestTree).not.toHaveBeenCalled();
    });
  });

  describe("WATER — watering-can on tree", () => {
    it("calls waterTree with entity id and returns true on success", () => {
      const ctx: DispatchContext = {
        toolId: "watering-can",
        targetType: "tree",
        entity: mockSaplingEntity as never,
      };
      const result = dispatchAction(ctx);
      expect(mockWaterTree).toHaveBeenCalledWith("tree_002");
      expect(result).toBe(true);
    });

    it("returns false when waterTree returns false", () => {
      mockWaterTree.mockReturnValueOnce(false);
      const ctx: DispatchContext = {
        toolId: "watering-can",
        targetType: "tree",
        entity: mockSaplingEntity as never,
      };
      expect(dispatchAction(ctx)).toBe(false);
    });

    it("returns false when entity is missing", () => {
      const ctx: DispatchContext = { toolId: "watering-can", targetType: "tree" };
      expect(dispatchAction(ctx)).toBe(false);
      expect(mockWaterTree).not.toHaveBeenCalled();
    });
  });

  describe("PRUNE — pruning-shears on tree", () => {
    it("calls pruneTree with entity id and returns true on success", () => {
      const ctx: DispatchContext = {
        toolId: "pruning-shears",
        targetType: "tree",
        entity: mockTreeEntity as never,
      };
      const result = dispatchAction(ctx);
      expect(mockPruneTree).toHaveBeenCalledWith("tree_001");
      expect(result).toBe(true);
    });

    it("returns false when entity is missing", () => {
      const ctx: DispatchContext = { toolId: "pruning-shears", targetType: "tree" };
      expect(dispatchAction(ctx)).toBe(false);
      expect(mockPruneTree).not.toHaveBeenCalled();
    });
  });

  describe("PLANT — trowel on soil", () => {
    it("calls plantTree with speciesId + grid coords on soil target", () => {
      const ctx: DispatchContext = {
        toolId: "trowel",
        targetType: "soil",
        gridX: 3,
        gridZ: 5,
        speciesId: "white-oak",
      };
      const result = dispatchAction(ctx);
      expect(mockPlantTree).toHaveBeenCalledWith("white-oak", 3, 5);
      expect(result).toBe(true);
    });

    it("calls plantTree when targetType is null (empty ground)", () => {
      const ctx: DispatchContext = {
        toolId: "trowel",
        targetType: null,
        gridX: 4,
        gridZ: 6,
        speciesId: "silver-maple",
      };
      dispatchAction(ctx);
      expect(mockPlantTree).toHaveBeenCalledWith("silver-maple", 4, 6);
    });

    it("returns false when speciesId is missing", () => {
      const ctx: DispatchContext = {
        toolId: "trowel",
        targetType: "soil",
        gridX: 3,
        gridZ: 5,
      };
      expect(dispatchAction(ctx)).toBe(false);
      expect(mockPlantTree).not.toHaveBeenCalled();
    });

    it("returns false when grid coords are missing", () => {
      const ctx: DispatchContext = {
        toolId: "trowel",
        targetType: "soil",
        speciesId: "white-oak",
      };
      expect(dispatchAction(ctx)).toBe(false);
      expect(mockPlantTree).not.toHaveBeenCalled();
    });
  });

  describe("DIG — shovel on rock", () => {
    it("calls clearRock with grid coords and returns true on success", () => {
      const ctx: DispatchContext = {
        toolId: "shovel",
        targetType: "rock",
        gridX: 7,
        gridZ: 2,
      };
      const result = dispatchAction(ctx);
      expect(mockClearRock).toHaveBeenCalledWith(7, 2);
      expect(result).toBe(true);
    });

    it("returns false when grid coords are missing", () => {
      const ctx: DispatchContext = { toolId: "shovel", targetType: "rock" };
      expect(dispatchAction(ctx)).toBe(false);
      expect(mockClearRock).not.toHaveBeenCalled();
    });
  });

  describe("no-op cases", () => {
    it("returns false for tool+target combos with no mapped action", () => {
      const ctx: DispatchContext = { toolId: "almanac", targetType: "tree" };
      expect(dispatchAction(ctx)).toBe(false);
    });

    it("returns false for axe + npc", () => {
      const ctx: DispatchContext = {
        toolId: "axe",
        targetType: "npc" as TargetEntityType,
        entity: { id: "npc_001" } as never,
      };
      expect(dispatchAction(ctx)).toBe(false);
      expect(mockHarvestTree).not.toHaveBeenCalled();
    });
  });
});
