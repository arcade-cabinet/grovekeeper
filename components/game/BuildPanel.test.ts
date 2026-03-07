/**
 * BuildPanel pure-function tests. Spec §35.4 -- Build UI.
 *
 * Tests the exported seams: category mapping, cost lookup,
 * affordability check, unlock level calculation, and lock guard.
 * Imports from buildPanelUtils.ts (plain .ts, no JSX) to avoid
 * pulling in the react-native-css-interop JSX runtime chain.
 */

import {
  canAffordPiece,
  getBuildCost,
  getPiecesForCategory,
  getPieceUnlockLevel,
  getTier,
  isPieceLocked,
} from "./buildPanelUtils.ts";

// ---------------------------------------------------------------------------
// getPiecesForCategory (Spec §35.2)
// ---------------------------------------------------------------------------

describe("getPiecesForCategory (Spec §35.4)", () => {
  it("returns foundation pieces for 'foundation' category", () => {
    const pieces = getPiecesForCategory("foundation");
    expect(pieces).toContain("foundation");
    expect(pieces).toContain("floor");
    expect(pieces).toContain("platform");
  });

  it("returns wall pieces for 'walls' category", () => {
    const pieces = getPiecesForCategory("walls");
    expect(pieces).toContain("wall");
    expect(pieces).toContain("window");
    expect(pieces).toContain("pillar");
  });

  it("returns roof pieces for 'roofs' category", () => {
    const pieces = getPiecesForCategory("roofs");
    expect(pieces).toContain("roof");
    expect(pieces).toContain("beam");
  });

  it("returns door for 'doors' category", () => {
    expect(getPiecesForCategory("doors")).toContain("door");
  });

  it("returns stairs for 'stairs' category", () => {
    expect(getPiecesForCategory("stairs")).toContain("stairs");
  });

  it("returns pipe for 'utility' category", () => {
    expect(getPiecesForCategory("utility")).toContain("pipe");
  });

  it("returns empty array for unknown category", () => {
    expect(getPiecesForCategory("unknown")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getBuildCost (Spec §35.4)
// ---------------------------------------------------------------------------

describe("getBuildCost (Spec §35.4)", () => {
  it("returns wood cost for wall+wood", () => {
    const cost = getBuildCost("wall", "wood");
    expect(cost).toEqual({ wood: 4 });
  });

  it("returns fiber cost for wall+thatch", () => {
    const cost = getBuildCost("wall", "thatch");
    expect(cost).toEqual({ fiber: 3 });
  });

  it("returns metal_scrap cost for pipe+metal", () => {
    const cost = getBuildCost("pipe", "metal");
    expect(cost).toEqual({ metal_scrap: 2 });
  });

  it("returns empty object for unsupported material combo", () => {
    // pipe only supports metal -- no thatch entry
    const cost = getBuildCost("pipe", "thatch");
    expect(cost).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// canAffordPiece (Spec §35.4)
// ---------------------------------------------------------------------------

describe("canAffordPiece (Spec §35.4)", () => {
  it("returns true when player has exactly enough resources", () => {
    expect(canAffordPiece("wall", "wood", { wood: 4 })).toBe(true);
  });

  it("returns true when player has more than enough", () => {
    expect(canAffordPiece("wall", "wood", { wood: 10 })).toBe(true);
  });

  it("returns false when player is one resource short", () => {
    expect(canAffordPiece("wall", "wood", { wood: 3 })).toBe(false);
  });

  it("returns false when resource is missing entirely", () => {
    expect(canAffordPiece("wall", "wood", {})).toBe(false);
  });

  it("returns true for a no-cost combo (empty cost)", () => {
    // pipe+thatch has no entry → cost is {} → always affordable
    expect(canAffordPiece("pipe", "thatch", {})).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getPieceUnlockLevel (Spec §35.4)
// ---------------------------------------------------------------------------

describe("getPieceUnlockLevel (Spec §35.4)", () => {
  it("returns piece unlock level when material unlocks earlier", () => {
    // wall unlocks at 5, thatch at 1 → max = 5
    expect(getPieceUnlockLevel("wall", "thatch")).toBe(5);
  });

  it("returns material unlock level when material unlocks later", () => {
    // wall unlocks at 5, metal at 15 → max = 15
    expect(getPieceUnlockLevel("wall", "metal")).toBe(15);
  });

  it("returns equal level when both unlock at same level", () => {
    // wall=5, wood=5 → max = 5
    expect(getPieceUnlockLevel("wall", "wood")).toBe(5);
  });

  it("returns higher level for late-unlock pieces", () => {
    // pipe=15, metal=15 → max = 15
    expect(getPieceUnlockLevel("pipe", "metal")).toBe(15);
  });

  it("returns piece level for stone wall (stone unlocks at 10, wall at 5)", () => {
    expect(getPieceUnlockLevel("wall", "stone")).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// isPieceLocked (Spec §35.4)
// ---------------------------------------------------------------------------

describe("isPieceLocked (Spec §35.4)", () => {
  it("returns false when player level meets requirement exactly", () => {
    // wall+wood requires level 5
    expect(isPieceLocked("wall", "wood", 5)).toBe(false);
  });

  it("returns true when player level is one below requirement", () => {
    expect(isPieceLocked("wall", "wood", 4)).toBe(true);
  });

  it("returns false when player is well above requirement", () => {
    expect(isPieceLocked("wall", "wood", 20)).toBe(false);
  });

  it("locks metal pieces until level 15", () => {
    expect(isPieceLocked("wall", "metal", 14)).toBe(true);
    expect(isPieceLocked("wall", "metal", 15)).toBe(false);
  });

  it("locks late-unlock pieces like pipe at level 15", () => {
    expect(isPieceLocked("pipe", "metal", 14)).toBe(true);
    expect(isPieceLocked("pipe", "metal", 15)).toBe(false);
  });

  it("locks stone material until level 10", () => {
    expect(isPieceLocked("floor", "stone", 9)).toBe(true);
    expect(isPieceLocked("floor", "stone", 10)).toBe(false);
  });

  // Tier 3: reinforced (L16+)
  it("locks reinforced material until level 16 (Tier 3)", () => {
    expect(isPieceLocked("wall", "reinforced", 15)).toBe(true);
    expect(isPieceLocked("wall", "reinforced", 16)).toBe(false);
  });

  it("locks all piece types with reinforced material until L16", () => {
    expect(isPieceLocked("roof", "reinforced", 15)).toBe(true);
    expect(isPieceLocked("foundation", "reinforced", 16)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getTier (Spec §35.2)
// ---------------------------------------------------------------------------

describe("getTier (Spec §35.2)", () => {
  it("returns 1 for level 1 (Tier 1: wood pieces)", () => {
    expect(getTier(1)).toBe(1);
  });

  it("returns 1 for level 5 (Tier 1 upper bound)", () => {
    expect(getTier(5)).toBe(1);
  });

  it("returns 2 for level 6 (Tier 2: stone/metal pieces)", () => {
    expect(getTier(6)).toBe(2);
  });

  it("returns 2 for level 15 (Tier 2 upper bound)", () => {
    expect(getTier(15)).toBe(2);
  });

  it("returns 3 for level 16 (Tier 3: advanced reinforced pieces)", () => {
    expect(getTier(16)).toBe(3);
  });

  it("returns 3 for high level (Tier 3)", () => {
    expect(getTier(30)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Tier 3 build costs (Spec §35.4)
// ---------------------------------------------------------------------------

describe("getBuildCost Tier 3 reinforced (Spec §35.4)", () => {
  it("returns stone + metal_scrap cost for wall+reinforced", () => {
    const cost = getBuildCost("wall", "reinforced");
    expect(cost).toHaveProperty("stone");
    expect(cost).toHaveProperty("metal_scrap");
  });

  it("returns metal_scrap cost for pipe+reinforced", () => {
    const cost = getBuildCost("pipe", "reinforced");
    expect(cost).toHaveProperty("metal_scrap");
  });
});
