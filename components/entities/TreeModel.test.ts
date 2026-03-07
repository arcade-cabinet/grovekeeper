/**
 * Tests for TreeModel — species GLB path mapping and stage scales (Spec §8.1).
 *
 * Tests the exported pure functions and constants without WebGL/R3F context.
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: { clone: jest.fn().mockReturnValue({}) },
  }),
}));

jest.mock("@react-three/fiber", () => ({}));

import { PROCEDURAL_STAGE_MAX, STAGE_SCALES, TreeModel, resolveGLBPath } from "./TreeModel";

// ---------------------------------------------------------------------------
// resolveGLBPath — species config lookup
// ---------------------------------------------------------------------------

describe("resolveGLBPath (Spec §8.1)", () => {
  it("returns the glbPath for white-oak", () => {
    const path = resolveGLBPath("white-oak");
    expect(path).toBe("assets/models/trees/white-oak.glb");
  });

  it("returns the glbPath for elder-pine", () => {
    const path = resolveGLBPath("elder-pine");
    expect(path).toBe("assets/models/trees/elder-pine.glb");
  });

  it("returns the glbPath for cherry-blossom", () => {
    const path = resolveGLBPath("cherry-blossom");
    expect(path).toBe("assets/models/trees/cherry-blossom.glb");
  });

  it("returns the glbPath for redwood", () => {
    const path = resolveGLBPath("redwood");
    expect(path).toBe("assets/models/trees/redwood.glb");
  });

  it("returns the glbPath for the crystal-oak prestige species", () => {
    const path = resolveGLBPath("crystal-oak");
    expect(path).toBe("assets/models/trees/crystal-oak.glb");
  });

  it("returns the glbPath for worldtree prestige species", () => {
    const path = resolveGLBPath("worldtree");
    expect(path).toBe("assets/models/trees/worldtree.glb");
  });

  it("throws for an unknown speciesId", () => {
    expect(() => resolveGLBPath("not-a-real-tree")).toThrow(
      '[TreeModel] Unknown speciesId: "not-a-real-tree"',
    );
  });

  it("throws for an empty string speciesId", () => {
    expect(() => resolveGLBPath("")).toThrow("[TreeModel] Unknown speciesId");
  });

  it("returns a path ending in .glb for all base species", () => {
    const baseIds = [
      "white-oak", "weeping-willow", "elder-pine", "cherry-blossom", "ghost-birch",
      "redwood", "flame-maple", "baobab", "silver-birch", "ironbark",
      "golden-apple", "mystic-fern",
    ];
    for (const id of baseIds) {
      expect(resolveGLBPath(id)).toMatch(/\.glb$/);
    }
  });

  it("returns a path ending in .glb for all prestige species", () => {
    const prestigeIds = ["crystal-oak", "moonwood-ash", "worldtree"];
    for (const id of prestigeIds) {
      expect(resolveGLBPath(id)).toMatch(/\.glb$/);
    }
  });

  it("each speciesId maps to a unique glbPath", () => {
    const allIds = [
      "white-oak", "weeping-willow", "elder-pine", "cherry-blossom", "ghost-birch",
      "redwood", "flame-maple", "baobab", "silver-birch", "ironbark",
      "golden-apple", "mystic-fern", "crystal-oak", "moonwood-ash", "worldtree",
    ];
    const paths = allIds.map(resolveGLBPath);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(allIds.length);
  });
});

// ---------------------------------------------------------------------------
// STAGE_SCALES — growth stage scale multipliers
// ---------------------------------------------------------------------------

describe("STAGE_SCALES (Spec §8.1)", () => {
  it("stage 2 (Sapling) has scale 0.5", () => {
    expect(STAGE_SCALES[2]).toBe(0.5);
  });

  it("stage 3 (Mature) has scale 1.0", () => {
    expect(STAGE_SCALES[3]).toBe(1.0);
  });

  it("stage 4 (Old Growth) has scale 1.3", () => {
    expect(STAGE_SCALES[4]).toBe(1.3);
  });

  it("stage 0 (Seed) has a scale smaller than stage 1", () => {
    expect(STAGE_SCALES[0]).toBeLessThan(STAGE_SCALES[1]);
  });

  it("stage 1 (Sprout) has a scale smaller than stage 2", () => {
    expect(STAGE_SCALES[1]).toBeLessThan(STAGE_SCALES[2]);
  });

  it("scales increase monotonically from stage 0 to 4", () => {
    for (let i = 0; i < 4; i++) {
      expect(STAGE_SCALES[i]).toBeLessThan(STAGE_SCALES[i + 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// PROCEDURAL_STAGE_MAX
// ---------------------------------------------------------------------------

describe("PROCEDURAL_STAGE_MAX (Spec §8.1)", () => {
  it("is 1 (stages 0 and 1 use hardcoded geometry)", () => {
    expect(PROCEDURAL_STAGE_MAX).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TreeModel component
// ---------------------------------------------------------------------------

describe("TreeModel (Spec §8.1)", () => {
  it("exports TreeModel as a function component", () => {
    expect(typeof TreeModel).toBe("function");
  });
});
