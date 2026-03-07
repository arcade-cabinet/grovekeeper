/**
 * Tests for WaterBodies R3F component (Spec §31.2).
 *
 * Tests exported constants and buildWaterPlaneGeometry without
 * WebGL/R3F context. The imperative useFrame rendering pattern is tested
 * via exported pure functions.
 */

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("three", () => {
  const PlaneGeometry = jest.fn().mockImplementation(
    (width: number, height: number, wSeg: number, hSeg: number) => ({
      width,
      height,
      wSeg,
      hSeg,
      dispose: jest.fn(),
    }),
  );

  const Mesh = jest.fn().mockImplementation(() => ({
    position: { set: jest.fn() },
    rotation: { x: 0 },
    geometry: { dispose: jest.fn() },
    material: { dispose: jest.fn() },
  }));

  const Group = jest.fn();
  const ShaderMaterial = jest.fn();

  return { PlaneGeometry, Mesh, Group, ShaderMaterial };
});

jest.mock("@/game/ecs/world", () => ({
  waterBodiesQuery: { entities: [] },
}));

jest.mock("@/game/shaders/gerstnerWater", () => ({
  createGerstnerMaterial: jest.fn().mockReturnValue({ uniforms: { uTime: { value: 0 } } }),
  updateGerstnerTime: jest.fn(),
  createCausticsMaterial: jest.fn().mockReturnValue({ uniforms: { uTime: { value: 0 } } }),
  updateCausticsTime: jest.fn(),
}));

import * as THREE from "three";
import {
  buildWaterPlaneGeometry,
  WATER_PLANE_SEGMENTS,
  CAUSTICS_DEPTH_OFFSET,
  WaterBodies,
} from "./WaterBody";
import type { WaterBodyComponent } from "@/game/ecs/components/procedural/water";

const MockPlaneGeometry = THREE.PlaneGeometry as unknown as jest.Mock;

// ─── WATER_PLANE_SEGMENTS constant ───────────────────────────────────────────

describe("WATER_PLANE_SEGMENTS (Spec §31.2)", () => {
  it("is a positive integer", () => {
    expect(typeof WATER_PLANE_SEGMENTS).toBe("number");
    expect(WATER_PLANE_SEGMENTS).toBeGreaterThan(0);
    expect(Number.isInteger(WATER_PLANE_SEGMENTS)).toBe(true);
  });

  it("is at least 8 for smooth wave deformation", () => {
    expect(WATER_PLANE_SEGMENTS).toBeGreaterThanOrEqual(8);
  });
});

// ─── buildWaterPlaneGeometry ──────────────────────────────────────────────────

describe("buildWaterPlaneGeometry (Spec §31.2)", () => {
  const makeSize = (width: number, depth: number): WaterBodyComponent["size"] => ({
    width,
    depth,
  });

  beforeEach(() => {
    MockPlaneGeometry.mockClear();
  });

  it("returns a PlaneGeometry instance", () => {
    const result = buildWaterPlaneGeometry(makeSize(10, 10));
    expect(THREE.PlaneGeometry).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("passes width from size.width to PlaneGeometry constructor", () => {
    buildWaterPlaneGeometry(makeSize(20, 10));
    const [width] = MockPlaneGeometry.mock.calls[0] as [number, number, number, number];
    expect(width).toBe(20);
  });

  it("passes depth from size.depth as height to PlaneGeometry constructor", () => {
    buildWaterPlaneGeometry(makeSize(10, 30));
    const [, height] = MockPlaneGeometry.mock.calls[0] as [number, number, number, number];
    expect(height).toBe(30);
  });

  it("uses WATER_PLANE_SEGMENTS for both width and height segments", () => {
    buildWaterPlaneGeometry(makeSize(10, 10));
    const [, , wSeg, hSeg] = MockPlaneGeometry.mock.calls[0] as [number, number, number, number];
    expect(wSeg).toBe(WATER_PLANE_SEGMENTS);
    expect(hSeg).toBe(WATER_PLANE_SEGMENTS);
  });

  it("different sizes produce different PlaneGeometry constructor arguments", () => {
    buildWaterPlaneGeometry(makeSize(10, 5));
    buildWaterPlaneGeometry(makeSize(40, 20));
    const calls = MockPlaneGeometry.mock.calls as [number, number, number, number][];
    expect(calls[0][0]).toBe(10);
    expect(calls[0][1]).toBe(5);
    expect(calls[1][0]).toBe(40);
    expect(calls[1][1]).toBe(20);
  });

  it("pond size (small): width=8, depth=8", () => {
    buildWaterPlaneGeometry(makeSize(8, 8));
    const [width, height] = MockPlaneGeometry.mock.calls[0] as [number, number];
    expect(width).toBe(8);
    expect(height).toBe(8);
  });

  it("ocean size (large): width=512, depth=512", () => {
    buildWaterPlaneGeometry(makeSize(512, 512));
    const [width, height] = MockPlaneGeometry.mock.calls[0] as [number, number];
    expect(width).toBe(512);
    expect(height).toBe(512);
  });

  it("rectangular water body: different width and depth", () => {
    buildWaterPlaneGeometry(makeSize(64, 16));
    const [width, height] = MockPlaneGeometry.mock.calls[0] as [number, number];
    expect(width).toBe(64);
    expect(height).toBe(16);
  });
});

// ─── CAUSTICS_DEPTH_OFFSET constant ──────────────────────────────────────────

describe("CAUSTICS_DEPTH_OFFSET (Spec §31.2)", () => {
  it("is a positive number", () => {
    expect(typeof CAUSTICS_DEPTH_OFFSET).toBe("number");
    expect(CAUSTICS_DEPTH_OFFSET).toBeGreaterThan(0);
  });

  it("is small enough to avoid visible gaps (< 0.5 world units)", () => {
    expect(CAUSTICS_DEPTH_OFFSET).toBeLessThan(0.5);
  });
});

// ─── WaterBodies component ────────────────────────────────────────────────────

describe("WaterBodies (Spec §31.2)", () => {
  it("exports WaterBodies as a named function component", () => {
    expect(typeof WaterBodies).toBe("function");
  });

  it("has a displayable component name", () => {
    expect(WaterBodies.name).toBe("WaterBodies");
  });
});
