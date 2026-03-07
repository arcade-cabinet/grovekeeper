/**
 * Tests for HedgeMaze — hedge GLB path resolution and rotation conversion (Spec §18).
 *
 * Tests exported pure functions without WebGL/R3F context.
 * Component export is verified separately.
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: { clone: jest.fn().mockReturnValue({}), traverse: jest.fn() },
  }),
}));

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("@/game/ecs/world", () => ({
  hedgesQuery: { entities: [] },
  hedgeDecorationsQuery: { entities: [] },
}));

jest.mock("./StaticInstances", () => ({
  StaticModelInstances: jest.fn(() => null),
  groupByModelPath: jest.fn(() => new Map()),
}));

import type { HedgeComponent, HedgeDecorationComponent } from "@/game/ecs/components/terrain";
import {
  HedgeMaze,
  hedgeRotationToRadians,
  resolveDecorationGLBPath,
  resolveHedgeGLBPath,
} from "./HedgeMaze.tsx";

// ---------------------------------------------------------------------------
// resolveHedgeGLBPath
// ---------------------------------------------------------------------------

describe("resolveHedgeGLBPath (Spec §18)", () => {
  it("returns the modelPath for a basic straight hedge piece", () => {
    const hedge: HedgeComponent = {
      pieceType: "basic",
      sizeClass: "2x1",
      junction: "",
      rotation: 0,
      modelPath: "hedges/basic/basic_2x1.glb",
    };
    expect(resolveHedgeGLBPath(hedge)).toBe("hedges/basic/basic_2x1.glb");
  });

  it("returns the modelPath for a rotated hedge piece", () => {
    const hedge: HedgeComponent = {
      pieceType: "basic",
      sizeClass: "1x1",
      junction: "",
      rotation: 90,
      modelPath: "hedges/basic/basic_1x1.glb",
    };
    expect(resolveHedgeGLBPath(hedge)).toBe("hedges/basic/basic_1x1.glb");
  });

  it("returns the modelPath for a large hedge piece", () => {
    const hedge: HedgeComponent = {
      pieceType: "basic",
      sizeClass: "5x2",
      junction: "",
      rotation: 0,
      modelPath: "hedges/basic/basic_5x2.glb",
    };
    expect(resolveHedgeGLBPath(hedge)).toBe("hedges/basic/basic_5x2.glb");
  });

  it("throws when modelPath is an empty string", () => {
    const hedge: HedgeComponent = {
      pieceType: "basic",
      sizeClass: "1x1",
      junction: "",
      rotation: 0,
      modelPath: "",
    };
    expect(() => resolveHedgeGLBPath(hedge)).toThrow("[HedgeMaze]");
  });

  it("throw message includes pieceType for diagnostics", () => {
    const hedge: HedgeComponent = {
      pieceType: "diagonal",
      sizeClass: "1x1",
      junction: "",
      rotation: 0,
      modelPath: "",
    };
    expect(() => resolveHedgeGLBPath(hedge)).toThrow('pieceType="diagonal"');
  });
});

// ---------------------------------------------------------------------------
// resolveDecorationGLBPath
// ---------------------------------------------------------------------------

describe("resolveDecorationGLBPath (Spec §18)", () => {
  it("returns the fountain modelPath", () => {
    const decoration: HedgeDecorationComponent = {
      category: "stone",
      itemId: "fountain01_round_water",
      modelPath: "hedges/misc/stone/fountain01_round_water.glb",
    };
    expect(resolveDecorationGLBPath(decoration)).toBe(
      "hedges/misc/stone/fountain01_round_water.glb",
    );
  });

  it("returns a bench modelPath", () => {
    const decoration: HedgeDecorationComponent = {
      category: "stone",
      itemId: "bench01",
      modelPath: "hedges/misc/stone/bench01.glb",
    };
    expect(resolveDecorationGLBPath(decoration)).toBe("hedges/misc/stone/bench01.glb");
  });

  it("returns a second bench variant modelPath", () => {
    const decoration: HedgeDecorationComponent = {
      category: "stone",
      itemId: "bench02",
      modelPath: "hedges/misc/stone/bench02.glb",
    };
    expect(resolveDecorationGLBPath(decoration)).toBe("hedges/misc/stone/bench02.glb");
  });

  it("returns a flower bed modelPath", () => {
    const decoration: HedgeDecorationComponent = {
      category: "flowers",
      itemId: "flowerbed1_1x2",
      modelPath: "hedges/misc/flowers/flowerbed1_1x2.glb",
    };
    expect(resolveDecorationGLBPath(decoration)).toBe("hedges/misc/flowers/flowerbed1_1x2.glb");
  });

  it("returns a column modelPath", () => {
    const decoration: HedgeDecorationComponent = {
      category: "stone",
      itemId: "column1",
      modelPath: "hedges/misc/stone/column1.glb",
    };
    expect(resolveDecorationGLBPath(decoration)).toBe("hedges/misc/stone/column1.glb");
  });

  it("throws when modelPath is an empty string", () => {
    const decoration: HedgeDecorationComponent = {
      category: "stone",
      itemId: "fountain01_round_water",
      modelPath: "",
    };
    expect(() => resolveDecorationGLBPath(decoration)).toThrow("[HedgeMaze]");
  });

  it("throw message includes itemId for diagnostics", () => {
    const decoration: HedgeDecorationComponent = {
      category: "fences",
      itemId: "mystery_item",
      modelPath: "",
    };
    expect(() => resolveDecorationGLBPath(decoration)).toThrow('itemId="mystery_item"');
  });
});

// ---------------------------------------------------------------------------
// hedgeRotationToRadians
// ---------------------------------------------------------------------------

describe("hedgeRotationToRadians (Spec §18)", () => {
  it("converts 0 degrees to 0 radians", () => {
    expect(hedgeRotationToRadians(0)).toBe(0);
  });

  it("converts 90 degrees to π/2", () => {
    expect(hedgeRotationToRadians(90)).toBeCloseTo(Math.PI / 2);
  });

  it("converts 180 degrees to π", () => {
    expect(hedgeRotationToRadians(180)).toBeCloseTo(Math.PI);
  });

  it("converts 270 degrees to 3π/2", () => {
    expect(hedgeRotationToRadians(270)).toBeCloseTo((3 * Math.PI) / 2);
  });

  it("converts 360 degrees to 2π (full rotation)", () => {
    expect(hedgeRotationToRadians(360)).toBeCloseTo(2 * Math.PI);
  });
});

// ---------------------------------------------------------------------------
// Component export
// ---------------------------------------------------------------------------

describe("HedgeMaze component (Spec §18)", () => {
  it("exports HedgeMaze as a named function component", () => {
    expect(typeof HedgeMaze).toBe("function");
  });

  it("has component name HedgeMaze", () => {
    expect(HedgeMaze.name).toBe("HedgeMaze");
  });
});
