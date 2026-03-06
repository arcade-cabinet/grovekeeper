import { NpcBrain, type NpcBrainContext } from "@/game/ai/NpcBrain";

// Mock npcMovement module
jest.mock("@/game/systems/npcMovement", () => {
  let movingSet = new Set<string>();
  let startResult = true;
  return {
    isNpcMoving: (entityId: string) => movingSet.has(entityId),
    startNpcPath: (
      entityId: string,
      _sx: number,
      _sz: number,
      _tx: number,
      _tz: number,
      _grid: unknown,
    ) => {
      if (startResult) movingSet.add(entityId);
      return startResult;
    },
    cancelNpcMovement: (entityId: string) => {
      movingSet.delete(entityId);
    },
    __setMoving: (entityId: string, moving: boolean) => {
      if (moving) movingSet.add(entityId);
      else movingSet.delete(entityId);
    },
    __setStartResult: (result: boolean) => {
      startResult = result;
    },
    __reset: () => {
      movingSet = new Set();
      startResult = true;
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const npcMovementMock = require("@/game/systems/npcMovement") as {
  isNpcMoving: (id: string) => boolean;
  startNpcPath: (...args: unknown[]) => boolean;
  cancelNpcMovement: (id: string) => void;
  __setMoving: (id: string, moving: boolean) => void;
  __setStartResult: (result: boolean) => void;
  __reset: () => void;
};

function makeCtx(overrides: Partial<NpcBrainContext> = {}): NpcBrainContext {
  return {
    grid: {
      width: 16,
      height: 16,
      cells: [],
    } as unknown as NpcBrainContext["grid"],
    playerX: 10,
    playerZ: 10,
    npcX: 5,
    npcZ: 5,
    homeX: 5,
    homeZ: 5,
    distToPlayer: 7,
    ...overrides,
  };
}

describe("NpcBrain", () => {
  beforeEach(() => {
    npcMovementMock.__reset();
  });

  describe("construction", () => {
    it("creates a brain with correct entity and template IDs", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      expect(brain.entityId).toBe("npc-1");
      expect(brain.templateId).toBe("elder-rowan");
    });

    it("starts in idle behavior", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      expect(brain.getBehavior()).toBe("idle");
    });

    it("exposes homePosition", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 3, 7);
      expect(brain.homePosition).toEqual({ x: 3, z: 7 });
    });
  });

  describe("update behavior states", () => {
    it("stays idle when player is far away and NPC is at home", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      npcMovementMock.__setStartResult(false);
      const behavior = brain.update(
        0.016,
        makeCtx({ distToPlayer: 20, npcX: 5, npcZ: 5, homeX: 5, homeZ: 5 }),
      );
      expect(behavior).toBe("idle");
    });

    it("approaches when player is within notice range", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      // Force wander timer to 0 by advancing time
      // Set dist to within approach range (<=3)
      const ctx = makeCtx({
        distToPlayer: 2.5,
        playerX: 7,
        playerZ: 5,
        npcX: 5,
        npcZ: 5,
      });
      npcMovementMock.__setStartResult(true);
      const behavior = brain.update(100, ctx);
      expect(behavior).toBe("approaching");
    });

    it("returns idle when already adjacent to player", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      const ctx = makeCtx({
        distToPlayer: 1.0,
        playerX: 6,
        playerZ: 5,
        npcX: 5,
        npcZ: 5,
      });
      const behavior = brain.update(100, ctx);
      // Adjacent range <= 1.5 means approach evaluator returns 0
      // So idle or wander should win
      expect(["idle", "wandering"]).toContain(behavior);
    });

    it("returns home when player is far and NPC is far from home", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      npcMovementMock.__setStartResult(true);
      const ctx = makeCtx({
        distToPlayer: 20,
        npcX: 12,
        npcZ: 12,
        homeX: 5,
        homeZ: 5,
      });
      const behavior = brain.update(100, ctx);
      expect(behavior).toBe("returning");
    });

    it("keeps current behavior while NPC is moving", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      npcMovementMock.__setStartResult(true);

      // First, trigger approach to start movement
      brain.update(100, makeCtx({ distToPlayer: 2.5, playerX: 7, playerZ: 5 }));
      expect(brain.getBehavior()).toBe("approaching");

      // NPC is still moving, update should keep the behavior
      const behavior = brain.update(
        0.016,
        makeCtx({ distToPlayer: 2.0, playerX: 7, playerZ: 5 }),
      );
      expect(behavior).toBe("approaching");
    });
  });

  describe("tutorial override", () => {
    it("sets behavior to tutorial_guide", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      brain.setTutorialTarget(10, 10);
      expect(brain.getBehavior()).toBe("tutorial_guide");
    });

    it("overrides normal AI during update", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      npcMovementMock.__setStartResult(true);
      brain.setTutorialTarget(10, 10);
      const behavior = brain.update(
        0.016,
        makeCtx({ distToPlayer: 2.5, npcX: 5, npcZ: 5 }),
      );
      expect(behavior).toBe("tutorial_guide");
    });

    it("calls onArrival callback when path cannot start", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      npcMovementMock.__setStartResult(false);
      const onArrival = jest.fn();
      brain.setTutorialTarget(10, 10, onArrival);
      brain.update(0.016, makeCtx({ npcX: 5, npcZ: 5 }));
      expect(onArrival).toHaveBeenCalled();
      expect(brain.getBehavior()).toBe("idle");
    });

    it("clearTutorialTarget returns to idle", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      brain.setTutorialTarget(10, 10);
      brain.clearTutorialTarget();
      expect(brain.getBehavior()).toBe("idle");
    });
  });

  describe("dispose", () => {
    it("resets behavior to idle", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      brain.setTutorialTarget(10, 10);
      brain.dispose();
      expect(brain.getBehavior()).toBe("idle");
    });

    it("clears tutorial override", () => {
      const brain = new NpcBrain("npc-1", "elder-rowan", 5, 5);
      brain.setTutorialTarget(10, 10);
      brain.dispose();
      // After dispose, update should use normal AI, not tutorial
      npcMovementMock.__setStartResult(false);
      const behavior = brain.update(0.016, makeCtx());
      expect(behavior).toBe("idle");
    });
  });
});
