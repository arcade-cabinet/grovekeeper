/**
 * Tests for GrassInstances — grass InstancedMesh rendering (Spec §8).
 *
 * Tests pure functions and constants without WebGL/R3F context.
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: {
      traverse: jest.fn(),
      clone: jest.fn().mockReturnValue({}),
    },
  }),
}));

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("@/game/ecs/world", () => ({
  grassQuery: { entities: [] },
}));

import vegetationConfig from "@/config/game/vegetation.json" with { type: "json" };
import {
  computeGrassInstanceTransforms,
  GRASS_SCATTER_RADIUS,
  GrassInstances,
  resolveGrassGLBPath,
} from "./GrassInstances.tsx";

// ---------------------------------------------------------------------------
// resolveGrassGLBPath — GLB path resolution (Spec §8)
// ---------------------------------------------------------------------------

describe("resolveGrassGLBPath (Spec §8)", () => {
  it("returns correct path for grass01", () => {
    expect(resolveGrassGLBPath("grass01")).toBe("assets/models/grass/grass01.glb");
  });

  it("returns correct path for grass_bush", () => {
    expect(resolveGrassGLBPath("grass_bush")).toBe("assets/models/grass/grass_bush.glb");
  });

  it("returns correct path for grass_patch_corner", () => {
    expect(resolveGrassGLBPath("grass_patch_corner")).toBe(
      "assets/models/grass/grass_patch_corner.glb",
    );
  });

  it("path ends in .glb", () => {
    expect(resolveGrassGLBPath("grass02")).toMatch(/\.glb$/);
  });

  it("path starts with assets/models/grass/", () => {
    expect(resolveGrassGLBPath("grass03")).toMatch(/^assets\/models\/grass\//);
  });

  it("embeds the grassType in the path", () => {
    expect(resolveGrassGLBPath("grass_patch")).toContain("grass_patch");
  });

  it("different grassTypes produce different paths", () => {
    expect(resolveGrassGLBPath("grass01")).not.toBe(resolveGrassGLBPath("grass02"));
  });

  it("all biome grass types from vegetation.json resolve without error", () => {
    // Collect all unique grassTypes referenced in biomeGrass config
    const types = new Set<string>();
    for (const biome of Object.values(vegetationConfig.biomeGrass)) {
      for (const entry of biome.types) {
        types.add(entry.grassType);
      }
    }
    expect(() => {
      for (const t of types) {
        resolveGrassGLBPath(t);
      }
    }).not.toThrow();
  });

  it("each unique grassType produces a unique path", () => {
    const types = [
      "grass01",
      "grass02",
      "grass03",
      "grass_bush",
      "grass_patch",
      "grass_patch_corner",
    ];
    const paths = types.map(resolveGrassGLBPath);
    const unique = new Set(paths);
    expect(unique.size).toBe(types.length);
  });
});

// ---------------------------------------------------------------------------
// GRASS_SCATTER_RADIUS — loaded from vegetation config (Spec §8)
// ---------------------------------------------------------------------------

describe("GRASS_SCATTER_RADIUS (Spec §8)", () => {
  it("is a positive number", () => {
    expect(GRASS_SCATTER_RADIUS).toBeGreaterThan(0);
  });

  it("matches the value in vegetation.json", () => {
    expect(GRASS_SCATTER_RADIUS).toBe(vegetationConfig.grassScatterRadius);
  });
});

// ---------------------------------------------------------------------------
// computeGrassInstanceTransforms — per-instance seeded placement (Spec §8, §3.2)
// ---------------------------------------------------------------------------

describe("computeGrassInstanceTransforms (Spec §8, §3.2)", () => {
  it("returns exactly density transforms", () => {
    expect(computeGrassInstanceTransforms("e1", 5)).toHaveLength(5);
  });

  it("returns 3 transforms for density 3", () => {
    expect(computeGrassInstanceTransforms("e2", 3)).toHaveLength(3);
  });

  it("returns 1 transform for density 1", () => {
    expect(computeGrassInstanceTransforms("e3", 1)).toHaveLength(1);
  });

  it("returns 0 transforms for density 0", () => {
    expect(computeGrassInstanceTransforms("e4", 0)).toHaveLength(0);
  });

  it("is deterministic — same entityId + density gives identical result", () => {
    const a = computeGrassInstanceTransforms("entity_42", 4);
    const b = computeGrassInstanceTransforms("entity_42", 4);
    expect(a).toEqual(b);
  });

  it("is deterministic across multiple calls with density 1", () => {
    const a = computeGrassInstanceTransforms("entity_seed_check", 1);
    const b = computeGrassInstanceTransforms("entity_seed_check", 1);
    expect(a[0].dx).toBe(b[0].dx);
    expect(a[0].dz).toBe(b[0].dz);
    expect(a[0].rotY).toBe(b[0].rotY);
  });

  it("different entityIds produce different transforms", () => {
    const a = computeGrassInstanceTransforms("entity_1", 3);
    const b = computeGrassInstanceTransforms("entity_2", 3);
    expect(a).not.toEqual(b);
  });

  it("each transform has dx field", () => {
    const [t] = computeGrassInstanceTransforms("e1", 1);
    expect(t).toHaveProperty("dx");
  });

  it("each transform has dz field", () => {
    const [t] = computeGrassInstanceTransforms("e1", 1);
    expect(t).toHaveProperty("dz");
  });

  it("each transform has rotY field", () => {
    const [t] = computeGrassInstanceTransforms("e1", 1);
    expect(t).toHaveProperty("rotY");
  });

  it("dx and dz are numbers", () => {
    const [t] = computeGrassInstanceTransforms("e1", 1);
    expect(typeof t.dx).toBe("number");
    expect(typeof t.dz).toBe("number");
  });

  it("rotY is a number", () => {
    const [t] = computeGrassInstanceTransforms("e1", 1);
    expect(typeof t.rotY).toBe("number");
  });

  it("all instances are within GRASS_SCATTER_RADIUS of origin", () => {
    const transforms = computeGrassInstanceTransforms("scatter_test", 30);
    for (const { dx, dz } of transforms) {
      const dist = Math.sqrt(dx * dx + dz * dz);
      expect(dist).toBeLessThanOrEqual(GRASS_SCATTER_RADIUS + 1e-9);
    }
  });

  it("rotY is in [0, 2π) for all instances", () => {
    const transforms = computeGrassInstanceTransforms("rotation_test", 20);
    for (const { rotY } of transforms) {
      expect(rotY).toBeGreaterThanOrEqual(0);
      expect(rotY).toBeLessThan(Math.PI * 2);
    }
  });

  it("instances are spread around the origin (not all at the same point)", () => {
    const transforms = computeGrassInstanceTransforms("spread_test", 10);
    const dxValues = transforms.map((t) => t.dx);
    const uniqueDx = new Set(dxValues);
    expect(uniqueDx.size).toBeGreaterThan(1);
  });

  it("density 6 returns 6 instances (max typical density)", () => {
    expect(computeGrassInstanceTransforms("max_density", 6)).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// GrassInstances component
// ---------------------------------------------------------------------------

describe("GrassInstances (Spec §8)", () => {
  it("exports GrassInstances as a function component", () => {
    expect(typeof GrassInstances).toBe("function");
  });
});
