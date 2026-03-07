/**
 * Tests for useSpiritProximity -- spirit proximity detection (Spec §32.3).
 *
 * Pure helper functions (computeDistance3D, checkSpiritProximity) are tested
 * directly. useSpiritProximity requires an R3F Canvas context and is
 * smoke-tested only (same pattern as useRaycast.test.ts).
 */

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("@/game/ecs/world", () => ({
  grovekeeperSpiritsQuery: [],
  playerQuery: { first: null },
  world: { addComponent: jest.fn() },
}));

jest.mock("@/game/stores/gameStore", () => ({
  useGameStore: {
    getState: jest.fn().mockReturnValue({
      discoverSpirit: jest.fn().mockReturnValue(true),
    }),
  },
}));

jest.mock("@/game/ui/Toast", () => ({
  showToast: jest.fn(),
}));

import {
  checkSpiritProximity,
  computeDistance3D,
  SPIRIT_COOLDOWN_MS,
  SPIRIT_DETECTION_RADIUS,
  useSpiritProximity,
  type PlayerSnapshot,
  type SpiritSnapshot,
} from "./useSpiritProximity";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeSpirit(
  spiritId: string,
  x: number,
  y: number,
  z: number,
  discovered = false,
): SpiritSnapshot {
  return { spiritId, discovered, dialogueTreeId: `tree-${spiritId}`, x, y, z };
}

function makePlayer(x: number, y: number, z: number): PlayerSnapshot {
  return { x, y, z };
}

// ---------------------------------------------------------------------------
// computeDistance3D
// ---------------------------------------------------------------------------

describe("computeDistance3D (Spec §32.3)", () => {
  it("returns 0 for identical points", () => {
    expect(computeDistance3D(1, 2, 3, 1, 2, 3)).toBe(0);
  });

  it("returns 1 for points 1 unit apart on X axis", () => {
    expect(computeDistance3D(0, 0, 0, 1, 0, 0)).toBeCloseTo(1);
  });

  it("returns sqrt(3) for unit offset on all axes", () => {
    expect(computeDistance3D(0, 0, 0, 1, 1, 1)).toBeCloseTo(Math.sqrt(3));
  });

  it("is symmetric -- order of points does not matter", () => {
    const ab = computeDistance3D(1, 2, 3, 4, 5, 6);
    const ba = computeDistance3D(4, 5, 6, 1, 2, 3);
    expect(ab).toBeCloseTo(ba);
  });

  it("handles negative coordinates", () => {
    expect(computeDistance3D(-1, 0, 0, 1, 0, 0)).toBeCloseTo(2);
  });

  it("accounts for Y distance (3D, not XZ-only)", () => {
    // Spirit 10 units above player on Y axis only
    const d = computeDistance3D(0, 0, 0, 0, 10, 0);
    expect(d).toBeCloseTo(10);
  });
});

// ---------------------------------------------------------------------------
// checkSpiritProximity
// ---------------------------------------------------------------------------

describe("checkSpiritProximity (Spec §32.3)", () => {
  const NOW = 1_000_000;
  const RADIUS = SPIRIT_DETECTION_RADIUS; // 2.0m
  const COOLDOWN = SPIRIT_COOLDOWN_MS;    // 5000ms

  it("triggers spirit at distance < 2.0m from player (1.9m)", () => {
    const player = makePlayer(0, 0, 0);
    const spirit = makeSpirit("spirit-0", 1.9, 0, 0);
    const cooldowns = new Map<string, number>();

    const result = checkSpiritProximity(
      player,
      [spirit],
      cooldowns,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toContain("spirit-0");
  });

  it("does NOT trigger spirit at distance >= 2.0m from player (2.1m)", () => {
    const player = makePlayer(0, 0, 0);
    const spirit = makeSpirit("spirit-0", 2.1, 0, 0);
    const cooldowns = new Map<string, number>();

    const result = checkSpiritProximity(
      player,
      [spirit],
      cooldowns,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).not.toContain("spirit-0");
  });

  it("does NOT trigger at exactly 2.0m (boundary is exclusive)", () => {
    const player = makePlayer(0, 0, 0);
    const spirit = makeSpirit("spirit-0", 2.0, 0, 0);
    const cooldowns = new Map<string, number>();

    const result = checkSpiritProximity(
      player,
      [spirit],
      cooldowns,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).not.toContain("spirit-0");
  });

  it("does NOT trigger for already-discovered spirits within radius", () => {
    const player = makePlayer(0, 0, 0);
    // discovered = true
    const spirit = makeSpirit("spirit-1", 0.5, 0, 0, true);
    const cooldowns = new Map<string, number>();

    const result = checkSpiritProximity(
      player,
      [spirit],
      cooldowns,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toHaveLength(0);
  });

  it("cooldown prevents double-trigger within 5 seconds", () => {
    const player = makePlayer(0, 0, 0);
    const spirit = makeSpirit("spirit-2", 0.5, 0, 0);
    // Last trigger was 3s ago — still within 5s cooldown
    const cooldowns = new Map<string, number>([["spirit-2", NOW - 3000]]);

    const result = checkSpiritProximity(
      player,
      [spirit],
      cooldowns,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toHaveLength(0);
  });

  it("allows re-trigger once cooldown expires (after 5s)", () => {
    const player = makePlayer(0, 0, 0);
    const spirit = makeSpirit("spirit-2", 0.5, 0, 0);
    // Last trigger was 6s ago — cooldown expired
    const cooldowns = new Map<string, number>([["spirit-2", NOW - 6000]]);

    const result = checkSpiritProximity(
      player,
      [spirit],
      cooldowns,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toContain("spirit-2");
  });

  it("returns empty array when no spirits are present", () => {
    const player = makePlayer(0, 0, 0);
    const cooldowns = new Map<string, number>();

    const result = checkSpiritProximity(
      player,
      [],
      cooldowns,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toHaveLength(0);
  });

  it("triggers only in-range spirits when multiple spirits exist", () => {
    const player = makePlayer(0, 0, 0);
    const near = makeSpirit("spirit-near", 1.0, 0, 0);
    const far = makeSpirit("spirit-far", 10.0, 0, 0);
    const cooldowns = new Map<string, number>();

    const result = checkSpiritProximity(
      player,
      [near, far],
      cooldowns,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toContain("spirit-near");
    expect(result).not.toContain("spirit-far");
  });

  it("can trigger multiple spirits if both are within range", () => {
    const player = makePlayer(0, 0, 0);
    const s1 = makeSpirit("spirit-a", 0.5, 0, 0);
    const s2 = makeSpirit("spirit-b", 0, 0, 0.5);
    const cooldowns = new Map<string, number>();

    const result = checkSpiritProximity(
      player,
      [s1, s2],
      cooldowns,
      NOW,
      RADIUS,
      COOLDOWN,
    );

    expect(result).toContain("spirit-a");
    expect(result).toContain("spirit-b");
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("SPIRIT_DETECTION_RADIUS (Spec §32.3)", () => {
  it("is 2.0 meters", () => {
    expect(SPIRIT_DETECTION_RADIUS).toBe(2.0);
  });
});

describe("SPIRIT_COOLDOWN_MS (Spec §32.3)", () => {
  it("is 5000 ms (5 seconds)", () => {
    expect(SPIRIT_COOLDOWN_MS).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// useSpiritProximity smoke test
// ---------------------------------------------------------------------------

describe("useSpiritProximity (Spec §32.3)", () => {
  it("exports useSpiritProximity as a function", () => {
    expect(typeof useSpiritProximity).toBe("function");
  });
});
