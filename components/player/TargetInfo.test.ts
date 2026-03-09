/**
 * Tests for TargetInfo — entity name and action prompt display (Spec §11).
 *
 * Tests pure functions resolveEntityName and resolveActionPrompt directly.
 * The TargetInfo component itself is smoke-tested (requires RN rendering context).
 */

jest.mock("@/game/hooks/useRaycast", () => ({
  useTargetHit: jest.fn().mockReturnValue(null),
  _setHit: jest.fn(),
}));

jest.mock("@/game/stores", () => ({
  useGameStore: jest.fn().mockReturnValue("axe"),
}));

jest.mock("@/game/config/species", () => ({
  getSpeciesById: jest.fn((id: string) => {
    if (id === "oak") return { id: "oak", name: "Oak Tree" };
    if (id === "pine") return { id: "pine", name: "Pine Tree" };
    return undefined;
  }),
}));

import type { Entity } from "@/game/ecs/world";
import type { RaycastHit } from "@/game/hooks/useRaycast";
import { resolveActionPrompt, resolveEntityName, TargetInfo } from "./TargetInfo.tsx";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeHit(
  entityType: "tree" | "npc" | "structure",
  entityFields: Partial<Entity>,
): RaycastHit {
  return {
    entity: entityFields as Entity,
    entityType,
    distance: 3,
    point: { x: 0, y: 0, z: 0 } as unknown as import("three").Vector3,
  };
}

// ── resolveEntityName ─────────────────────────────────────────────────────────

describe("resolveEntityName (Spec §11)", () => {
  it("returns species name for a tree with known speciesId", () => {
    const hit = makeHit("tree", { tree: { speciesId: "oak" } } as Partial<Entity>);
    expect(resolveEntityName(hit)).toBe("Oak Tree");
  });

  it("returns 'Tree' fallback when speciesId is not found in config", () => {
    const hit = makeHit("tree", { tree: { speciesId: "unknown-species" } } as Partial<Entity>);
    expect(resolveEntityName(hit)).toBe("Tree");
  });

  it("returns 'Tree' fallback when tree component is absent", () => {
    const hit = makeHit("tree", {});
    expect(resolveEntityName(hit)).toBe("Tree");
  });

  it("returns npc name from NpcComponent", () => {
    const hit = makeHit("npc", { npc: { name: "Merchant Ros" } } as Partial<Entity>);
    expect(resolveEntityName(hit)).toBe("Merchant Ros");
  });

  it("returns 'Stranger' when npc component is absent", () => {
    const hit = makeHit("npc", {});
    expect(resolveEntityName(hit)).toBe("Stranger");
  });

  it("converts templateId kebab-case to Title Case for structures", () => {
    const hit = makeHit("structure", {
      structure: { templateId: "compost-bin" },
    } as Partial<Entity>);
    expect(resolveEntityName(hit)).toBe("Compost Bin");
  });

  it("title-cases a single-word templateId", () => {
    const hit = makeHit("structure", {
      structure: { templateId: "campfire" },
    } as Partial<Entity>);
    expect(resolveEntityName(hit)).toBe("Campfire");
  });

  it("returns 'Structure' fallback when structure component is absent", () => {
    const hit = makeHit("structure", {});
    expect(resolveEntityName(hit)).toBe("Structure");
  });
});

// ── resolveActionPrompt ───────────────────────────────────────────────────────

describe("resolveActionPrompt (Spec §11)", () => {
  const treeHit = makeHit("tree", {});
  const npcHit = makeHit("npc", {});
  const structureHit = makeHit("structure", {});

  it("returns 'E to Harvest' for tree + axe", () => {
    expect(resolveActionPrompt(treeHit, "axe")).toBe("E to Harvest");
  });

  it("returns 'E to Water' for tree + watering-can", () => {
    expect(resolveActionPrompt(treeHit, "watering-can")).toBe("E to Water");
  });

  it("returns 'E to Prune' for tree + pruning-shears", () => {
    expect(resolveActionPrompt(treeHit, "pruning-shears")).toBe("E to Prune");
  });

  it("returns 'E to Fertilize' for tree + compost-bin", () => {
    expect(resolveActionPrompt(treeHit, "compost-bin")).toBe("E to Fertilize");
  });

  it("returns 'E to Dig' for tree + shovel", () => {
    expect(resolveActionPrompt(treeHit, "shovel")).toBe("E to Dig");
  });

  it("returns 'E to Interact' for tree + unrecognised tool", () => {
    expect(resolveActionPrompt(treeHit, "almanac")).toBe("E to Interact");
  });

  it("returns 'E to Talk' for any npc regardless of tool", () => {
    expect(resolveActionPrompt(npcHit, "axe")).toBe("E to Talk");
    expect(resolveActionPrompt(npcHit, "watering-can")).toBe("E to Talk");
  });

  it("returns 'E to Use' for any structure regardless of tool", () => {
    expect(resolveActionPrompt(structureHit, "axe")).toBe("E to Use");
    expect(resolveActionPrompt(structureHit, "trowel")).toBe("E to Use");
  });
});

// ── TargetInfo component ──────────────────────────────────────────────────────

describe("TargetInfo (Spec §11)", () => {
  it("exports TargetInfo as a function", () => {
    expect(typeof TargetInfo).toBe("function");
  });
});
