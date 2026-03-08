/**
 * Mining wiring tests — Spec §45.
 *
 * Tests the integration between:
 * - resolveAction: pick + rock -> MINE
 * - resolveMiningInteraction: entity type guard + stamina cost
 * - mineRock: biome-based ore yield
 * - ResourceType includes "ore" and "stone"
 *
 * Individual pure function tests are in mining.test.ts.
 */

// Mock AudioManager to avoid Tone.js ESM import in Jest
jest.mock("@/game/systems/AudioManager", () => ({
  audioManager: { playSound: jest.fn() },
  startAudio: jest.fn().mockResolvedValue(undefined),
}));

// Mock haptics — no hardware access in unit tests
jest.mock("@/game/systems/haptics", () => ({
  triggerActionHaptic: jest.fn().mockResolvedValue(undefined),
}));

// Mock game actions — wiring tests verify routing, not tree/rock mutations
jest.mock("@/game/actions", () => ({
  harvestTree: jest.fn(() => [{ type: "timber", amount: 2 }]),
  waterTree: jest.fn(() => true),
  pruneTree: jest.fn(() => true),
  plantTree: jest.fn(() => true),
  clearRock: jest.fn(() => true),
}));

// Mock store for dispatchAction side-effects
jest.mock("@/game/stores", () => ({
  useGameStore: {
    getState: () => ({
      stamina: 100,
      worldSeed: "test-seed",
      currentZoneId: "starting-grove",
      setActiveCraftingStation: jest.fn(),
      setStamina: jest.fn(),
      addResource: jest.fn(),
      incrementToolUse: jest.fn(),
      advanceTutorial: jest.fn(),
    }),
  },
}));

import { resolveAction } from "@/game/actions/actionDispatcher";
import { RESOURCE_TYPES } from "@/game/config/resources";
import {
  computeMiningStaminaCost,
  isPickTool,
  mineRock,
  resolveMiningInteraction,
} from "@/game/systems/mining";

describe("Mining wiring (Spec §45)", () => {
  it("resolveAction maps pick + rock -> MINE", () => {
    expect(resolveAction("pick", "rock")).toBe("MINE");
  });

  it("resolveAction maps shovel + rock -> DIG (different from MINE)", () => {
    expect(resolveAction("shovel", "rock")).toBe("DIG");
  });

  it("isPickTool identifies MINE action", () => {
    expect(isPickTool("MINE")).toBe(true);
    expect(isPickTool("CHOP")).toBe(false);
  });

  it("resolveMiningInteraction returns isRock for rock entities", () => {
    const entity = { rock: { rockType: "granite", variant: 0, modelPath: "" } };
    const result = resolveMiningInteraction(entity);
    expect(result.isRock).toBe(true);
    expect(result.rockType).toBe("granite");
    expect(result.staminaCost).toBe(16);
  });

  it("resolveMiningInteraction returns !isRock for non-rock entities", () => {
    const entity = { tree: { speciesId: "white-oak" } };
    const result = resolveMiningInteraction(entity);
    expect(result.isRock).toBe(false);
  });

  it("mineRock produces correct ore type for rocky-highlands", () => {
    const rock = { rockType: "default", variant: 0, modelPath: "" };
    const result = mineRock(rock, "rocky-highlands", 0.5);
    expect(result.oreType).toBe("ore");
    expect(result.amount).toBeGreaterThanOrEqual(1);
  });

  it("mineRock produces stone for starting-grove", () => {
    const rock = { rockType: "default", variant: 0, modelPath: "" };
    const result = mineRock(rock, "starting-grove", 0.5);
    expect(result.oreType).toBe("stone");
  });

  it("ResourceType includes ore and stone for mined resources", () => {
    expect(RESOURCE_TYPES).toContain("ore");
    expect(RESOURCE_TYPES).toContain("stone");
  });

  it("ResourceType includes fish for fishing rewards", () => {
    expect(RESOURCE_TYPES).toContain("fish");
  });

  it("pick tool exists in tools.json with MINE action", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tools = require("@/config/game/tools.json") as Array<{
      id: string;
      action: string;
      staminaCost: number;
    }>;
    const pick = tools.find((t) => t.id === "pick");
    expect(pick).toBeDefined();
    expect(pick?.action).toBe("MINE");
    expect(pick?.staminaCost).toBe(10);
  });

  it("stamina cost scales with rock hardness", () => {
    expect(computeMiningStaminaCost("default")).toBe(8);
    expect(computeMiningStaminaCost("granite")).toBe(16);
    expect(computeMiningStaminaCost("obsidian")).toBe(32);
  });
});
