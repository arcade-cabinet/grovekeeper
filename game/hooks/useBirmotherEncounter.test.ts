/**
 * Tests for useBirmotherEncounter -- Birchmother encounter logic (Spec §32.4).
 *
 * Pure helper functions are tested directly:
 *   - computeDistanceXZ
 *   - shouldTriggerBirchmother
 *   - isSpiritQuestComplete
 *
 * useBirmotherEncounter requires an R3F Canvas context (useFrame) and is
 * smoke-tested only (same pattern as useSpiritProximity.test.ts).
 */

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("@/game/ecs/world", () => ({
  birmotherQuery: { entities: [] },
  playerQuery: { first: null },
  world: { add: jest.fn(), addComponent: jest.fn() },
  generateEntityId: jest.fn().mockReturnValue("entity_test_1"),
}));

jest.mock("@/game/stores/gameStore", () => ({
  useGameStore: {
    getState: jest.fn().mockReturnValue({
      worldSeed: "test-seed",
      questChainState: { completedChainIds: [] },
      advanceQuestObjective: jest.fn(),
    }),
  },
}));

jest.mock("@/game/quests/mainQuestSystem", () => ({
  isMainQuestComplete: jest.fn().mockReturnValue(false),
}));

jest.mock("@/game/world/WorldGenerator", () => ({
  computeBirmotherSpawn: jest.fn().mockReturnValue({ x: 200, z: 0 }),
}));

jest.mock("@/game/ui/Toast", () => ({
  showToast: jest.fn(),
}));

import {
  computeDistanceXZ,
  shouldTriggerBirchmother,
  isSpiritQuestComplete,
  useBirmotherEncounter,
  BIRCHMOTHER_TRIGGER_RADIUS,
  BIRCHMOTHER_COOLDOWN_MS,
  type BirmotherSnapshot,
  type PlayerPositionXZ,
} from "./useBirmotherEncounter";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makePlayer(x: number, z: number): PlayerPositionXZ {
  return { x, z };
}

function makeBirchmother(
  x: number,
  z: number,
  awakened: boolean,
  converged = false,
): BirmotherSnapshot {
  return { x, z, awakened, converged };
}

// ---------------------------------------------------------------------------
// computeDistanceXZ
// ---------------------------------------------------------------------------

describe("computeDistanceXZ (Spec §32.4)", () => {
  it("returns 0 for identical points", () => {
    expect(computeDistanceXZ(5, 5, 5, 5)).toBe(0);
  });

  it("returns correct distance along X axis", () => {
    expect(computeDistanceXZ(0, 0, 3, 0)).toBeCloseTo(3);
  });

  it("returns correct distance along Z axis", () => {
    expect(computeDistanceXZ(0, 0, 0, 4)).toBeCloseTo(4);
  });

  it("returns correct diagonal distance (3-4-5 triangle)", () => {
    expect(computeDistanceXZ(0, 0, 3, 4)).toBeCloseTo(5);
  });

  it("is symmetric -- order of arguments does not matter", () => {
    const ab = computeDistanceXZ(1, 2, 5, 6);
    const ba = computeDistanceXZ(5, 6, 1, 2);
    expect(ab).toBeCloseTo(ba);
  });

  it("handles negative coordinates", () => {
    expect(computeDistanceXZ(-3, 0, 3, 0)).toBeCloseTo(6);
  });

  it("does NOT use Y axis -- only XZ distance", () => {
    // Points at same XZ, different Y would be 0 in this function
    // (Y is ignored by design — function only takes x,z params)
    expect(computeDistanceXZ(0, 0, 0, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// shouldTriggerBirchmother
// ---------------------------------------------------------------------------

describe("shouldTriggerBirchmother (Spec §32.4)", () => {
  const RADIUS = BIRCHMOTHER_TRIGGER_RADIUS; // 3.0m
  const COOLDOWN = BIRCHMOTHER_COOLDOWN_MS;  // 10_000ms
  const NOW = 2_000_000;

  it("triggers when awakened, not converged, within radius, no cooldown", () => {
    const player = makePlayer(0, 0);
    const birchmother = makeBirchmother(2.0, 0, true, false);

    const result = shouldTriggerBirchmother(
      player,
      birchmother,
      0,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toBe(true);
  });

  it("does NOT trigger when not awakened", () => {
    const player = makePlayer(0, 0);
    const birchmother = makeBirchmother(2.0, 0, false, false);

    const result = shouldTriggerBirchmother(
      player,
      birchmother,
      0,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toBe(false);
  });

  it("does NOT trigger when already converged", () => {
    const player = makePlayer(0, 0);
    const birchmother = makeBirchmother(2.0, 0, true, true);

    const result = shouldTriggerBirchmother(
      player,
      birchmother,
      0,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toBe(false);
  });

  it("does NOT trigger when player is outside radius (3.1m)", () => {
    const player = makePlayer(0, 0);
    const birchmother = makeBirchmother(3.1, 0, true, false);

    const result = shouldTriggerBirchmother(
      player,
      birchmother,
      0,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toBe(false);
  });

  it("does NOT trigger at exactly 3.0m (boundary exclusive)", () => {
    const player = makePlayer(0, 0);
    const birchmother = makeBirchmother(3.0, 0, true, false);

    const result = shouldTriggerBirchmother(
      player,
      birchmother,
      0,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toBe(false);
  });

  it("does NOT trigger when within cooldown window (5s ago, 10s cooldown)", () => {
    const player = makePlayer(0, 0);
    const birchmother = makeBirchmother(1.0, 0, true, false);
    const lastTrigger = NOW - 5_000; // 5 seconds ago, still in 10s cooldown

    const result = shouldTriggerBirchmother(
      player,
      birchmother,
      lastTrigger,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toBe(false);
  });

  it("triggers once cooldown expires (11s ago)", () => {
    const player = makePlayer(0, 0);
    const birchmother = makeBirchmother(1.0, 0, true, false);
    const lastTrigger = NOW - 11_000; // 11 seconds ago, cooldown expired

    const result = shouldTriggerBirchmother(
      player,
      birchmother,
      lastTrigger,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toBe(true);
  });

  it("triggers at distance just under radius (2.9m)", () => {
    const player = makePlayer(0, 0);
    const birchmother = makeBirchmother(2.9, 0, true, false);

    const result = shouldTriggerBirchmother(
      player,
      birchmother,
      0,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isSpiritQuestComplete
// ---------------------------------------------------------------------------

describe("isSpiritQuestComplete (Spec §32.4)", () => {
  it("returns false when completedChainIds is empty", () => {
    expect(isSpiritQuestComplete([])).toBe(false);
  });

  it("returns false when other quests are complete but not main-quest-spirits", () => {
    expect(isSpiritQuestComplete(["some-other-quest", "worldroots-dream"])).toBe(false);
  });

  it("returns true when main-quest-spirits is in completedChainIds", () => {
    expect(isSpiritQuestComplete(["main-quest-spirits"])).toBe(true);
  });

  it("returns true when main-quest-spirits is among multiple completed chains", () => {
    expect(
      isSpiritQuestComplete([
        "worldtree-restoration",
        "main-quest-spirits",
        "worldroots-dream",
      ]),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("BIRCHMOTHER_TRIGGER_RADIUS (Spec §32.4)", () => {
  it("is 3.0 meters", () => {
    expect(BIRCHMOTHER_TRIGGER_RADIUS).toBe(3.0);
  });
});

describe("BIRCHMOTHER_COOLDOWN_MS (Spec §32.4)", () => {
  it("is 10000 ms (10 seconds)", () => {
    expect(BIRCHMOTHER_COOLDOWN_MS).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// useBirmotherEncounter smoke test
// ---------------------------------------------------------------------------

describe("useBirmotherEncounter (Spec §32.4)", () => {
  it("exports useBirmotherEncounter as a function", () => {
    expect(typeof useBirmotherEncounter).toBe("function");
  });
});
