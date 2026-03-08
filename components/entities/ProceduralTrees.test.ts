/**
 * Tests for ProceduralTrees — stage-to-scale mapping and component exports.
 *
 * Tests pure helpers without WebGL/R3F context (Spec §42.1).
 * Each test references the spec section it validates.
 */

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("@/game/ecs/world", () => ({
  treesQuery: { entities: [] },
}));

jest.mock("@/game/utils/proceduralTextures", () => ({
  createTextureCanvas: jest.fn(() => ({
    getContext: jest.fn(() => null),
    width: 256,
    height: 256,
  })),
}));

jest.mock("three", () => {
  const actual = jest.requireActual("three");
  return {
    ...actual,
    CanvasTexture: jest.fn(() => ({
      wrapS: 0,
      wrapT: 0,
      minFilter: 0,
      magFilter: 0,
      dispose: jest.fn(),
    })),
  };
});

import proceduralMeshCfg from "@/config/game/proceduralMesh.json" with { type: "json" };
import { canopyScaleForStage, ProceduralTrees, trunkScaleForStage } from "./ProceduralTrees.tsx";

// ---------------------------------------------------------------------------
// Stage scale tables (Spec §42.1)
// ---------------------------------------------------------------------------

const EXPECTED_TRUNK_SCALES: Record<number, number> = {
  0: proceduralMeshCfg.trees.stageScales[0].trunk,
  1: proceduralMeshCfg.trees.stageScales[1].trunk,
  2: proceduralMeshCfg.trees.stageScales[2].trunk,
  3: proceduralMeshCfg.trees.stageScales[3].trunk,
  4: proceduralMeshCfg.trees.stageScales[4].trunk,
};

const EXPECTED_CANOPY_SCALES: Record<number, number> = {
  0: proceduralMeshCfg.trees.stageScales[0].canopy,
  1: proceduralMeshCfg.trees.stageScales[1].canopy,
  2: proceduralMeshCfg.trees.stageScales[2].canopy,
  3: proceduralMeshCfg.trees.stageScales[3].canopy,
  4: proceduralMeshCfg.trees.stageScales[4].canopy,
};

describe("trunkScaleForStage (Spec §42.1)", () => {
  it("stage 0 (Seed) returns the smallest trunk scale", () => {
    expect(trunkScaleForStage(0)).toBe(EXPECTED_TRUNK_SCALES[0]);
    expect(trunkScaleForStage(0)).toBeLessThan(trunkScaleForStage(1));
  });

  it("stage 1 (Sprout) trunk scale is smaller than stage 2", () => {
    expect(trunkScaleForStage(1)).toBeLessThan(trunkScaleForStage(2));
  });

  it("stage 2 (Sapling) trunk scale matches config value", () => {
    expect(trunkScaleForStage(2)).toBe(EXPECTED_TRUNK_SCALES[2]);
  });

  it("stage 3 (Mature) trunk scale is 1.0", () => {
    expect(trunkScaleForStage(3)).toBe(1.0);
  });

  it("stage 4 (Old Growth) trunk scale is the largest", () => {
    expect(trunkScaleForStage(4)).toBeGreaterThan(trunkScaleForStage(3));
    expect(trunkScaleForStage(4)).toBe(EXPECTED_TRUNK_SCALES[4]);
  });

  it("trunk scales increase monotonically from stage 0 to 4", () => {
    for (let stage = 0; stage < 4; stage++) {
      expect(trunkScaleForStage(stage)).toBeLessThan(trunkScaleForStage(stage + 1));
    }
  });

  it("returns 1.0 fallback for unknown stage index", () => {
    expect(trunkScaleForStage(99)).toBe(1.0);
  });
});

describe("canopyScaleForStage (Spec §42.1)", () => {
  it("stage 0 (Seed) returns the smallest canopy scale", () => {
    expect(canopyScaleForStage(0)).toBe(EXPECTED_CANOPY_SCALES[0]);
    expect(canopyScaleForStage(0)).toBeLessThan(canopyScaleForStage(1));
  });

  it("stage 1 (Sprout) canopy scale is smaller than stage 2", () => {
    expect(canopyScaleForStage(1)).toBeLessThan(canopyScaleForStage(2));
  });

  it("stage 2 (Sapling) canopy scale matches config value", () => {
    expect(canopyScaleForStage(2)).toBe(EXPECTED_CANOPY_SCALES[2]);
  });

  it("stage 3 (Mature) canopy scale is 1.0", () => {
    expect(canopyScaleForStage(3)).toBe(1.0);
  });

  it("stage 4 (Old Growth) canopy scale is the largest", () => {
    expect(canopyScaleForStage(4)).toBeGreaterThan(canopyScaleForStage(3));
    expect(canopyScaleForStage(4)).toBe(EXPECTED_CANOPY_SCALES[4]);
  });

  it("canopy scales increase monotonically from stage 0 to 4", () => {
    for (let stage = 0; stage < 4; stage++) {
      expect(canopyScaleForStage(stage)).toBeLessThan(canopyScaleForStage(stage + 1));
    }
  });

  it("returns 1.0 fallback for unknown stage index", () => {
    expect(canopyScaleForStage(99)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Canopy vs trunk scale relationship (Spec §42.1)
// ---------------------------------------------------------------------------

describe("canopy vs trunk scale relationship (Spec §42.1)", () => {
  it("stage 0 canopy scale is smaller than trunk scale (seed stays low)", () => {
    expect(canopyScaleForStage(0)).toBeLessThan(trunkScaleForStage(0));
  });

  it("stage 4 canopy scale exceeds trunk scale (old growth spreads wide)", () => {
    expect(canopyScaleForStage(4)).toBeGreaterThan(trunkScaleForStage(4));
  });
});

// ---------------------------------------------------------------------------
// Config shape validation (Spec §42.1)
// ---------------------------------------------------------------------------

describe("proceduralMesh.json tree config shape (Spec §42.1)", () => {
  it("has stageScales entries for all 5 stages", () => {
    const stages = proceduralMeshCfg.trees.stageScales;
    expect(typeof stages[0].trunk).toBe("number");
    expect(typeof stages[0].canopy).toBe("number");
    expect(typeof stages[4].trunk).toBe("number");
    expect(typeof stages[4].canopy).toBe("number");
  });

  it("trunk geometry has required fields", () => {
    const { radiusTop, radiusBottom, baseHeight, segments } = proceduralMeshCfg.trees.trunk;
    expect(radiusTop).toBeGreaterThan(0);
    expect(radiusBottom).toBeGreaterThan(radiusTop);
    expect(baseHeight).toBeGreaterThan(0);
    expect(segments).toBeGreaterThanOrEqual(4);
  });

  it("canopy geometry has required fields", () => {
    const { baseRadius, detail } = proceduralMeshCfg.trees.canopy;
    expect(baseRadius).toBeGreaterThan(0);
    expect(detail).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Component export (Spec §42.1)
// ---------------------------------------------------------------------------

describe("ProceduralTrees component export (Spec §42.1)", () => {
  it("exports ProceduralTrees as a named function", () => {
    expect(typeof ProceduralTrees).toBe("function");
  });

  it("component name is ProceduralTrees", () => {
    expect(ProceduralTrees.name).toBe("ProceduralTrees");
  });
});
