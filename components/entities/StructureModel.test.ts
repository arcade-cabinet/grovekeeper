/**
 * Tests for StructureModel — structure GLB path resolution (Spec §14).
 *
 * Tests the exported pure functions without WebGL/R3F context.
 * The component itself is verified by checking the export.
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: { clone: jest.fn().mockReturnValue({}) },
  }),
}));

jest.mock("@react-three/fiber", () => ({}));

import { resolveStructureGLBPath, StructureModel } from "./StructureModel.tsx";

// All template IDs defined in config/game/structures.json
const ALL_TEMPLATE_IDS = [
  "barn",
  "house-1",
  "house-2",
  "house-3",
  "house-4",
  "house-5",
  "windmill",
  "water-well",
  "campfire-1",
  "campfire-2",
  "chicken-coop-1",
  "chicken-coop-2",
  "storage-1",
  "storage-2",
  "storage-3",
  "notice-board",
  "lamp",
  "bird-house",
  "water-post",
  "wooden-frame",
];

// ---------------------------------------------------------------------------
// resolveStructureGLBPath
// ---------------------------------------------------------------------------

describe("resolveStructureGLBPath (Spec §14)", () => {
  it("returns the correct path for barn", () => {
    expect(resolveStructureGLBPath("barn")).toBe("assets/models/structures/farm/barn.glb");
  });

  it("returns the correct path for windmill", () => {
    expect(resolveStructureGLBPath("windmill")).toBe("assets/models/structures/farm/windmill.glb");
  });

  it("returns the correct path for water-well", () => {
    expect(resolveStructureGLBPath("water-well")).toBe(
      "assets/models/structures/farm/water-well.glb",
    );
  });

  it("returns the correct path for house-1", () => {
    expect(resolveStructureGLBPath("house-1")).toBe("assets/models/structures/farm/house-1.glb");
  });

  it("returns the correct path for house-5", () => {
    expect(resolveStructureGLBPath("house-5")).toBe("assets/models/structures/farm/house-5.glb");
  });

  it("returns the correct path for campfire-1", () => {
    expect(resolveStructureGLBPath("campfire-1")).toBe(
      "assets/models/structures/farm/campfire-1.glb",
    );
  });

  it("returns the correct path for campfire-2", () => {
    expect(resolveStructureGLBPath("campfire-2")).toBe(
      "assets/models/structures/farm/campfire-2.glb",
    );
  });

  it("returns the correct path for notice-board", () => {
    expect(resolveStructureGLBPath("notice-board")).toBe(
      "assets/models/structures/farm/notice-board.glb",
    );
  });

  it("returns the correct path for wooden-frame", () => {
    expect(resolveStructureGLBPath("wooden-frame")).toBe(
      "assets/models/structures/farm/wooden-frame.glb",
    );
  });

  it("all structure paths end in .glb", () => {
    for (const id of ALL_TEMPLATE_IDS) {
      expect(resolveStructureGLBPath(id)).toMatch(/\.glb$/);
    }
  });

  it("all structure paths are unique", () => {
    const paths = ALL_TEMPLATE_IDS.map(resolveStructureGLBPath);
    expect(new Set(paths).size).toBe(ALL_TEMPLATE_IDS.length);
  });

  it("all structure paths include the templateId substring", () => {
    for (const id of ALL_TEMPLATE_IDS) {
      expect(resolveStructureGLBPath(id)).toContain(id);
    }
  });

  it("all structure paths are under assets/models/structures/farm/", () => {
    for (const id of ALL_TEMPLATE_IDS) {
      expect(resolveStructureGLBPath(id)).toMatch(/^assets\/models\/structures\/farm\//);
    }
  });

  it("resolves all 20 known template IDs without throwing", () => {
    expect(() => {
      for (const id of ALL_TEMPLATE_IDS) {
        resolveStructureGLBPath(id);
      }
    }).not.toThrow();
  });

  it("throws for an unknown templateId", () => {
    expect(() => resolveStructureGLBPath("not-a-structure")).toThrow(
      '[StructureModel] Unknown templateId: "not-a-structure"',
    );
  });

  it("throws for an empty string templateId", () => {
    expect(() => resolveStructureGLBPath("")).toThrow("[StructureModel] Unknown templateId");
  });

  it("throws for a partial match (chicken-coop without suffix)", () => {
    expect(() => resolveStructureGLBPath("chicken-coop")).toThrow(
      "[StructureModel] Unknown templateId",
    );
  });
});

// ---------------------------------------------------------------------------
// StructureModel component export
// ---------------------------------------------------------------------------

describe("StructureModel", () => {
  it("is exported as a function component", () => {
    expect(typeof StructureModel).toBe("function");
  });
});
