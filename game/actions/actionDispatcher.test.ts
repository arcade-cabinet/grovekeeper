/**
 * actionDispatcher.test.ts
 *
 * Tests for the action dispatch system (Spec §11, §22, §35).
 * Maps tool type + target entity type -> GameAction -> executes system function.
 */

import {
  type DispatchContext,
  dispatchAction,
  resolveAction,
  type TargetEntityType,
} from "@/game/actions/actionDispatcher";

// Mock the GameActions module — dispatcher tests verify routing only.
jest.mock("@/game/actions", () => ({
  harvestTree: jest.fn(() => [{ type: "timber", amount: 2 }]),
  waterTree: jest.fn(() => true),
  pruneTree: jest.fn(() => true),
  plantTree: jest.fn(() => true),
  clearRock: jest.fn(() => true),
}));

// Mock haptics — dispatcher tests don't exercise haptic hardware.
jest.mock("@/game/systems/haptics", () => ({
  triggerActionHaptic: jest.fn().mockResolvedValue(undefined),
}));

// Mock store so dispatchAction side-effects are observable in tests.
const mockSetActiveCraftingStation = jest.fn();
const mockSetStamina = jest.fn();
const mockAddResource = jest.fn();
const mockIncrementToolUse = jest.fn();
const mockAdvanceTutorial = jest.fn();

jest.mock("@/game/stores", () => ({
  useGameStore: {
    getState: () => ({
      stamina: 100,
      worldSeed: "test-seed",
      currentZoneId: "starting-grove",
      setActiveCraftingStation: mockSetActiveCraftingStation,
      setStamina: mockSetStamina,
      addResource: mockAddResource,
      incrementToolUse: mockIncrementToolUse,
      advanceTutorial: mockAdvanceTutorial,
      placeTrap: undefined,
      collectTrap: undefined,
    }),
  },
}));

// Mock cooking/forging/mining/fishing/traps to control interaction resolver results.
jest.mock("@/game/systems/cooking", () => ({
  resolveCampfireInteraction: jest.fn((entity: unknown) => {
    if (entity && typeof entity === "object" && "campfire" in entity) {
      const e = entity as { campfire: { lit: boolean } };
      return {
        isCampfire: true,
        isLit: e.campfire.lit,
        canCookNow: e.campfire.lit,
        interactionLabel: e.campfire.lit ? "Cook" : "Light Campfire",
      };
    }
    return { isCampfire: false, isLit: false, canCookNow: false, interactionLabel: "" };
  }),
}));

jest.mock("@/game/systems/forging", () => ({
  resolveForgeInteraction: jest.fn((entity: unknown) => {
    if (entity && typeof entity === "object" && "forge" in entity) {
      const e = entity as { forge: { active: boolean } };
      return {
        isForge: true,
        isActive: e.forge.active,
        canForgeNow: e.forge.active,
        interactionLabel: e.forge.active ? "Forge" : "Light Forge",
      };
    }
    return { isForge: false, isActive: false, canForgeNow: false, interactionLabel: "" };
  }),
}));

jest.mock("@/game/systems/mining", () => ({
  resolveMiningInteraction: jest.fn((entity: unknown) => {
    if (entity && typeof entity === "object" && "rock" in entity) {
      return {
        isRock: true,
        rockType: "granite",
        hardness: 2,
        staminaCost: 10,
        interactionLabel: "Mine",
      };
    }
    return { isRock: false, rockType: "", hardness: 0, staminaCost: 0, interactionLabel: "" };
  }),
  mineRock: jest.fn(() => ({ oreType: "stone", amount: 3 })),
}));

jest.mock("@/game/systems/fishing", () => ({
  isWaterFishable: jest.fn((type: string) => ["ocean", "river", "pond", "stream"].includes(type)),
}));

jest.mock("@/game/systems/traps", () => ({
  createTrapComponent: jest.fn((trapType: string) => {
    if (trapType === "unknown") throw new Error("Unknown trap type");
    return { trapType, damage: 10, triggerRadius: 1.5, armed: true, cooldown: 0, modelPath: "" };
  }),
}));

jest.mock("@/game/utils/seedWords", () => ({
  scopedRNG: jest.fn(() => () => 0.5),
}));

import {
  clearRock,
  harvestTree,
  plantTree,
  pruneTree,
  waterTree,
} from "@/game/actions";
import { triggerActionHaptic } from "@/game/systems/haptics";

const mockHarvestTree = harvestTree as jest.Mock;
const mockWaterTree = waterTree as jest.Mock;
const mockPruneTree = pruneTree as jest.Mock;
const mockPlantTree = plantTree as jest.Mock;
const mockClearRock = clearRock as jest.Mock;
const mockTriggerActionHaptic = triggerActionHaptic as jest.Mock;

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

// ── resolveAction crafting verbs (Spec §22, §35) ──────────────────────────────

describe("resolveAction crafting verbs (Spec §22, §35)", () => {
  it("any tool + campfire -> COOK", () => {
    expect(resolveAction("axe", "campfire")).toBe("COOK");
    expect(resolveAction("trowel", "campfire")).toBe("COOK");
    expect(resolveAction("pick", "campfire")).toBe("COOK");
  });

  it("any tool + forge -> FORGE", () => {
    expect(resolveAction("axe", "forge")).toBe("FORGE");
    expect(resolveAction("hammer", "forge")).toBe("FORGE");
  });

  it("pick + rock -> MINE (Spec §22, distinct from shovel+rock=DIG)", () => {
    expect(resolveAction("pick", "rock")).toBe("MINE");
  });

  it("shovel + rock is still DIG (shovel clears rock, pick mines ore)", () => {
    expect(resolveAction("shovel", "rock")).toBe("DIG");
  });

  it("fishing-rod + water -> FISH", () => {
    expect(resolveAction("fishing-rod", "water")).toBe("FISH");
  });

  it("fishing-rod + soil -> null (not a valid fishing target)", () => {
    expect(resolveAction("fishing-rod", "soil")).toBeNull();
  });

  it("trap + soil -> PLACE_TRAP", () => {
    expect(resolveAction("trap", "soil")).toBe("PLACE_TRAP");
  });

  it("trap + null -> PLACE_TRAP (empty ground)", () => {
    expect(resolveAction("trap", null)).toBe("PLACE_TRAP");
  });

  it("any tool + trap -> CHECK_TRAP", () => {
    expect(resolveAction("axe", "trap")).toBe("CHECK_TRAP");
    expect(resolveAction("trowel", "trap")).toBe("CHECK_TRAP");
  });

  it("hammer + null -> BUILD", () => {
    expect(resolveAction("hammer", null)).toBe("BUILD");
  });

  it("hammer + soil -> BUILD", () => {
    expect(resolveAction("hammer", "soil")).toBe("BUILD");
  });

  it("hammer + tree -> null (can't build on a tree)", () => {
    expect(resolveAction("hammer", "tree")).toBeNull();
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

// ── Haptics wiring (Spec §11) ──────────────────────────────────────────────

describe("dispatchAction haptics (Spec §11)", () => {
  it("fires triggerActionHaptic on successful CHOP", () => {
    dispatchAction({ toolId: "axe", targetType: "tree", entity: { id: "t1" } as never });
    expect(mockTriggerActionHaptic).toHaveBeenCalledWith("CHOP");
  });

  it("fires triggerActionHaptic on successful DIG", () => {
    dispatchAction({ toolId: "shovel", targetType: "rock", gridX: 1, gridZ: 2 });
    expect(mockTriggerActionHaptic).toHaveBeenCalledWith("DIG");
  });

  it("does not fire triggerActionHaptic when action fails (missing entity)", () => {
    dispatchAction({ toolId: "axe", targetType: "tree" });
    expect(mockTriggerActionHaptic).not.toHaveBeenCalled();
  });

  it("does not fire triggerActionHaptic when no valid action mapping", () => {
    dispatchAction({ toolId: "almanac", targetType: "tree" });
    expect(mockTriggerActionHaptic).not.toHaveBeenCalled();
  });
});

// ── dispatchAction crafting verbs (Spec §22, §35) ─────────────────────────────

describe("dispatchAction COOK — campfire interaction (Spec §22.1)", () => {
  const litCampfireEntity = {
    id: "campfire_001",
    campfire: { lit: true, fastTravelId: null, cookingSlots: 2 },
  };
  const unlitCampfireEntity = {
    id: "campfire_002",
    campfire: { lit: false, fastTravelId: null, cookingSlots: 2 },
  };

  it("opens cooking UI when campfire is lit", () => {
    const result = dispatchAction({
      toolId: "trowel",
      targetType: "campfire",
      entity: litCampfireEntity as never,
    });
    expect(result).toBe(true);
    expect(mockSetActiveCraftingStation).toHaveBeenCalledWith({
      type: "cooking",
      entityId: "campfire_001",
    });
  });

  it("returns true but clears station when campfire is unlit", () => {
    const result = dispatchAction({
      toolId: "axe",
      targetType: "campfire",
      entity: unlitCampfireEntity as never,
    });
    expect(result).toBe(true);
    expect(mockSetActiveCraftingStation).toHaveBeenCalledWith(null);
  });

  it("returns false when entity has no campfire component", () => {
    const result = dispatchAction({
      toolId: "axe",
      targetType: "campfire",
      entity: { id: "npc_001" } as never,
    });
    expect(result).toBe(false);
    expect(mockSetActiveCraftingStation).not.toHaveBeenCalled();
  });

  it("returns false when entity is missing", () => {
    const result = dispatchAction({ toolId: "trowel", targetType: "campfire" });
    expect(result).toBe(false);
    expect(mockSetActiveCraftingStation).not.toHaveBeenCalled();
  });

  it("fires triggerActionHaptic on successful COOK", () => {
    dispatchAction({ toolId: "axe", targetType: "campfire", entity: litCampfireEntity as never });
    expect(mockTriggerActionHaptic).toHaveBeenCalledWith("COOK");
  });
});

describe("dispatchAction FORGE — forge interaction (Spec §22.2)", () => {
  const activeForgeEntity = { id: "forge_001", forge: { active: true } };
  const inactiveForgeEntity = { id: "forge_002", forge: { active: false } };

  it("opens forging UI when forge is active", () => {
    const result = dispatchAction({
      toolId: "pick",
      targetType: "forge",
      entity: activeForgeEntity as never,
    });
    expect(result).toBe(true);
    expect(mockSetActiveCraftingStation).toHaveBeenCalledWith({
      type: "forging",
      entityId: "forge_001",
    });
  });

  it("returns true but clears station when forge is inactive", () => {
    const result = dispatchAction({
      toolId: "axe",
      targetType: "forge",
      entity: inactiveForgeEntity as never,
    });
    expect(result).toBe(true);
    expect(mockSetActiveCraftingStation).toHaveBeenCalledWith(null);
  });

  it("returns false when entity has no forge component", () => {
    const result = dispatchAction({
      toolId: "axe",
      targetType: "forge",
      entity: { id: "npc_001" } as never,
    });
    expect(result).toBe(false);
  });

  it("fires triggerActionHaptic on successful FORGE", () => {
    dispatchAction({ toolId: "axe", targetType: "forge", entity: activeForgeEntity as never });
    expect(mockTriggerActionHaptic).toHaveBeenCalledWith("FORGE");
  });
});

describe("dispatchAction MINE — pick on rock (Spec §22)", () => {
  const rockEntity = { id: "rock_001", rock: { rockType: "granite" } };

  it("deducts stamina and credits ore to inventory on success", () => {
    const result = dispatchAction({
      toolId: "pick",
      targetType: "rock",
      entity: rockEntity as never,
      biome: "starting-grove",
    });
    expect(result).toBe(true);
    expect(mockSetStamina).toHaveBeenCalledWith(90); // 100 - 10 staminaCost
    expect(mockAddResource).toHaveBeenCalledWith("stone", 3);
    expect(mockIncrementToolUse).toHaveBeenCalledWith("pick");
  });

  it("returns false when entity has no rock component", () => {
    const result = dispatchAction({
      toolId: "pick",
      targetType: "rock",
      entity: { id: "tree_001", tree: {} } as never,
    });
    expect(result).toBe(false);
    expect(mockSetStamina).not.toHaveBeenCalled();
  });

  it("returns false when entity is missing", () => {
    const result = dispatchAction({ toolId: "pick", targetType: "rock" });
    expect(result).toBe(false);
  });

  it("fires triggerActionHaptic on successful MINE", () => {
    dispatchAction({ toolId: "pick", targetType: "rock", entity: rockEntity as never });
    expect(mockTriggerActionHaptic).toHaveBeenCalledWith("MINE");
  });
});

describe("dispatchAction FISH — fishing-rod on fishable water (Spec §22)", () => {
  const pondEntity = { id: "water_001", waterBody: { waterType: "pond" } };
  const waterfallEntity = { id: "water_002", waterBody: { waterType: "waterfall" } };

  it("opens fishing minigame panel when water is fishable", () => {
    const result = dispatchAction({
      toolId: "fishing-rod",
      targetType: "water",
      entity: pondEntity as never,
      waterBodyType: "pond",
    });
    expect(result).toBe(true);
    expect(mockSetActiveCraftingStation).toHaveBeenCalledWith({
      type: "fishing",
      entityId: "water_001",
    });
  });

  it("returns false for non-fishable water body type", () => {
    const result = dispatchAction({
      toolId: "fishing-rod",
      targetType: "water",
      entity: waterfallEntity as never,
      waterBodyType: "waterfall",
    });
    expect(result).toBe(false);
    expect(mockSetActiveCraftingStation).not.toHaveBeenCalled();
  });

  it("fires triggerActionHaptic on successful FISH", () => {
    dispatchAction({
      toolId: "fishing-rod",
      targetType: "water",
      entity: pondEntity as never,
      waterBodyType: "river",
    });
    expect(mockTriggerActionHaptic).toHaveBeenCalledWith("FISH");
  });
});

describe("dispatchAction PLACE_TRAP — trap item on ground (Spec §22)", () => {
  it("calls createTrapComponent to validate and returns true for valid trap type", () => {
    const result = dispatchAction({
      toolId: "trap",
      targetType: "soil",
      gridX: 3,
      gridZ: 5,
      trapType: "spike",
    });
    expect(result).toBe(true);
  });

  it("returns false for unknown trap type", () => {
    const result = dispatchAction({
      toolId: "trap",
      targetType: "soil",
      gridX: 3,
      gridZ: 5,
      trapType: "unknown",
    });
    expect(result).toBe(false);
  });

  it("returns false when trapType is missing", () => {
    const result = dispatchAction({
      toolId: "trap",
      targetType: "soil",
      gridX: 3,
      gridZ: 5,
    });
    expect(result).toBe(false);
  });

  it("returns false when grid coords are missing", () => {
    const result = dispatchAction({
      toolId: "trap",
      targetType: "soil",
      trapType: "spike",
    });
    expect(result).toBe(false);
  });

  it("fires triggerActionHaptic on successful PLACE_TRAP", () => {
    dispatchAction({ toolId: "trap", targetType: "soil", gridX: 1, gridZ: 1, trapType: "spike" });
    expect(mockTriggerActionHaptic).toHaveBeenCalledWith("PLACE_TRAP");
  });
});

describe("dispatchAction CHECK_TRAP — activating a placed trap (Spec §22)", () => {
  const trapEntity = { id: "trap_001", trap: { trapType: "spike", armed: false, cooldown: 0 } };

  it("returns true when entity id is present", () => {
    const result = dispatchAction({
      toolId: "axe",
      targetType: "trap",
      entity: trapEntity as never,
    });
    expect(result).toBe(true);
  });

  it("returns false when entity is missing", () => {
    const result = dispatchAction({ toolId: "axe", targetType: "trap" });
    expect(result).toBe(false);
  });

  it("fires triggerActionHaptic on successful CHECK_TRAP", () => {
    dispatchAction({ toolId: "axe", targetType: "trap", entity: trapEntity as never });
    expect(mockTriggerActionHaptic).toHaveBeenCalledWith("CHECK_TRAP");
  });
});

describe("dispatchAction BUILD — hammer opens kitbash panel (Spec §35)", () => {
  it("opens kitbash panel with empty entityId", () => {
    const result = dispatchAction({
      toolId: "hammer",
      targetType: null,
    });
    expect(result).toBe(true);
    expect(mockSetActiveCraftingStation).toHaveBeenCalledWith({
      type: "kitbash",
      entityId: "",
    });
  });

  it("also opens from soil target", () => {
    const result = dispatchAction({
      toolId: "hammer",
      targetType: "soil",
    });
    expect(result).toBe(true);
    expect(mockSetActiveCraftingStation).toHaveBeenCalledWith({
      type: "kitbash",
      entityId: "",
    });
  });

  it("fires triggerActionHaptic on successful BUILD", () => {
    dispatchAction({ toolId: "hammer", targetType: null });
    expect(mockTriggerActionHaptic).toHaveBeenCalledWith("BUILD");
  });
});

// ── Tutorial advancement wiring (Spec §25.1) ──────────────────────────────────

describe("dispatchAction tutorial advancement (Spec §25.1)", () => {
  const mockTreeEntity = { id: "tree_001", tree: { speciesId: "white-oak", stage: 3 } };
  const mockSaplingEntity = { id: "tree_002", tree: { speciesId: "white-oak", stage: 1 } };

  it("calls advanceTutorial('action:harvest') after successful CHOP", () => {
    dispatchAction({
      toolId: "axe",
      targetType: "tree",
      entity: mockTreeEntity as never,
    });
    expect(mockAdvanceTutorial).toHaveBeenCalledWith("action:harvest");
  });

  it("does not call advanceTutorial when CHOP fails (harvestTree returns null)", () => {
    mockHarvestTree.mockReturnValueOnce(null);
    dispatchAction({
      toolId: "axe",
      targetType: "tree",
      entity: mockSaplingEntity as never,
    });
    expect(mockAdvanceTutorial).not.toHaveBeenCalledWith("action:harvest");
  });

  it("calls advanceTutorial('action:water') after successful WATER", () => {
    dispatchAction({
      toolId: "watering-can",
      targetType: "tree",
      entity: mockSaplingEntity as never,
    });
    expect(mockAdvanceTutorial).toHaveBeenCalledWith("action:water");
  });

  it("does not call advanceTutorial when WATER fails (waterTree returns false)", () => {
    mockWaterTree.mockReturnValueOnce(false);
    dispatchAction({
      toolId: "watering-can",
      targetType: "tree",
      entity: mockSaplingEntity as never,
    });
    expect(mockAdvanceTutorial).not.toHaveBeenCalledWith("action:water");
  });

  it("calls advanceTutorial('action:plant') after successful PLANT", () => {
    dispatchAction({
      toolId: "trowel",
      targetType: "soil",
      gridX: 3,
      gridZ: 5,
      speciesId: "white-oak",
    });
    expect(mockAdvanceTutorial).toHaveBeenCalledWith("action:plant");
  });

  it("does not call advanceTutorial when PLANT fails (plantTree returns false)", () => {
    mockPlantTree.mockReturnValueOnce(false);
    dispatchAction({
      toolId: "trowel",
      targetType: "soil",
      gridX: 3,
      gridZ: 5,
      speciesId: "white-oak",
    });
    expect(mockAdvanceTutorial).not.toHaveBeenCalledWith("action:plant");
  });

  it("does not call advanceTutorial for non-grove actions (BUILD)", () => {
    dispatchAction({ toolId: "hammer", targetType: null });
    expect(mockAdvanceTutorial).not.toHaveBeenCalled();
  });
});
