/**
 * Tests for ToolViewModel first-person tool view model (Spec §11).
 *
 * Tests exported pure functions without rendering
 * (R3F / drei require WebGL context, mocked here).
 */

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
import { resolveToolGLBPath, resolveToolVisual, ToolViewModel } from "./ToolViewModel";

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
