/**
 * Tests for HUD — FPS HUD overlay compass pure functions (Spec §24).
 *
 * Tests resolveCompassBearing and findNearestUndiscoveredSpirit directly.
 * The HUD component itself is smoke-tested (requires RN rendering context).
 */

// ── Mocks (must precede all imports) ─────────────────────────────────────────

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("lucide-react-native", () => ({
  MenuIcon: "MenuIcon",
  AxeIcon: "AxeIcon",
  BookOpenIcon: "BookOpenIcon",
  DropletsIcon: "DropletsIcon",
  DropletIcon: "DropletIcon",
  AppleIcon: "AppleIcon",
  NutIcon: "NutIcon",
  RecycleIcon: "RecycleIcon",
  ScissorsIcon: "ScissorsIcon",
  ShovelIcon: "ShovelIcon",
  SproutIcon: "SproutIcon",
  TreesIcon: "TreesIcon",
  WrenchIcon: "WrenchIcon",
}));

jest.mock("@/components/ui/icon", () => ({
  Icon: jest.fn().mockReturnValue(null),
}));

jest.mock("@/components/player/TargetInfo", () => ({
  TargetInfo: jest.fn().mockReturnValue(null),
}));

jest.mock("@/game/stores/gameStore", () => ({
  useGameStore: jest.fn().mockReturnValue({}),
  totalXpForLevel: jest.fn().mockReturnValue(0),
  xpToNext: jest.fn().mockReturnValue(100),
}));

jest.mock("@/game/systems/time", () => ({
  computeTimeState: jest.fn().mockReturnValue({
    hour: 8,
    dayProgress: 0.333,
    dayNumber: 1,
    season: "spring",
  }),
}));

jest.mock("./ResourceBar", () => ({ ResourceBar: () => null }));
jest.mock("./XPBar", () => ({ XPBar: () => null }));
jest.mock("./StaminaGauge", () => ({ StaminaGauge: () => null }));
jest.mock("./ToolBelt", () => ({ ToolBelt: () => null }));
jest.mock("./TimeDisplay", () => ({ TimeDisplayCompact: () => null }));

// ── Imports ───────────────────────────────────────────────────────────────────

import {
  findNearestUndiscoveredSpirit,
  HUD,
  resolveCompassBearing,
} from "./HUD";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSpirit(x: number, z: number, discovered: boolean) {
  return {
    position: { x, z },
    grovekeeperSpirit: { discovered },
  };
}

// ── resolveCompassBearing ────────────────────────────────────────────────────

describe("resolveCompassBearing (Spec §24)", () => {
  it("returns 0° for a target directly north (−Z axis)", () => {
    expect(resolveCompassBearing(0, 0, 0, -10)).toBe(0);
  });

  it("returns 90° for a target directly east (+X axis)", () => {
    expect(resolveCompassBearing(0, 0, 10, 0)).toBe(90);
  });

  it("returns 180° for a target directly south (+Z axis)", () => {
    expect(resolveCompassBearing(0, 0, 0, 10)).toBe(180);
  });

  it("returns 270° for a target directly west (−X axis)", () => {
    expect(resolveCompassBearing(0, 0, -10, 0)).toBe(270);
  });

  it("handles offset player position", () => {
    // target is north of player when player is at (5, 5)
    expect(resolveCompassBearing(5, 5, 5, -5)).toBe(0);
  });

  it("returns a value in [0, 360) for any direction", () => {
    const bearing = resolveCompassBearing(0, 0, -3, 3);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });

  it("returns 315° for northwest (−X, −Z)", () => {
    const bearing = resolveCompassBearing(0, 0, -10, -10);
    expect(bearing).toBeCloseTo(315, 0);
  });
});

// ── findNearestUndiscoveredSpirit ────────────────────────────────────────────

describe("findNearestUndiscoveredSpirit (Spec §24)", () => {
  it("returns null when the spirit list is empty", () => {
    expect(findNearestUndiscoveredSpirit([], 0, 0)).toBeNull();
  });

  it("returns null when all spirits are discovered", () => {
    const spirits = [makeSpirit(10, 0, true), makeSpirit(20, 0, true)];
    expect(findNearestUndiscoveredSpirit(spirits, 0, 0)).toBeNull();
  });

  it("returns the position of the only undiscovered spirit", () => {
    const spirits = [makeSpirit(10, 20, false)];
    expect(findNearestUndiscoveredSpirit(spirits, 0, 0)).toEqual({ x: 10, z: 20 });
  });

  it("skips discovered spirits regardless of proximity", () => {
    const spirits = [
      makeSpirit(1, 0, true),   // discovered and closest — must be ignored
      makeSpirit(50, 0, false),  // undiscovered — expected result
    ];
    expect(findNearestUndiscoveredSpirit(spirits, 0, 0)).toEqual({ x: 50, z: 0 });
  });

  it("returns the nearest when multiple undiscovered spirits exist", () => {
    const spirits = [
      makeSpirit(30, 0, false),
      makeSpirit(10, 0, false), // closest
      makeSpirit(50, 0, false),
    ];
    expect(findNearestUndiscoveredSpirit(spirits, 0, 0)).toEqual({ x: 10, z: 0 });
  });

  it("accounts for player offset when computing distance", () => {
    const spirits = [
      makeSpirit(15, 0, false), // dist from (10, 0) = 5
      makeSpirit(25, 0, false), // dist from (10, 0) = 15
    ];
    // Player at (10, 0) → spirit at x=15 is nearest (dist=5)
    expect(findNearestUndiscoveredSpirit(spirits, 10, 0)).toEqual({ x: 15, z: 0 });
  });
});

// ── HUD component smoke test ──────────────────────────────────────────────────

describe("HUD (Spec §24)", () => {
  it("exports HUD as a function", () => {
    expect(typeof HUD).toBe("function");
  });
});
