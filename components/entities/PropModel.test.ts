/**
 * Tests for PropModel — prop and food item GLB path resolution (Spec §14).
 *
 * Tests exported pure functions without WebGL/R3F context.
 * The component itself is verified by checking the export.
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: { clone: jest.fn().mockReturnValue({}) },
  }),
}));

jest.mock("@react-three/fiber", () => ({}));

import { PropModel, resolveFoodGLBPath, resolvePropGLBPath } from "./PropModel.tsx";

// ---------------------------------------------------------------------------
// resolvePropGLBPath — spot-checks across all categories
// ---------------------------------------------------------------------------

describe("resolvePropGLBPath (Spec §14)", () => {
  // misc
  it("returns the correct path for barrel-1", () => {
    expect(resolvePropGLBPath("barrel-1")).toBe("assets/models/props/misc/barrel-1.glb");
  });

  it("returns the correct path for barrel-2", () => {
    expect(resolvePropGLBPath("barrel-2")).toBe("assets/models/props/misc/barrel-2.glb");
  });

  it("returns the correct path for haybale-1", () => {
    expect(resolvePropGLBPath("haybale-1")).toBe("assets/models/props/misc/haybale-1.glb");
  });

  it("returns the correct path for log", () => {
    expect(resolvePropGLBPath("log")).toBe("assets/models/props/misc/log.glb");
  });

  it("returns the correct path for wheelbarrow", () => {
    expect(resolvePropGLBPath("wheelbarrow")).toBe("assets/models/props/misc/wheelbarrow.glb");
  });

  // crops
  it("returns the correct path for apple crop", () => {
    expect(resolvePropGLBPath("apple")).toBe("assets/models/crops/apple.glb");
  });

  it("returns the correct path for carrot crop", () => {
    expect(resolvePropGLBPath("carrot")).toBe("assets/models/crops/carrot.glb");
  });

  it("returns the correct path for pumpkin crop", () => {
    expect(resolvePropGLBPath("pumpkin")).toBe("assets/models/crops/pumpkin.glb");
  });

  // kitchen
  it("returns the correct path for beer-bottle", () => {
    expect(resolvePropGLBPath("beer-bottle")).toBe("assets/models/props/kitchen/beer_bottle.glb");
  });

  it("returns the correct path for bowl-01", () => {
    expect(resolvePropGLBPath("bowl-01")).toBe("assets/models/props/kitchen/bowl_01.glb");
  });

  it("returns the correct path for pan", () => {
    expect(resolvePropGLBPath("pan")).toBe("assets/models/props/kitchen/pan.glb");
  });

  // traps
  it("returns the correct path for spike-1", () => {
    expect(resolvePropGLBPath("spike-1")).toBe("assets/models/props/traps/spike_variant_1.glb");
  });

  it("returns the correct path for blade-guillotine", () => {
    expect(resolvePropGLBPath("blade-guillotine")).toBe(
      "assets/models/props/traps/blade_guillotine.glb",
    );
  });

  // weapons
  it("returns the correct path for psx-axe", () => {
    expect(resolvePropGLBPath("psx-axe")).toBe("assets/models/weapons/psx-axe.glb");
  });

  it("returns the correct path for psx-sword", () => {
    expect(resolvePropGLBPath("psx-sword")).toBe("assets/models/weapons/psx-sword.glb");
  });

  it("returns the correct path for katana", () => {
    expect(resolvePropGLBPath("katana")).toBe("assets/models/weapons/katana.glb");
  });

  // structures (from propAssets — distinct from structures.json)
  it("returns the correct path for barn from propAssets", () => {
    expect(resolvePropGLBPath("barn")).toBe("assets/models/structures/farm/barn.glb");
  });

  it("returns the correct path for windmill from propAssets", () => {
    expect(resolvePropGLBPath("windmill")).toBe("assets/models/structures/farm/windmill.glb");
  });

  // bulk checks
  it("all resolved paths end in .glb", () => {
    const SAMPLE_IDS = [
      "barrel-1",
      "apple",
      "beer-bottle",
      "spike-1",
      "psx-axe",
      "haybale-3",
      "basket-1",
      "crate-1",
      "fork",
      "spoon",
    ];
    for (const id of SAMPLE_IDS) {
      expect(resolvePropGLBPath(id)).toMatch(/\.glb$/);
    }
  });

  // errors
  it("throws for an unknown propId", () => {
    expect(() => resolvePropGLBPath("not-a-prop")).toThrow(
      '[PropModel] Unknown propId: "not-a-prop"',
    );
  });

  it("throws for an empty propId", () => {
    expect(() => resolvePropGLBPath("")).toThrow("[PropModel] Unknown propId");
  });

  it("throws for a partial match (haybale without suffix)", () => {
    expect(() => resolvePropGLBPath("haybale")).toThrow("[PropModel] Unknown propId");
  });
});

// ---------------------------------------------------------------------------
// resolveFoodGLBPath — raw food (crop) lookups
// ---------------------------------------------------------------------------

describe("resolveFoodGLBPath (Spec §14)", () => {
  it("returns the correct path for apple", () => {
    expect(resolveFoodGLBPath("apple")).toBe("assets/models/crops/apple.glb");
  });

  it("returns the correct path for carrot", () => {
    expect(resolveFoodGLBPath("carrot")).toBe("assets/models/crops/carrot.glb");
  });

  it("returns the correct path for cucumber", () => {
    expect(resolveFoodGLBPath("cucumber")).toBe("assets/models/crops/cucumber.glb");
  });

  it("returns the correct path for pumpkin", () => {
    expect(resolveFoodGLBPath("pumpkin")).toBe("assets/models/crops/pumpkin.glb");
  });

  it("returns the correct path for tomato", () => {
    expect(resolveFoodGLBPath("tomato")).toBe("assets/models/crops/tomato.glb");
  });

  it("all 5 crop food paths end in .glb", () => {
    const CROP_IDS = ["apple", "carrot", "cucumber", "pumpkin", "tomato"];
    for (const id of CROP_IDS) {
      expect(resolveFoodGLBPath(id)).toMatch(/\.glb$/);
    }
  });

  it("all 5 crop food paths are under assets/models/crops/", () => {
    const CROP_IDS = ["apple", "carrot", "cucumber", "pumpkin", "tomato"];
    for (const id of CROP_IDS) {
      expect(resolveFoodGLBPath(id)).toMatch(/^assets\/models\/crops\//);
    }
  });

  it("all 5 crop food paths are unique", () => {
    const CROP_IDS = ["apple", "carrot", "cucumber", "pumpkin", "tomato"];
    const paths = CROP_IDS.map(resolveFoodGLBPath);
    expect(new Set(paths).size).toBe(CROP_IDS.length);
  });

  it("throws for a cooked food id (not a raw crop)", () => {
    expect(() => resolveFoodGLBPath("roasted-apple")).toThrow(
      '[PropModel] Unknown foodId: "roasted-apple"',
    );
  });

  it("throws for an unknown foodId", () => {
    expect(() => resolveFoodGLBPath("not-a-food")).toThrow("[PropModel] Unknown foodId");
  });

  it("throws for an empty foodId", () => {
    expect(() => resolveFoodGLBPath("")).toThrow("[PropModel] Unknown foodId");
  });
});

// ---------------------------------------------------------------------------
// PropModel component export
// ---------------------------------------------------------------------------

describe("PropModel", () => {
  it("is exported as a function component", () => {
    expect(typeof PropModel).toBe("function");
  });
});
