/**
 * Context-aware mobile action button resolution tests (Spec §23).
 *
 * Tests the pure resolveContextAction function that maps
 * (raycast target type + selected tool) → action label.
 */

import type { RaycastEntityType } from "@/game/hooks/useRaycast";
import { type ContextAction, resolveContextAction } from "./contextActionLogic.ts";

// ─── Tree targets ────────────────────────────────────────────────────────────

describe("resolveContextAction — tree targets (Spec §23)", () => {
  it("returns CHOP when looking at tree with axe", () => {
    const action = resolveContextAction("tree", "axe");
    expect(action).toEqual<ContextAction>({ label: "CHOP", toolId: "axe", enabled: true });
  });

  it("returns WATER when looking at tree with watering-can", () => {
    const action = resolveContextAction("tree", "watering-can");
    expect(action).toEqual<ContextAction>({
      label: "WATER",
      toolId: "watering-can",
      enabled: true,
    });
  });

  it("returns PRUNE when looking at tree with pruning-shears", () => {
    const action = resolveContextAction("tree", "pruning-shears");
    expect(action).toEqual<ContextAction>({
      label: "PRUNE",
      toolId: "pruning-shears",
      enabled: true,
    });
  });

  it("returns CHOP as default for tree with non-tree tool", () => {
    const action = resolveContextAction("tree", "fishing-rod");
    expect(action.label).toBe("CHOP");
    expect(action.toolId).toBe("axe");
  });
});

// ─── NPC targets ─────────────────────────────────────────────────────────────

describe("resolveContextAction — NPC targets (Spec §23)", () => {
  it("returns TALK regardless of tool", () => {
    const action = resolveContextAction("npc", "axe");
    expect(action).toEqual<ContextAction>({ label: "TALK", toolId: null, enabled: true });
  });

  it("returns TALK with watering-can too", () => {
    const action = resolveContextAction("npc", "watering-can");
    expect(action.label).toBe("TALK");
    expect(action.toolId).toBeNull();
  });
});

// ─── Crop targets ────────────────────────────────────────────────────────────

describe("resolveContextAction — crop targets (Spec §23)", () => {
  it("returns HARVEST with axe", () => {
    const action = resolveContextAction("crop", "axe");
    expect(action).toEqual<ContextAction>({ label: "HARVEST", toolId: "axe", enabled: true });
  });

  it("returns WATER with watering-can", () => {
    const action = resolveContextAction("crop", "watering-can");
    expect(action).toEqual<ContextAction>({
      label: "WATER",
      toolId: "watering-can",
      enabled: true,
    });
  });

  it("returns HARVEST as default for crop with unrelated tool", () => {
    const action = resolveContextAction("crop", "fishing-rod");
    expect(action.label).toBe("HARVEST");
  });
});

// ─── Structure targets ───────────────────────────────────────────────────────

describe("resolveContextAction — structure targets (Spec §23)", () => {
  it("returns INTERACT as generic structure action", () => {
    const action = resolveContextAction("structure", "axe");
    expect(action.label).toBe("INTERACT");
    expect(action.enabled).toBe(true);
  });
});

// ─── Enemy targets ───────────────────────────────────────────────────────────

describe("resolveContextAction — enemy targets (Spec §23)", () => {
  it("returns ATTACK regardless of tool", () => {
    const action = resolveContextAction("enemy", "watering-can");
    expect(action).toEqual<ContextAction>({ label: "ATTACK", toolId: null, enabled: true });
  });

  it("returns ATTACK with axe", () => {
    const action = resolveContextAction("enemy", "axe");
    expect(action.label).toBe("ATTACK");
  });
});

// ─── No target ───────────────────────────────────────────────────────────────

describe("resolveContextAction — no target (Spec §23)", () => {
  it("returns disabled action when target is null", () => {
    const action = resolveContextAction(null, "axe");
    expect(action.enabled).toBe(false);
  });

  it("returns USE label for current tool when no target", () => {
    const action = resolveContextAction(null, "trowel");
    expect(action.label).toBe("USE");
    expect(action.toolId).toBe("trowel");
  });
});

// ─── All entity types covered ────────────────────────────────────────────────

describe("resolveContextAction — completeness", () => {
  const entityTypes: RaycastEntityType[] = ["tree", "npc", "structure", "enemy", "crop"];

  it("handles all RaycastEntityType values without throwing", () => {
    for (const type of entityTypes) {
      expect(() => resolveContextAction(type, "axe")).not.toThrow();
    }
  });

  it("always returns an object with label, toolId, and enabled", () => {
    for (const type of entityTypes) {
      const action = resolveContextAction(type, "axe");
      expect(action).toHaveProperty("label");
      expect(action).toHaveProperty("toolId");
      expect(action).toHaveProperty("enabled");
    }
  });
});
