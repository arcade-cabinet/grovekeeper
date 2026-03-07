/**
 * Tests for NpcModel — seeded NPC appearance and GLB path resolution (Spec §15).
 *
 * Tests the exported pure functions without WebGL/R3F context.
 * The component itself is verified by checking the export.
 */

jest.mock("@react-three/drei", () => ({
  useGLTF: jest.fn().mockReturnValue({
    scene: { clone: jest.fn().mockReturnValue({ traverse: jest.fn() }) },
  }),
}));

jest.mock("@react-three/fiber", () => ({}));

import {
  NpcModel,
  resolveBaseModelPath,
  resolveBaseModelEmissionPath,
  resolveItemPath,
  resolveNpcAppearance,
} from "./NpcModel";

// ---------------------------------------------------------------------------
// resolveBaseModelPath
// ---------------------------------------------------------------------------

describe("resolveBaseModelPath (Spec §15)", () => {
  it("returns the correct path for basemesh", () => {
    expect(resolveBaseModelPath("basemesh")).toBe(
      "assets/models/npcs/base/basemesh.glb",
    );
  });

  it("returns the correct path for archer", () => {
    expect(resolveBaseModelPath("archer")).toBe(
      "assets/models/npcs/base/archer.glb",
    );
  });

  it("returns the correct path for knight", () => {
    expect(resolveBaseModelPath("knight")).toBe(
      "assets/models/npcs/base/knight.glb",
    );
  });

  it("returns the correct path for merchant", () => {
    expect(resolveBaseModelPath("merchant")).toBe(
      "assets/models/npcs/base/merchant.glb",
    );
  });

  it("returns the correct path for allinone", () => {
    expect(resolveBaseModelPath("allinone")).toBe(
      "assets/models/npcs/base/allinone.glb",
    );
  });

  it("all base model paths end in .glb", () => {
    const baseIds = ["basemesh", "archer", "knight", "merchant", "ninja", "student", "allinone"];
    for (const id of baseIds) {
      expect(resolveBaseModelPath(id)).toMatch(/\.glb$/);
    }
  });

  it("all base model paths are unique", () => {
    const baseIds = ["basemesh", "archer", "knight", "merchant", "ninja", "student", "allinone"];
    const paths = baseIds.map(resolveBaseModelPath);
    expect(new Set(paths).size).toBe(baseIds.length);
  });

  it("throws for an unknown baseModelId", () => {
    expect(() => resolveBaseModelPath("not-an-npc")).toThrow(
      '[NpcModel] Unknown baseModelId: "not-an-npc"',
    );
  });

  it("throws for an empty string baseModelId", () => {
    expect(() => resolveBaseModelPath("")).toThrow(
      "[NpcModel] Unknown baseModelId",
    );
  });
});

// ---------------------------------------------------------------------------
// resolveBaseModelEmissionPath
// ---------------------------------------------------------------------------

describe("resolveBaseModelEmissionPath (Spec §15)", () => {
  it("returns the emission path for basemesh", () => {
    expect(resolveBaseModelEmissionPath("basemesh")).toBe(
      "assets/models/npcs/base/basemesh-pr.glb",
    );
  });

  it("returns the emission path for archer", () => {
    expect(resolveBaseModelEmissionPath("archer")).toBe(
      "assets/models/npcs/base/archer-pr.glb",
    );
  });

  it("emission paths differ from base paths", () => {
    const base = resolveBaseModelPath("merchant");
    const emission = resolveBaseModelEmissionPath("merchant");
    expect(base).not.toBe(emission);
  });

  it("all emission paths end in .glb", () => {
    const baseIds = ["basemesh", "archer", "knight", "merchant", "ninja", "student"];
    for (const id of baseIds) {
      expect(resolveBaseModelEmissionPath(id)).toMatch(/\.glb$/);
    }
  });

  it("throws for an unknown baseModelId", () => {
    expect(() => resolveBaseModelEmissionPath("not-an-npc")).toThrow(
      '[NpcModel] Unknown baseModelId: "not-an-npc"',
    );
  });
});

// ---------------------------------------------------------------------------
// resolveItemPath
// ---------------------------------------------------------------------------

describe("resolveItemPath (Spec §15)", () => {
  it("returns the correct path for hairone", () => {
    expect(resolveItemPath("hairone")).toBe(
      "assets/models/npcs/items/hairone.glb",
    );
  });

  it("returns the correct path for shirt", () => {
    expect(resolveItemPath("shirt")).toBe(
      "assets/models/npcs/items/shirt.glb",
    );
  });

  it("returns the correct path for pants", () => {
    expect(resolveItemPath("pants")).toBe(
      "assets/models/npcs/items/pants.glb",
    );
  });

  it("returns the correct path for bag", () => {
    expect(resolveItemPath("bag")).toBe(
      "assets/models/npcs/items/bag.glb",
    );
  });

  it("all item paths end in .glb", () => {
    const itemIds = ["hairone", "hat", "shirt", "pants", "shoe", "bag", "ceinture"];
    for (const id of itemIds) {
      expect(resolveItemPath(id)).toMatch(/\.glb$/);
    }
  });

  it("throws for an unknown itemId", () => {
    expect(() => resolveItemPath("not-an-item")).toThrow(
      '[NpcModel] Unknown itemId: "not-an-item"',
    );
  });

  it("throws for an empty string itemId", () => {
    expect(() => resolveItemPath("")).toThrow("[NpcModel] Unknown itemId");
  });
});

// ---------------------------------------------------------------------------
// resolveNpcAppearance — determinism and seed sensitivity
// ---------------------------------------------------------------------------

describe("resolveNpcAppearance (Spec §15)", () => {
  it("is deterministic — same inputs always produce the same output", () => {
    const a1 = resolveNpcAppearance("elder-rowan", "TestSeed", "tips");
    const a2 = resolveNpcAppearance("elder-rowan", "TestSeed", "tips");
    expect(a1).toEqual(a2);
  });

  it("different npcId produces different appearance", () => {
    const a1 = resolveNpcAppearance("elder-rowan", "TestSeed", "tips");
    const a2 = resolveNpcAppearance("hazel", "TestSeed", "tips");
    const same =
      a1.baseModelPath === a2.baseModelPath &&
      a1.colorPalette === a2.colorPalette &&
      JSON.stringify(a1.itemPaths) === JSON.stringify(a2.itemPaths);
    expect(same).toBe(false);
  });

  it("different worldSeed produces different appearance", () => {
    const a1 = resolveNpcAppearance("elder-rowan", "SeedA", "tips");
    const a2 = resolveNpcAppearance("elder-rowan", "SeedB", "tips");
    const same =
      a1.baseModelPath === a2.baseModelPath &&
      a1.colorPalette === a2.colorPalette &&
      JSON.stringify(a1.itemPaths) === JSON.stringify(a2.itemPaths);
    expect(same).toBe(false);
  });

  it("baseModelPath ends in .glb", () => {
    const { baseModelPath } = resolveNpcAppearance("test-npc", "TestSeed");
    expect(baseModelPath).toMatch(/\.glb$/);
  });

  it("colorPalette is a valid hex color", () => {
    const { colorPalette } = resolveNpcAppearance("test-npc", "TestSeed");
    expect(colorPalette).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("useEmission is a boolean", () => {
    const { useEmission } = resolveNpcAppearance("test-npc", "TestSeed");
    expect(typeof useEmission).toBe("boolean");
  });

  it("all itemPaths values end in .glb", () => {
    for (let i = 0; i < 20; i++) {
      const { itemPaths } = resolveNpcAppearance(`npc-${i}`, "TestSeed", "crafting");
      for (const path of Object.values(itemPaths)) {
        expect(path).toMatch(/\.glb$/);
      }
    }
  });

  it("itemPaths keys are valid NPC item slots", () => {
    const validSlots = ["head", "torso", "legs", "feet", "accessory"];
    for (let i = 0; i < 20; i++) {
      const { itemPaths } = resolveNpcAppearance(`npc-${i}`, "TestSeed", "trading");
      for (const slot of Object.keys(itemPaths)) {
        expect(validSlots).toContain(slot);
      }
    }
  });

  it("uses emission path when useEmission=true", () => {
    // Run many seeds until we find one with useEmission=true
    let found = false;
    for (let i = 0; i < 200; i++) {
      const result = resolveNpcAppearance(`npc-${i}`, "EmissionSeed", "lore");
      if (result.useEmission) {
        // Emission paths contain "-pr." in the base path
        expect(result.baseModelPath).toMatch(/-pr\.glb$/);
        found = true;
        break;
      }
    }
    // With 15% emission probability over 200 seeds, we expect to find at least one
    expect(found).toBe(true);
  });

  it("uses regular path when useEmission=false", () => {
    // Run many seeds to find one with useEmission=false (very common)
    for (let i = 0; i < 20; i++) {
      const result = resolveNpcAppearance(`npc-${i}`, "TestSeed", "tips");
      if (!result.useEmission) {
        // Non-emission paths should NOT contain "-pr."
        expect(result.baseModelPath).not.toMatch(/-pr\.glb$/);
        return;
      }
    }
  });

  it("works with default role (tips)", () => {
    const result = resolveNpcAppearance("test-npc", "TestSeed");
    expect(result.baseModelPath).toMatch(/\.glb$/);
    expect(result.colorPalette).toMatch(/^#/);
  });
});

// ---------------------------------------------------------------------------
// NpcModel component
// ---------------------------------------------------------------------------

describe("NpcModel (Spec §15)", () => {
  it("exports NpcModel as a function component", () => {
    expect(typeof NpcModel).toBe("function");
  });
});
