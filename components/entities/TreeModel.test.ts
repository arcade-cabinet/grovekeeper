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

import {
  getSpeciesUseWinterModel,
  PROCEDURAL_STAGE_MAX,
  resolveGLBPath,
  resolveModelPath,
  STAGE_SCALES,
  TreeModel,
} from "./TreeModel.tsx";

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
      "white-oak",
      "weeping-willow",
      "elder-pine",
      "cherry-blossom",
      "ghost-birch",
      "redwood",
      "flame-maple",
      "baobab",
      "silver-birch",
      "ironbark",
      "golden-apple",
      "mystic-fern",
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
      "white-oak",
      "weeping-willow",
      "elder-pine",
      "cherry-blossom",
      "ghost-birch",
      "redwood",
      "flame-maple",
      "baobab",
      "silver-birch",
      "ironbark",
      "golden-apple",
      "mystic-fern",
      "crystal-oak",
      "moonwood-ash",
      "worldtree",
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
// resolveModelPath — winter model swap (Spec §6.3, §8.1)
// ---------------------------------------------------------------------------

describe("resolveModelPath (Spec §6.3)", () => {
  it("returns glbPath when isWinter=false regardless of useWinterModel", () => {
    // elder-pine has useWinterModel=true, but winter flag is false
    const path = resolveModelPath("elder-pine", false);
    expect(path).toBe("assets/models/trees/elder-pine.glb");
  });

  it("returns glbPath when isWinter=true but species has useWinterModel=false", () => {
    // white-oak does not use a winter model
    const path = resolveModelPath("white-oak", true);
    expect(path).toBe("assets/models/trees/white-oak.glb");
  });

  it("returns winterModel path when isWinter=true and species has useWinterModel=true (elder-pine)", () => {
    const path = resolveModelPath("elder-pine", true);
    expect(path).toBe("assets/models/trees/elder-pine-winter.glb");
  });

  it("returns winterModel path when isWinter=true and species has useWinterModel=true (ghost-birch)", () => {
    const path = resolveModelPath("ghost-birch", true);
    expect(path).toBe("assets/models/trees/ghost-birch-winter.glb");
  });

  it("returns winterModel path for prestige species with useWinterModel=true (crystal-oak)", () => {
    const path = resolveModelPath("crystal-oak", true);
    expect(path).toBe("assets/models/trees/crystal-oak-winter.glb");
  });

  it("throws for unknown speciesId", () => {
    expect(() => resolveModelPath("not-a-tree", false)).toThrow(
      '[TreeModel] Unknown speciesId: "not-a-tree"',
    );
  });

  it("non-winter path always ends in .glb for all base species", () => {
    const baseIds = [
      "white-oak",
      "weeping-willow",
      "elder-pine",
      "cherry-blossom",
      "ghost-birch",
      "redwood",
      "flame-maple",
      "baobab",
      "silver-birch",
      "ironbark",
      "golden-apple",
      "mystic-fern",
    ];
    for (const id of baseIds) {
      expect(resolveModelPath(id, false)).toMatch(/\.glb$/);
    }
  });
});

// ---------------------------------------------------------------------------
// getSpeciesUseWinterModel (Spec §6.3)
// ---------------------------------------------------------------------------

describe("getSpeciesUseWinterModel (Spec §6.3)", () => {
  it("returns false for white-oak (no winter model)", () => {
    expect(getSpeciesUseWinterModel("white-oak")).toBe(false);
  });

  it("returns true for elder-pine (has winter model)", () => {
    expect(getSpeciesUseWinterModel("elder-pine")).toBe(true);
  });

  it("returns true for ghost-birch (has winter model)", () => {
    expect(getSpeciesUseWinterModel("ghost-birch")).toBe(true);
  });

  it("returns true for crystal-oak prestige species (has winter model)", () => {
    expect(getSpeciesUseWinterModel("crystal-oak")).toBe(true);
  });

  it("returns false for redwood (evergreen but no winter model swap)", () => {
    expect(getSpeciesUseWinterModel("redwood")).toBe(false);
  });

  it("throws for unknown speciesId", () => {
    expect(() => getSpeciesUseWinterModel("not-a-tree")).toThrow(
      '[TreeModel] Unknown speciesId: "not-a-tree"',
    );
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
