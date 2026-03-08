/**
 * Tests for radialActions -- tile-based and FPS entity-based action builders.
 *
 * All functions are pure (no React / RN imports) so this test file needs no
 * special mocks or jest-environment docblock.
 *
 * Spec §11 (Tools): Tab / long-press opens radial tool selector; actions are
 * context-sensitive to the targeted entity type and equipped tool.
 */

import { Vector3 } from "three";
import type { RaycastHit } from "@/game/hooks/useRaycast";
import { getActionsForEntity, getActionsForTile } from "./radialActions.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHit(
  entityType: "tree" | "npc" | "structure",
  entityFields: Record<string, unknown> = {},
): RaycastHit {
  return {
    entityType,
    entity: { id: "e1", ...entityFields } as never,
    distance: 2,
    point: new Vector3(0, 0, 0),
  };
}

// ---------------------------------------------------------------------------
// getActionsForEntity (Spec §11, §16 -- FPS entity context)
// ---------------------------------------------------------------------------

describe("getActionsForEntity (Spec §11)", () => {
  describe("NPC target", () => {
    it("returns talk and trade actions", () => {
      const actions = getActionsForEntity(makeHit("npc"), "trowel");
      const ids = actions.map((a) => a.id);
      expect(ids).toContain("talk");
      expect(ids).toContain("trade");
    });

    it("ignores the equipped tool for NPCs", () => {
      const withAxe = getActionsForEntity(makeHit("npc"), "axe");
      const withCan = getActionsForEntity(makeHit("npc"), "watering-can");
      expect(withAxe.map((a) => a.id)).toEqual(withCan.map((a) => a.id));
    });
  });

  describe("structure target", () => {
    it("returns use and inspect actions", () => {
      const actions = getActionsForEntity(makeHit("structure"), "trowel");
      const ids = actions.map((a) => a.id);
      expect(ids).toContain("use");
      expect(ids).toContain("inspect");
    });
  });

  describe("tree target", () => {
    it("returns harvest action when axe is equipped", () => {
      const actions = getActionsForEntity(makeHit("tree"), "axe");
      const ids = actions.map((a) => a.id);
      expect(ids).toContain("harvest");
    });

    it("returns water action when watering-can is equipped", () => {
      const actions = getActionsForEntity(makeHit("tree"), "watering-can");
      expect(actions.map((a) => a.id)).toContain("water");
    });

    it("returns prune action when pruning-shears is equipped", () => {
      const actions = getActionsForEntity(makeHit("tree"), "pruning-shears");
      expect(actions.map((a) => a.id)).toContain("prune");
    });

    it("returns fertilize action when compost-bin is equipped", () => {
      const actions = getActionsForEntity(makeHit("tree"), "compost-bin");
      expect(actions.map((a) => a.id)).toContain("fertilize");
    });

    it("returns dig-up action when shovel is equipped", () => {
      const actions = getActionsForEntity(makeHit("tree"), "shovel");
      expect(actions.map((a) => a.id)).toContain("dig-up");
    });

    it("always includes inspect alongside the tool action", () => {
      const actions = getActionsForEntity(makeHit("tree"), "axe");
      expect(actions.map((a) => a.id)).toContain("inspect");
    });

    it("falls back to harvest + inspect when no specific tool is equipped", () => {
      const actions = getActionsForEntity(makeHit("tree"), "trowel");
      const ids = actions.map((a) => a.id);
      expect(ids).toContain("harvest");
      expect(ids).toContain("inspect");
    });

    it("all returned actions have required fields", () => {
      const actions = getActionsForEntity(makeHit("tree"), "axe");
      for (const action of actions) {
        expect(typeof action.id).toBe("string");
        expect(typeof action.icon).toBe("string");
        expect(typeof action.label).toBe("string");
        expect(typeof action.color).toBe("string");
      }
    });
  });

  it("returns empty array for unknown entity type", () => {
    const hit = makeHit("tree");
    // Force an unexpected entityType at runtime
    (hit as { entityType: string }).entityType = "unknown";
    const actions = getActionsForEntity(hit as never, "axe");
    expect(actions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getActionsForTile (existing tile-based builder — regression guard)
// ---------------------------------------------------------------------------

describe("getActionsForTile (regression)", () => {
  it("returns talk for NPC tile", () => {
    const actions = getActionsForTile({
      cellType: "soil",
      occupied: false,
      treeStage: 0,
      treeWatered: false,
      hasNpc: true,
    });
    expect(actions[0].id).toBe("talk");
  });

  it("returns empty for path tile", () => {
    expect(
      getActionsForTile({
        cellType: "path",
        occupied: false,
        treeStage: 0,
        treeWatered: false,
        hasNpc: false,
      }),
    ).toHaveLength(0);
  });

  it("returns plant + inspect for empty soil", () => {
    const ids = getActionsForTile({
      cellType: "soil",
      occupied: false,
      treeStage: 0,
      treeWatered: false,
      hasNpc: false,
    }).map((a) => a.id);
    expect(ids).toContain("plant");
    expect(ids).toContain("inspect");
  });
});
