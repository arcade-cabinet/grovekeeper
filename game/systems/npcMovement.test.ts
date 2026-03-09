import { GameEntity } from "yuka";
import {
  cancelAllNpcMovements,
  cancelNpcMovement,
  deregisterNpcEntity,
  isNpcMoving,
  registerNpcEntity,
  startNpcPath,
  updateNpcEntityManager,
  updateNpcMovement,
} from "./npcMovement.ts";
import type { WalkabilityGrid } from "./pathfinding.ts";

// Helper to create a simple open walkability grid
function makeOpenGrid(size: number, originX = 0, originZ = 0): WalkabilityGrid {
  const data = new Uint8Array(size * size); // all zeros = walkable
  return { data, width: size, height: size, originX, originZ };
}

function makeBlockedGrid(size: number): WalkabilityGrid {
  const data = new Uint8Array(size * size);
  data.fill(1); // all blocked
  return { data, width: size, height: size, originX: 0, originZ: 0 };
}

// Reset module state between tests
beforeEach(() => {
  cancelAllNpcMovements();
});

describe("startNpcPath", () => {
  it("returns true when a valid path exists", () => {
    const grid = makeOpenGrid(5);
    const result = startNpcPath("npc-1", 0, 0, 3, 3, grid);
    expect(result).toBe(true);
  });

  it("returns false when no path exists (all blocked)", () => {
    const grid = makeBlockedGrid(5);
    const result = startNpcPath("npc-2", 0, 0, 3, 3, grid);
    expect(result).toBe(false);
  });

  it("sets NPC as moving after successful path start", () => {
    const grid = makeOpenGrid(5);
    startNpcPath("npc-3", 0, 0, 3, 0, grid);
    expect(isNpcMoving("npc-3")).toBe(true);
  });

  it("clears previous path state on failed pathfind", () => {
    const grid = makeOpenGrid(5);
    startNpcPath("npc-4", 0, 0, 3, 0, grid);
    expect(isNpcMoving("npc-4")).toBe(true);

    const blockedGrid = makeBlockedGrid(5);
    startNpcPath("npc-4", 0, 0, 3, 0, blockedGrid);
    expect(isNpcMoving("npc-4")).toBe(false);
  });

  it("rounds start and goal coordinates", () => {
    const grid = makeOpenGrid(5);
    // Fractional coords should be rounded to nearest integer
    const result = startNpcPath("npc-5", 0.4, 0.6, 2.7, 2.3, grid);
    expect(result).toBe(true);
    expect(isNpcMoving("npc-5")).toBe(true);
  });
});

describe("updateNpcMovement", () => {
  it("returns done:true for unknown entity", () => {
    const result = updateNpcMovement("unknown-npc", 0, 0, 0.016);
    expect(result.done).toBe(true);
    expect(result.x).toBe(0);
    expect(result.z).toBe(0);
  });

  it("moves NPC toward target", () => {
    const grid = makeOpenGrid(10);
    startNpcPath("npc-move", 0, 0, 5, 0, grid);
    const result = updateNpcMovement("npc-move", 0, 0, 0.5);
    // Should have moved in x direction
    expect(result.x).toBeGreaterThan(0);
    expect(result.done).toBe(false);
  });

  it("cleans up state when path is done", () => {
    const grid = makeOpenGrid(3);
    startNpcPath("npc-done", 0, 0, 1, 0, grid);
    // Move NPC to exactly the target
    const result = updateNpcMovement("npc-done", 1, 0, 1);
    expect(result.done).toBe(true);
    expect(isNpcMoving("npc-done")).toBe(false);
  });
});

describe("isNpcMoving", () => {
  it("returns false for unknown entity", () => {
    expect(isNpcMoving("ghost")).toBe(false);
  });

  it("returns true for active NPC", () => {
    const grid = makeOpenGrid(5);
    startNpcPath("npc-active", 0, 0, 3, 0, grid);
    expect(isNpcMoving("npc-active")).toBe(true);
  });

  it("returns false after cancel", () => {
    const grid = makeOpenGrid(5);
    startNpcPath("npc-cancel-check", 0, 0, 3, 0, grid);
    cancelNpcMovement("npc-cancel-check");
    expect(isNpcMoving("npc-cancel-check")).toBe(false);
  });
});

describe("cancelNpcMovement", () => {
  it("stops a moving NPC", () => {
    const grid = makeOpenGrid(5);
    startNpcPath("npc-cancel", 0, 0, 3, 0, grid);
    cancelNpcMovement("npc-cancel");
    expect(isNpcMoving("npc-cancel")).toBe(false);
  });

  it("is safe to call on non-existent NPC", () => {
    expect(() => cancelNpcMovement("non-existent")).not.toThrow();
  });
});

describe("cancelAllNpcMovements", () => {
  it("stops all moving NPCs", () => {
    const grid = makeOpenGrid(10);
    startNpcPath("npc-a", 0, 0, 5, 0, grid);
    startNpcPath("npc-b", 0, 0, 3, 3, grid);
    cancelAllNpcMovements();
    expect(isNpcMoving("npc-a")).toBe(false);
    expect(isNpcMoving("npc-b")).toBe(false);
  });

  it("is safe to call when no NPCs are moving", () => {
    expect(() => cancelAllNpcMovements()).not.toThrow();
  });

  it("deregisters all Yuka entities", () => {
    registerNpcEntity("npc-ent-a", new GameEntity());
    registerNpcEntity("npc-ent-b", new GameEntity());
    // cancelAllNpcMovements clears entities — subsequent deregister should be no-op
    cancelAllNpcMovements();
    expect(() => deregisterNpcEntity("npc-ent-a")).not.toThrow();
    expect(() => deregisterNpcEntity("npc-ent-b")).not.toThrow();
  });
});

// ── Yuka EntityManager ────────────────────────────────────────────────────────

describe("registerNpcEntity", () => {
  it("registers an entity without error", () => {
    const entity = new GameEntity();
    expect(() => registerNpcEntity("npc-reg", entity)).not.toThrow();
  });

  it("is idempotent — registering the same entityId twice does not throw", () => {
    const entity = new GameEntity();
    registerNpcEntity("npc-idem", entity);
    expect(() => registerNpcEntity("npc-idem", entity)).not.toThrow();
  });

  it("different entities for different IDs are both registered", () => {
    const e1 = new GameEntity();
    const e2 = new GameEntity();
    expect(() => {
      registerNpcEntity("npc-two-a", e1);
      registerNpcEntity("npc-two-b", e2);
    }).not.toThrow();
  });
});

describe("deregisterNpcEntity", () => {
  it("removes a previously registered entity without error", () => {
    const entity = new GameEntity();
    registerNpcEntity("npc-dereg", entity);
    expect(() => deregisterNpcEntity("npc-dereg")).not.toThrow();
  });

  it("is safe to call for an unknown entity ID", () => {
    expect(() => deregisterNpcEntity("ghost-entity")).not.toThrow();
  });

  it("is safe to call twice for the same entity", () => {
    const entity = new GameEntity();
    registerNpcEntity("npc-double-dereg", entity);
    deregisterNpcEntity("npc-double-dereg");
    expect(() => deregisterNpcEntity("npc-double-dereg")).not.toThrow();
  });
});

describe("updateNpcEntityManager", () => {
  it("does not throw when entities are registered", () => {
    registerNpcEntity("npc-upd", new GameEntity());
    expect(() => updateNpcEntityManager(0.016)).not.toThrow();
  });

  it("does not throw when no entities are registered", () => {
    expect(() => updateNpcEntityManager(0.016)).not.toThrow();
  });

  it("does not throw with large dt values", () => {
    registerNpcEntity("npc-bigdt", new GameEntity());
    expect(() => updateNpcEntityManager(10)).not.toThrow();
  });
});
