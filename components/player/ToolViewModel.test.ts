/**
 * Tests for ToolViewModel first-person tool view model (Spec §11).
 *
 * Tests exported pure functions without rendering
 * (R3F / drei require WebGL context, mocked here).
 */

jest.mock("animejs", () => ({
  __esModule: true,
  default: jest.fn(() => ({ pause: jest.fn() })),
}));

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn(),
}));

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
  useThree: jest.fn(),
}));

jest.mock("three", () => ({
  Group: jest.fn().mockImplementation(() => ({ add: jest.fn(), remove: jest.fn() })),
}));

jest.mock("@/game/stores/gameStore", () => ({
  useGameStore: jest.fn(),
}));

import toolVisuals from "@/config/game/toolVisuals.json";
import {
  buildSwapDownParams,
  buildSwapUpParams,
  computeSwayOffset,
  computeWalkBob,
  resolveToolGLBPath,
  resolveToolVisual,
  ToolViewModel,
} from "./ToolViewModel";

type ToolVisualsConfig = typeof toolVisuals;

describe("resolveToolGLBPath (Spec §11)", () => {
  it("returns Hoe.glb path for trowel", () => {
    const path = resolveToolGLBPath("trowel", toolVisuals as ToolVisualsConfig);
    expect(path).toBe("assets/models/tools/Hoe.glb");
  });

  it("returns Axe.glb path for axe", () => {
    const path = resolveToolGLBPath("axe", toolVisuals as ToolVisualsConfig);
    expect(path).toBe("assets/models/tools/Axe.glb");
  });

  it("returns Hatchet.glb path for pruning-shears", () => {
    const path = resolveToolGLBPath("pruning-shears", toolVisuals as ToolVisualsConfig);
    expect(path).toBe("assets/models/tools/Hatchet.glb");
  });

  it("returns Shovel.glb path for shovel", () => {
    const path = resolveToolGLBPath("shovel", toolVisuals as ToolVisualsConfig);
    expect(path).toBe("assets/models/tools/Shovel.glb");
  });

  it("returns Pickaxe.glb path for pickaxe", () => {
    const path = resolveToolGLBPath("pickaxe", toolVisuals as ToolVisualsConfig);
    expect(path).toBe("assets/models/tools/Pickaxe.glb");
  });

  it("returns null for tools with no GLB model (watering-can)", () => {
    const path = resolveToolGLBPath("watering-can", toolVisuals as ToolVisualsConfig);
    expect(path).toBeNull();
  });

  it("returns null for unknown tool ids", () => {
    const path = resolveToolGLBPath("flame-thrower", toolVisuals as ToolVisualsConfig);
    expect(path).toBeNull();
  });

  it("returns null for empty string tool id", () => {
    const path = resolveToolGLBPath("", toolVisuals as ToolVisualsConfig);
    expect(path).toBeNull();
  });
});

describe("resolveToolVisual (Spec §11)", () => {
  it("returns full config entry for trowel including offset, scale, animation", () => {
    const visual = resolveToolVisual("trowel", toolVisuals as ToolVisualsConfig);
    expect(visual).not.toBeNull();
    expect(visual?.offset).toEqual([0.35, -0.3, -0.5]);
    expect(visual?.scale).toBe(0.4);
    expect(visual?.useAnimation).toBe("stab");
    expect(visual?.useDuration).toBe(0.4);
  });

  it("returns null for tools with no visual config", () => {
    const visual = resolveToolVisual("watering-can", toolVisuals as ToolVisualsConfig);
    expect(visual).toBeNull();
  });

  it("axe visual has chop animation with 0.5s duration", () => {
    const visual = resolveToolVisual("axe", toolVisuals as ToolVisualsConfig);
    expect(visual?.useAnimation).toBe("chop");
    expect(visual?.useDuration).toBe(0.5);
  });

  it("pruning-shears visual has snip animation with shorter duration than axe", () => {
    const shears = resolveToolVisual("pruning-shears", toolVisuals as ToolVisualsConfig);
    const axe = resolveToolVisual("axe", toolVisuals as ToolVisualsConfig);
    expect(shears?.useDuration).toBeLessThan(axe?.useDuration ?? Infinity);
  });

  it("all configured tools have a negative z offset (in front of camera)", () => {
    const toolIds = ["trowel", "axe", "pruning-shears", "shovel", "pickaxe"];
    for (const id of toolIds) {
      const visual = resolveToolVisual(id, toolVisuals as ToolVisualsConfig);
      expect(visual?.offset[2]).toBeLessThan(0);
    }
  });

  it("all configured tools have a positive x offset (lower-right hand side)", () => {
    const toolIds = ["trowel", "axe", "pruning-shears", "shovel", "pickaxe"];
    for (const id of toolIds) {
      const visual = resolveToolVisual(id, toolVisuals as ToolVisualsConfig);
      expect(visual?.offset[0]).toBeGreaterThan(0);
    }
  });
});

describe("ToolViewModel (Spec §11)", () => {
  it("exports ToolViewModel as a function component", () => {
    expect(typeof ToolViewModel).toBe("function");
  });
});

describe("computeWalkBob (Spec §11)", () => {
  it("returns zero when speed is zero (standing still)", () => {
    expect(computeWalkBob(1.0, 0.02, 8.0, 0)).toBe(0);
  });

  it("returns bobHeight * sin(bobTime * bobFrequency) at full speed", () => {
    // Choose bobTime so sin(bobTime * 8) = sin(π/2) = 1 → result = bobHeight
    const bobTime = Math.PI / 2 / 8.0;
    expect(computeWalkBob(bobTime, 0.02, 8.0, 1)).toBeCloseTo(0.02, 5);
  });

  it("scales proportionally with speed", () => {
    const full = computeWalkBob(1.0, 0.02, 8.0, 1);
    const half = computeWalkBob(1.0, 0.02, 8.0, 0.5);
    expect(half).toBeCloseTo(full * 0.5, 5);
  });

  it("scales proportionally with bobHeight", () => {
    const small = computeWalkBob(1.0, 0.01, 8.0, 1);
    const large = computeWalkBob(1.0, 0.02, 8.0, 1);
    expect(large).toBeCloseTo(small * 2, 5);
  });

  it("oscillates between positive and negative over a full cycle", () => {
    const tPeak = Math.PI / 2 / 8.0;
    const tTrough = (3 * Math.PI) / 2 / 8.0;
    expect(computeWalkBob(tPeak, 0.02, 8.0, 1)).toBeCloseTo(0.02, 5);
    expect(computeWalkBob(tTrough, 0.02, 8.0, 1)).toBeCloseTo(-0.02, 5);
  });

  it("returns zero at t=0 regardless of other params", () => {
    // sin(0) = 0
    expect(computeWalkBob(0, 0.05, 12.0, 1)).toBe(0);
  });
});

describe("buildSwapDownParams (Spec §11)", () => {
  it("sets targets to the provided ref object", () => {
    const ref = { y: 0 };
    const params = buildSwapDownParams(ref, 0.4, 150, jest.fn());
    expect(params.targets).toBe(ref);
  });

  it("animates y to negative lowerY", () => {
    const params = buildSwapDownParams({ y: 0 }, 0.4, 150, jest.fn());
    expect(params.y).toBe(-0.4);
  });

  it("uses the provided duration", () => {
    const params = buildSwapDownParams({ y: 0 }, 0.4, 200, jest.fn());
    expect(params.duration).toBe(200);
  });

  it("uses easeInQuad easing for a quick entry into the lower arc", () => {
    const params = buildSwapDownParams({ y: 0 }, 0.4, 150, jest.fn());
    expect(params.easing).toBe("easeInQuad");
  });

  it("wires onComplete callback into the complete field", () => {
    const onComplete = jest.fn();
    const params = buildSwapDownParams({ y: 0 }, 0.4, 150, onComplete);
    params.complete();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("different lowerY values produce proportionally different y targets", () => {
    const small = buildSwapDownParams({ y: 0 }, 0.2, 150, jest.fn());
    const large = buildSwapDownParams({ y: 0 }, 0.4, 150, jest.fn());
    expect(large.y).toBe(small.y * 2);
  });
});

describe("buildSwapUpParams (Spec §11)", () => {
  it("sets targets to the provided ref object", () => {
    const ref = { y: -0.4 };
    const params = buildSwapUpParams(ref, 150);
    expect(params.targets).toBe(ref);
  });

  it("animates y back to 0 (neutral position)", () => {
    const params = buildSwapUpParams({ y: -0.4 }, 150);
    expect(params.y).toBe(0);
  });

  it("uses the provided duration", () => {
    const params = buildSwapUpParams({ y: -0.4 }, 200);
    expect(params.duration).toBe(200);
  });

  it("uses easeOutQuad easing for a smooth deceleration into resting position", () => {
    const params = buildSwapUpParams({ y: -0.4 }, 150);
    expect(params.easing).toBe("easeOutQuad");
  });
});

describe("computeSwayOffset (Spec §11)", () => {
  it("lerps current sway toward velocity * swayAmount", () => {
    const velocity = { x: 1, z: 0 };
    const currentSway = { x: 0, y: 0 };
    const result = computeSwayOffset(velocity, currentSway, 0.1, 10, 0.016);
    expect(result.x).toBeGreaterThan(0);
    expect(result.x).toBeLessThanOrEqual(0.1);
  });

  it("with zero velocity, sway lerps back toward zero", () => {
    const velocity = { x: 0, z: 0 };
    const currentSway = { x: 0.05, y: 0.02 };
    const result = computeSwayOffset(velocity, currentSway, 0.1, 10, 0.016);
    expect(Math.abs(result.x)).toBeLessThan(0.05);
    expect(Math.abs(result.y)).toBeLessThan(0.02);
  });

  it("z velocity produces y sway offset", () => {
    const velocity = { x: 0, z: 1 };
    const currentSway = { x: 0, y: 0 };
    const result = computeSwayOffset(velocity, currentSway, 0.1, 10, 0.016);
    expect(result.y).not.toBe(0);
    expect(result.x).toBe(0);
  });

  it("higher lerpFactor converges faster than lower", () => {
    const velocity = { x: 1, z: 0 };
    const currentSway = { x: 0, y: 0 };
    const slow = computeSwayOffset(velocity, currentSway, 0.1, 2, 0.016);
    const fast = computeSwayOffset(velocity, currentSway, 0.1, 16, 0.016);
    expect(fast.x).toBeGreaterThan(slow.x);
  });

  it("result clamps to target when lerpFactor * deltaTime >= 1", () => {
    const velocity = { x: 1, z: 0 };
    const currentSway = { x: 0, y: 0 };
    // lerpFactor=100, dt=1.0 → t=min(1,100)=1 → result equals target exactly
    const result = computeSwayOffset(velocity, currentSway, 0.1, 100, 1.0);
    expect(result.x).toBeCloseTo(0.1, 5);
  });

  it("swayAmount scales the target offset proportionally", () => {
    const velocity = { x: 1, z: 0 };
    const currentSway = { x: 0, y: 0 };
    const small = computeSwayOffset(velocity, currentSway, 0.05, 100, 1.0);
    const large = computeSwayOffset(velocity, currentSway, 0.10, 100, 1.0);
    expect(large.x).toBeCloseTo(small.x * 2, 5);
  });
});
