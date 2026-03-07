/**
 * Tests for BushModel — seasonal GLB path mapping (Spec §6.3, §8).
 *
 * Tests the exported pure functions and constants without WebGL/R3F context.
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: { clone: jest.fn().mockReturnValue({}) },
  }),
}));

jest.mock("@react-three/fiber", () => ({}));

import {
  BushModel,
  buildModelKey,
  resolveBushGLBPath,
  VALID_BUSH_SHAPES,
  VALID_SEASONS,
} from "./BushModel.tsx";

// ---------------------------------------------------------------------------
// VALID_SEASONS — all 5 seasons (Spec §6.3)
// ---------------------------------------------------------------------------

describe("VALID_SEASONS (Spec §6.3)", () => {
  it("contains exactly 5 seasons", () => {
    expect(VALID_SEASONS).toHaveLength(5);
  });

  it("contains spring", () => {
    expect(VALID_SEASONS).toContain("spring");
  });

  it("contains summer", () => {
    expect(VALID_SEASONS).toContain("summer");
  });

  it("contains autumn", () => {
    expect(VALID_SEASONS).toContain("autumn");
  });

  it("contains winter", () => {
    expect(VALID_SEASONS).toContain("winter");
  });

  it("contains dead", () => {
    expect(VALID_SEASONS).toContain("dead");
  });
});

// ---------------------------------------------------------------------------
// VALID_BUSH_SHAPES — 52 shapes from vegetation.json (Spec §8)
// ---------------------------------------------------------------------------

describe("VALID_BUSH_SHAPES (Spec §8)", () => {
  it("contains at least 52 shapes", () => {
    expect(VALID_BUSH_SHAPES.length).toBeGreaterThanOrEqual(52);
  });

  it("contains bush_connector", () => {
    expect(VALID_BUSH_SHAPES).toContain("bush_connector");
  });

  it("contains bush_tall", () => {
    expect(VALID_BUSH_SHAPES).toContain("bush_tall");
  });

  it("contains bush_long", () => {
    expect(VALID_BUSH_SHAPES).toContain("bush_long");
  });

  it("contains bush_overgrown", () => {
    expect(VALID_BUSH_SHAPES).toContain("bush_overgrown");
  });

  it("contains bush_tall_single", () => {
    expect(VALID_BUSH_SHAPES).toContain("bush_tall_single");
  });

  it("contains bush_long_round_corner", () => {
    expect(VALID_BUSH_SHAPES).toContain("bush_long_round_corner");
  });

  it("all shapes start with 'bush_'", () => {
    for (const shape of VALID_BUSH_SHAPES) {
      expect(shape).toMatch(/^bush_/);
    }
  });

  it("has no duplicate shape entries", () => {
    const uniqueShapes = new Set(VALID_BUSH_SHAPES);
    expect(uniqueShapes.size).toBe(VALID_BUSH_SHAPES.length);
  });
});

// ---------------------------------------------------------------------------
// buildModelKey — model key composition (Spec §8)
// ---------------------------------------------------------------------------

describe("buildModelKey (Spec §8)", () => {
  it("builds correct key for bush_connector + spring", () => {
    expect(buildModelKey("bush_connector", "spring")).toBe("bush_connector_spring");
  });

  it("builds correct key for bush_tall + winter", () => {
    expect(buildModelKey("bush_tall", "winter")).toBe("bush_tall_winter");
  });

  it("builds correct key for bush_long + autumn", () => {
    expect(buildModelKey("bush_long", "autumn")).toBe("bush_long_autumn");
  });

  it("builds correct key for bush_overgrown + dead", () => {
    expect(buildModelKey("bush_overgrown", "dead")).toBe("bush_overgrown_dead");
  });

  it("builds correct key for bush_round_corner + summer", () => {
    expect(buildModelKey("bush_round_corner", "summer")).toBe("bush_round_corner_summer");
  });

  it("produces different keys for the same shape across all 5 seasons", () => {
    const keys = VALID_SEASONS.map((s) => buildModelKey("bush_connector", s));
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(5);
  });

  it("produces different keys for all shapes in the same season", () => {
    const keys = VALID_BUSH_SHAPES.map((shape) => buildModelKey(shape, "spring"));
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(VALID_BUSH_SHAPES.length);
  });
});

// ---------------------------------------------------------------------------
// resolveBushGLBPath — GLB path resolution (Spec §6.3, §8)
// ---------------------------------------------------------------------------

describe("resolveBushGLBPath (Spec §6.3, §8)", () => {
  it("returns correct path for bush_connector + spring", () => {
    expect(resolveBushGLBPath("bush_connector", "spring")).toBe(
      "assets/models/bushes/bush_connector_spring.glb",
    );
  });

  it("returns correct path for bush_tall + winter", () => {
    expect(resolveBushGLBPath("bush_tall", "winter")).toBe(
      "assets/models/bushes/bush_tall_winter.glb",
    );
  });

  it("returns correct path for bush_long_round_corner + autumn", () => {
    expect(resolveBushGLBPath("bush_long_round_corner", "autumn")).toBe(
      "assets/models/bushes/bush_long_round_corner_autumn.glb",
    );
  });

  it("returns correct path for bush_overgrown + dead", () => {
    expect(resolveBushGLBPath("bush_overgrown", "dead")).toBe(
      "assets/models/bushes/bush_overgrown_dead.glb",
    );
  });

  it("always returns a path ending in .glb", () => {
    for (const shape of VALID_BUSH_SHAPES) {
      for (const season of VALID_SEASONS) {
        expect(resolveBushGLBPath(shape, season)).toMatch(/\.glb$/);
      }
    }
  });

  it("paths include assets/models/bushes/ prefix", () => {
    for (const shape of VALID_BUSH_SHAPES) {
      expect(resolveBushGLBPath(shape, "spring")).toMatch(/^assets\/models\/bushes\//);
    }
  });

  it("same shape produces different paths for different seasons", () => {
    const springPath = resolveBushGLBPath("bush_connector", "spring");
    const winterPath = resolveBushGLBPath("bush_connector", "winter");
    expect(springPath).not.toBe(winterPath);
  });

  it("different shapes produce different paths for the same season", () => {
    const path1 = resolveBushGLBPath("bush_connector", "summer");
    const path2 = resolveBushGLBPath("bush_tall", "summer");
    expect(path1).not.toBe(path2);
  });

  it("all 52 shapes resolve for all 5 seasons without throwing", () => {
    expect(() => {
      for (const shape of VALID_BUSH_SHAPES) {
        for (const season of VALID_SEASONS) {
          resolveBushGLBPath(shape, season);
        }
      }
    }).not.toThrow();
  });

  it("all resolved paths are unique across 52 shapes x 5 seasons", () => {
    const paths: string[] = [];
    for (const shape of VALID_BUSH_SHAPES) {
      for (const season of VALID_SEASONS) {
        paths.push(resolveBushGLBPath(shape, season));
      }
    }
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(VALID_BUSH_SHAPES.length * VALID_SEASONS.length);
  });

  it("throws for an unknown bushShape", () => {
    expect(() => resolveBushGLBPath("not_a_bush", "spring")).toThrow(
      '[BushModel] Unknown bushShape: "not_a_bush"',
    );
  });

  it("throws for an empty string bushShape", () => {
    expect(() => resolveBushGLBPath("", "spring")).toThrow("[BushModel] Unknown bushShape");
  });

  it("throws for a partial shape name", () => {
    expect(() => resolveBushGLBPath("bush", "summer")).toThrow(
      '[BushModel] Unknown bushShape: "bush"',
    );
  });
});

// ---------------------------------------------------------------------------
// BushModel component
// ---------------------------------------------------------------------------

describe("BushModel (Spec §6.3, §8)", () => {
  it("exports BushModel as a function component", () => {
    expect(typeof BushModel).toBe("function");
  });
});
