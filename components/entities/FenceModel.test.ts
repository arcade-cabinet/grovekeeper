/**
 * Tests for FenceModel — fence GLB path resolution and auto-connect (Spec §14).
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

import type { FenceConnections } from "./FenceModel.tsx";
import {
  FenceModel,
  resolveConnectedRotation,
  resolveConnectedVariant,
  resolveFenceGLBPath,
} from "./FenceModel.tsx";

// ---------------------------------------------------------------------------
// Canonical spot-check variants per fence type
// ---------------------------------------------------------------------------

const SPOT_CHECKS: Array<{
  fenceType: Parameters<typeof resolveFenceGLBPath>[0];
  variant: string;
  expectedPath: string;
}> = [
  {
    fenceType: "brick",
    variant: "brick_wall",
    expectedPath: "assets/models/fences/brick/brick_wall.glb",
  },
  {
    fenceType: "brick",
    variant: "brick_Wall_corner",
    expectedPath: "assets/models/fences/brick/brick_Wall_corner.glb",
  },
  {
    fenceType: "brick",
    variant: "brick_wall_gate",
    expectedPath: "assets/models/fences/brick/brick_wall_gate.glb",
  },
  {
    fenceType: "drystone",
    variant: "drystone_wall",
    expectedPath: "assets/models/fences/drystone/drystone_wall.glb",
  },
  {
    fenceType: "drystone",
    variant: "drystone_column",
    expectedPath: "assets/models/fences/drystone/drystone_column.glb",
  },
  {
    fenceType: "wooden",
    variant: "wooden_fence_closed",
    expectedPath: "assets/models/fences/wooden/wooden_fence_closed.glb",
  },
  {
    fenceType: "wooden",
    variant: "wooden_fence_broken",
    expectedPath: "assets/models/fences/wooden/wooden_fence_broken.glb",
  },
  {
    fenceType: "wooden",
    variant: "wooden_fence_pole",
    expectedPath: "assets/models/fences/wooden/wooden_fence_pole.glb",
  },
  {
    fenceType: "metal",
    variant: "metalfence_both_sides_topbar",
    expectedPath: "assets/models/fences/metal/metalfence_both_sides_topbar.glb",
  },
  {
    fenceType: "metal",
    variant: "gate",
    expectedPath: "assets/models/fences/metal/gate.glb",
  },
  {
    fenceType: "plackard",
    variant: "plackard_closed",
    expectedPath: "assets/models/fences/plackard/plackard_closed.glb",
  },
  {
    fenceType: "plackard",
    variant: "plackard_corner",
    expectedPath: "assets/models/fences/plackard/plackard_corner.glb",
  },
  {
    fenceType: "plackard",
    variant: "plackard_broken",
    expectedPath: "assets/models/fences/plackard/plackard_broken.glb",
  },
  {
    fenceType: "plaster",
    variant: "plaster_wall",
    expectedPath: "assets/models/fences/plaster/plaster_wall.glb",
  },
  {
    fenceType: "plaster",
    variant: "plaster_wall_column",
    expectedPath: "assets/models/fences/plaster/plaster_wall_column.glb",
  },
  {
    fenceType: "picket",
    variant: "white_picket_fence_closed_left",
    expectedPath: "assets/models/fences/picket/white_picket_fence_closed_left.glb",
  },
  {
    fenceType: "picket",
    variant: "white_picket_fence_gate",
    expectedPath: "assets/models/fences/picket/white_picket_fence_gate.glb",
  },
  {
    fenceType: "picket",
    variant: "white_picket_fence_pole",
    expectedPath: "assets/models/fences/picket/white_picket_fence_pole.glb",
  },
];

// All fence types
const FENCE_TYPES: Array<Parameters<typeof resolveFenceGLBPath>[0]> = [
  "brick",
  "drystone",
  "wooden",
  "metal",
  "plackard",
  "plaster",
  "picket",
];

// ---------------------------------------------------------------------------
// resolveFenceGLBPath
// ---------------------------------------------------------------------------

describe("resolveFenceGLBPath (Spec §14)", () => {
  it.each(SPOT_CHECKS)("returns correct path for $fenceType:$variant", ({
    fenceType,
    variant,
    expectedPath,
  }) => {
    expect(resolveFenceGLBPath(fenceType, variant)).toBe(expectedPath);
  });

  it("all paths end in .glb", () => {
    for (const { fenceType, variant } of SPOT_CHECKS) {
      expect(resolveFenceGLBPath(fenceType, variant)).toMatch(/\.glb$/);
    }
  });

  it("all paths are under assets/models/fences/", () => {
    for (const { fenceType, variant } of SPOT_CHECKS) {
      expect(resolveFenceGLBPath(fenceType, variant)).toMatch(/^assets\/models\/fences\//);
    }
  });

  it("all paths include the fenceType in the directory segment", () => {
    for (const { fenceType, variant } of SPOT_CHECKS) {
      expect(resolveFenceGLBPath(fenceType, variant)).toContain(`/${fenceType}/`);
    }
  });

  it("throws for an unknown fenceType:variant combination", () => {
    expect(() => resolveFenceGLBPath("brick", "not_a_variant")).toThrow(
      '[FenceModel] Unknown fence type/variant: "brick:not_a_variant"',
    );
  });

  it("throws for an empty variant string", () => {
    expect(() => resolveFenceGLBPath("wooden", "")).toThrow(
      "[FenceModel] Unknown fence type/variant",
    );
  });

  it("throws for a partial variant name (wrong fenceType prefix)", () => {
    expect(() => resolveFenceGLBPath("picket", "brick_wall")).toThrow(
      "[FenceModel] Unknown fence type/variant",
    );
  });
});

// ---------------------------------------------------------------------------
// resolveConnectedVariant
// ---------------------------------------------------------------------------

describe("resolveConnectedVariant (Spec §14)", () => {
  const NO_CONNECTIONS: FenceConnections = {};
  const NORTH_ONLY: FenceConnections = { north: true };
  const NORTH_SOUTH: FenceConnections = { north: true, south: true };
  const EAST_WEST: FenceConnections = { east: true, west: true };
  const NORTH_EAST: FenceConnections = { north: true, east: true };
  const ALL_FOUR: FenceConnections = { north: true, south: true, east: true, west: true };

  it("brick — isolated returns pole", () => {
    expect(resolveConnectedVariant("brick", NO_CONNECTIONS)).toBe("brick_wall_pole");
  });

  it("brick — end cap (single neighbor) returns small piece", () => {
    expect(resolveConnectedVariant("brick", NORTH_ONLY)).toBe("brick_wall_small");
  });

  it("brick — N-S straight returns brick_wall", () => {
    expect(resolveConnectedVariant("brick", NORTH_SOUTH)).toBe("brick_wall");
  });

  it("brick — E-W straight returns brick_wall", () => {
    expect(resolveConnectedVariant("brick", EAST_WEST)).toBe("brick_wall");
  });

  it("brick — corner (N+E) returns corner piece", () => {
    expect(resolveConnectedVariant("brick", NORTH_EAST)).toBe("brick_Wall_corner");
  });

  it("brick — all four returns straight (no cross piece)", () => {
    expect(resolveConnectedVariant("brick", ALL_FOUR)).toBe("brick_wall");
  });

  it("drystone — isolated returns column", () => {
    expect(resolveConnectedVariant("drystone", NO_CONNECTIONS)).toBe("drystone_column");
  });

  it("drystone — connected returns wall", () => {
    expect(resolveConnectedVariant("drystone", NORTH_SOUTH)).toBe("drystone_wall");
  });

  it("wooden — isolated returns pole", () => {
    expect(resolveConnectedVariant("wooden", NO_CONNECTIONS)).toBe("wooden_fence_pole");
  });

  it("wooden — connected returns closed fence", () => {
    expect(resolveConnectedVariant("wooden", NORTH_SOUTH)).toBe("wooden_fence_closed");
  });

  it("metal — isolated returns one-side piece", () => {
    expect(resolveConnectedVariant("metal", NO_CONNECTIONS)).toBe("metalfence_one_side_no_topbar");
  });

  it("metal — connected returns both-sides topbar", () => {
    expect(resolveConnectedVariant("metal", EAST_WEST)).toBe("metalfence_both_sides_topbar");
  });

  it("plackard — isolated returns slab_single", () => {
    expect(resolveConnectedVariant("plackard", NO_CONNECTIONS)).toBe("plackard_slab_single");
  });

  it("plackard — end cap (single neighbor) returns slab_single", () => {
    expect(resolveConnectedVariant("plackard", NORTH_ONLY)).toBe("plackard_slab_single");
  });

  it("plackard — corner returns corner piece", () => {
    expect(resolveConnectedVariant("plackard", NORTH_EAST)).toBe("plackard_corner");
  });

  it("plackard — straight returns closed", () => {
    expect(resolveConnectedVariant("plackard", NORTH_SOUTH)).toBe("plackard_closed");
  });

  it("plaster — isolated returns column", () => {
    expect(resolveConnectedVariant("plaster", NO_CONNECTIONS)).toBe("plaster_wall_column");
  });

  it("plaster — connected returns wall", () => {
    expect(resolveConnectedVariant("plaster", NORTH_SOUTH)).toBe("plaster_wall");
  });

  it("picket — isolated returns pole", () => {
    expect(resolveConnectedVariant("picket", NO_CONNECTIONS)).toBe("white_picket_fence_pole");
  });

  it("picket — connected returns closed_left", () => {
    expect(resolveConnectedVariant("picket", EAST_WEST)).toBe("white_picket_fence_closed_left");
  });

  it("resolveConnectedVariant outputs are valid fences.json variants", () => {
    const testCases: Array<[Parameters<typeof resolveConnectedVariant>[0], FenceConnections]> = [
      ["brick", {}],
      ["brick", { north: true }],
      ["brick", { north: true, south: true }],
      ["brick", { north: true, east: true }],
      ["drystone", {}],
      ["drystone", { north: true, south: true }],
      ["wooden", {}],
      ["wooden", { east: true, west: true }],
      ["metal", {}],
      ["metal", { north: true, south: true }],
      ["plackard", {}],
      ["plackard", { north: true, east: true }],
      ["plackard", { north: true, south: true }],
      ["plaster", {}],
      ["plaster", { east: true }],
      ["picket", {}],
      ["picket", { north: true, south: true }],
    ];
    for (const [ft, conn] of testCases) {
      const variant = resolveConnectedVariant(ft, conn);
      expect(() => resolveFenceGLBPath(ft, variant)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// resolveConnectedRotation
// ---------------------------------------------------------------------------

describe("resolveConnectedRotation (Spec §14)", () => {
  it("N-S alignment returns 0 rotation", () => {
    expect(resolveConnectedRotation({ north: true, south: true })).toBe(0);
  });

  it("E-W alignment returns PI/2", () => {
    expect(resolveConnectedRotation({ east: true, west: true })).toBeCloseTo(Math.PI / 2);
  });

  it("east only returns PI/2", () => {
    expect(resolveConnectedRotation({ east: true })).toBeCloseTo(Math.PI / 2);
  });

  it("west only returns PI/2", () => {
    expect(resolveConnectedRotation({ west: true })).toBeCloseTo(Math.PI / 2);
  });

  it("no connections returns 0", () => {
    expect(resolveConnectedRotation({})).toBe(0);
  });

  it("north+east corner returns 0 (corner piece handles orientation)", () => {
    expect(resolveConnectedRotation({ north: true, east: true })).toBe(0);
  });

  it("all four connected returns 0", () => {
    expect(resolveConnectedRotation({ north: true, south: true, east: true, west: true })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// FenceModel component export
// ---------------------------------------------------------------------------

describe("FenceModel", () => {
  it("is exported as a function component", () => {
    expect(typeof FenceModel).toBe("function");
  });

  it("all 7 fence types are covered by resolveConnectedVariant", () => {
    for (const ft of FENCE_TYPES) {
      expect(() => resolveConnectedVariant(ft, {})).not.toThrow();
    }
  });
});
