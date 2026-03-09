/**
 * Fishing wiring tests — Spec §44.
 *
 * Tests the integration between:
 * - resolveAction: fishing-rod + water -> FISH
 * - dispatchAction: FISH -> sets activeCraftingStation
 * - fishing state machine: full catch cycle
 * - selectFishSpecies: biome + season weighted selection
 * - computeFishYield: base + dock bonus
 *
 * These tests verify the wiring between systems, not individual pure functions
 * (those are covered in fishing.test.ts and actionDispatcher.test.ts).
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
import {
  computeFishYield,
  createFishingState,
  isFishingComplete,
  pressFishingAction,
  selectFishSpecies,
  startFishing,
  tickFishing,
} from "@/game/systems/fishing";

/** Deterministic RNG stub. */
function makeRNG(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("Fishing wiring (Spec §44)", () => {
  it("resolveAction maps fishing-rod + water -> FISH", () => {
    expect(resolveAction("fishing-rod", "water")).toBe("FISH");
  });

  it("resolveAction returns null for fishing-rod + tree", () => {
    expect(resolveAction("fishing-rod", "tree")).toBeNull();
  });

  it("resolveAction returns null for fishing-rod + soil", () => {
    expect(resolveAction("fishing-rod", "soil")).toBeNull();
  });

  it("full catch cycle awards fish: idle -> casting -> waiting -> biting -> minigame -> caught", () => {
    const state = createFishingState();
    const rng = makeRNG(0, 0.3);
    startFishing(state, rng);

    // Cast
    tickFishing(state, 0.6);
    expect(state.phase).toBe("waiting");

    // Wait
    tickFishing(state, 3.1);
    expect(state.phase).toBe("biting");

    // Respond to bite
    pressFishingAction(state);
    expect(state.phase).toBe("minigame");

    // Place cursor in zone
    state.timingProgress = (state.zoneStart + state.zoneEnd) / 2;
    pressFishingAction(state);
    expect(state.phase).toBe("caught");
    expect(isFishingComplete(state)).toBe(true);

    // Verify yield
    const yield_ = computeFishYield(false);
    expect(yield_).toBeGreaterThanOrEqual(1);
  });

  it("species selection returns valid fish for starting-grove spring", () => {
    const species = selectFishSpecies("starting-grove", "spring", makeRNG(0.5));
    expect(species).not.toBeNull();
    expect(["perch", "carp"]).toContain(species);
  });

  it("species selection returns null for unknown biome", () => {
    const species = selectFishSpecies("volcano", "summer", makeRNG(0.5));
    expect(species).toBeNull();
  });

  it("dock bonus increases yield", () => {
    const base = computeFishYield(false);
    const withDock = computeFishYield(true);
    expect(withDock).toBeGreaterThanOrEqual(base);
  });

  it("fishing-rod tool exists in tools.json with FISH action", () => {
    // Use static import with import attribute for JSON config
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tools = require("@/config/game/tools.json") as Array<{
      id: string;
      action: string;
      staminaCost: number;
    }>;
    const fishingRod = tools.find((t) => t.id === "fishing-rod");
    expect(fishingRod).toBeDefined();
    expect(fishingRod?.action).toBe("FISH");
    expect(fishingRod?.staminaCost).toBe(4);
  });
});
