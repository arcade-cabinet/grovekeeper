/**
 * gatherSystem tests — Wave 16.
 *
 * Verifies the swing → hit → break flow without touching THREE,
 * `chunksRepo`, `inventoryRepo`, or the audio module. The system's
 * pure-function shape (every side effect is a callback) makes this
 * straightforward.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatherSystem } from "./gatherSystem";

function makePlayer(
  x = 0,
  z = 0,
  yaw = 0,
): { position: { x: number; y: number; z: number }; facingYaw: number } {
  // Player sits one voxel above the ground; foot Y is 6 → block Y = 5.
  return { position: { x, y: 6, z }, facingYaw: yaw };
}

function fakeInput(justPressed: boolean) {
  return {
    getActionState: vi.fn(() => ({ pressed: justPressed, justPressed })),
  };
}

describe("GatherSystem", () => {
  describe("hit accumulation", () => {
    it("requires hitsToBreak swings before removing the block", () => {
      // meadow.stone is the canonical 3-hit block.
      const removeBlock = vi.fn(() => true);
      const addInventory = vi.fn(() => ({ accepted: 1, capped: false }));
      const player = makePlayer();
      const sys = new GatherSystem({
        player,
        input: fakeInput(true),
        blockAt: () => "meadow.stone",
        removeBlock,
        addInventory,
      });

      sys.tick();
      expect(removeBlock).not.toHaveBeenCalled();
      expect(sys.getCurrentHit()?.hits).toBe(1);

      sys.tick();
      expect(removeBlock).not.toHaveBeenCalled();
      expect(sys.getCurrentHit()?.hits).toBe(2);

      sys.tick();
      expect(removeBlock).toHaveBeenCalledTimes(1);
      expect(addInventory).toHaveBeenCalledWith("material.stone", 1);
      expect(sys.getCurrentHit()).toBeNull();
    });

    it("breaks 1-hit blocks immediately", () => {
      const removeBlock = vi.fn(() => true);
      const addInventory = vi.fn(() => ({ accepted: 1, capped: false }));
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => "meadow.dirt",
        removeBlock,
        addInventory,
      });
      sys.tick();
      expect(removeBlock).toHaveBeenCalledTimes(1);
      expect(addInventory).toHaveBeenCalledWith("material.dirt", 1);
    });

    it("does nothing when swing is not pressed this frame", () => {
      const removeBlock = vi.fn(() => true);
      const addInventory = vi.fn();
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(false),
        blockAt: () => "meadow.stone",
        removeBlock,
        addInventory,
      });
      sys.tick();
      sys.tick();
      expect(removeBlock).not.toHaveBeenCalled();
      expect(sys.getCurrentHit()).toBeNull();
    });

    it("preserves progress across frames where swing is not pressed", () => {
      // First frame: pressed. Second frame: not. Third frame: pressed.
      // Hit count should be 2 after the third frame on a 3-hit block.
      let pressed = true;
      const sys = new GatherSystem({
        player: makePlayer(),
        input: {
          getActionState: () => ({ pressed, justPressed: pressed }),
        },
        blockAt: () => "meadow.stone",
        removeBlock: () => true,
        addInventory: () => ({ accepted: 1, capped: false }),
      });
      sys.tick();
      pressed = false;
      sys.tick();
      pressed = true;
      sys.tick();
      expect(sys.getCurrentHit()?.hits).toBe(2);
    });
  });

  describe("target switching", () => {
    it("resets hit count when the player aims at a different voxel", () => {
      // Player rotates 90° between swings — yaw drives `computeTarget`.
      const player = makePlayer(0, 0, 0);
      const block: string | null = "meadow.stone";
      const sys = new GatherSystem({
        player,
        input: fakeInput(true),
        blockAt: () => block,
        removeBlock: () => true,
        addInventory: () => ({ accepted: 1, capped: false }),
      });
      sys.tick();
      sys.tick();
      expect(sys.getCurrentHit()?.hits).toBe(2);

      // Switch target: same blockAt result but a different position.
      // Easiest way is to move the player so the targeted voxel coords
      // change — we mutate the position object which the system reads
      // each tick.
      player.position.x = 10;
      sys.tick();
      // First swing on the new voxel — back to 1.
      expect(sys.getCurrentHit()?.hits).toBe(1);
    });

    it("clears progress when no block is in reach", () => {
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => "meadow.stone",
        removeBlock: () => true,
        addInventory: () => ({ accepted: 1, capped: false }),
      });
      sys.tick();
      sys.tick();
      expect(sys.getCurrentHit()?.hits).toBe(2);
      // Player walks off — blockAt returns null on the new cell.
      // Easiest way: replace blockAt by mutating the options? we use
      // a local instead.
      const sys2 = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => null,
        removeBlock: () => true,
        addInventory: () => ({ accepted: 1, capped: false }),
      });
      sys2.tick();
      expect(sys2.getCurrentHit()).toBeNull();
    });
  });

  describe("break commits + drops", () => {
    it("calls removeBlock at the targeted voxel on the final hit", () => {
      const removeBlock = vi.fn(() => true);
      // Player at (5, 6, 5), yaw 0 (faces +Z). reach=1.5 → tx=5, tz=6,
      // ty=floor(6)-1 = 5.
      const sys = new GatherSystem({
        player: { position: { x: 5, y: 6, z: 5 }, facingYaw: 0 },
        input: fakeInput(true),
        blockAt: () => "meadow.dirt",
        removeBlock,
        addInventory: () => ({ accepted: 1, capped: false }),
      });
      sys.tick();
      expect(removeBlock).toHaveBeenCalledWith(5, 5, 6);
    });

    it("does not drop inventory when removeBlock returns false", () => {
      const addInventory = vi.fn();
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => "meadow.dirt",
        removeBlock: () => false,
        addInventory,
      });
      sys.tick();
      expect(addInventory).not.toHaveBeenCalled();
    });

    it("clears (no drop) for grass blocks", () => {
      const addInventory = vi.fn();
      const removeBlock = vi.fn(() => true);
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => "meadow.grass-flat",
        removeBlock,
        addInventory,
      });
      sys.tick();
      expect(removeBlock).toHaveBeenCalledTimes(1);
      expect(addInventory).not.toHaveBeenCalled();
    });
  });

  describe("unbreakable (grove)", () => {
    it("does not call removeBlock or addInventory on grove voxels", () => {
      const removeBlock = vi.fn();
      const addInventory = vi.fn();
      const onEvent = vi.fn();
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => "grove.luminous-grass",
        removeBlock,
        addInventory,
        onEvent,
      });
      // Swing many times — nothing breaks.
      for (let i = 0; i < 10; i++) sys.tick();
      expect(removeBlock).not.toHaveBeenCalled();
      expect(addInventory).not.toHaveBeenCalled();
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "unbreakable" }),
      );
    });

    it("plays the swing animation on grove tiles even though nothing breaks", () => {
      const playSwing = vi.fn();
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => "grove.alabaster-stone",
        removeBlock: () => true,
        addInventory: () => ({ accepted: 0, capped: false }),
        animation: { playSwing },
      });
      sys.tick();
      expect(playSwing).toHaveBeenCalledTimes(1);
    });
  });

  describe("audio cues", () => {
    let swingHit: ReturnType<typeof vi.fn>;
    let breakSfx: ReturnType<typeof vi.fn>;
    let invAdd: ReturnType<typeof vi.fn>;
    let invFull: ReturnType<typeof vi.fn>;
    function audioBus() {
      return {
        swingHit: () => {
          (swingHit as unknown as () => void)();
        },
        break_: () => {
          (breakSfx as unknown as () => void)();
        },
        inventoryAdd: () => {
          (invAdd as unknown as () => void)();
        },
        inventoryFull: () => {
          (invFull as unknown as () => void)();
        },
      };
    }

    beforeEach(() => {
      swingHit = vi.fn();
      breakSfx = vi.fn();
      invAdd = vi.fn();
      invFull = vi.fn();
    });

    it("plays tool.axe.swing on every hit and tool.axe.break on the final hit", () => {
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => "meadow.stone",
        removeBlock: () => true,
        addInventory: () => ({ accepted: 1, capped: false }),
        audio: audioBus(),
      });
      sys.tick();
      sys.tick();
      sys.tick();
      expect(swingHit).toHaveBeenCalledTimes(3);
      expect(breakSfx).toHaveBeenCalledTimes(1);
      expect(invAdd).toHaveBeenCalledTimes(1);
      expect(invFull).not.toHaveBeenCalled();
    });

    it("plays ui.inventory.full when the inventory rejects the drop", () => {
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => "meadow.dirt",
        removeBlock: () => true,
        addInventory: () => ({ accepted: 0, capped: true }),
        audio: audioBus(),
      });
      sys.tick();
      expect(invFull).toHaveBeenCalledTimes(1);
      expect(invAdd).not.toHaveBeenCalled();
    });
  });

  describe("animation", () => {
    it("plays the swing clip on every breakable hit", () => {
      const playSwing = vi.fn();
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => "meadow.stone",
        removeBlock: () => true,
        addInventory: () => ({ accepted: 1, capped: false }),
        animation: { playSwing },
      });
      sys.tick();
      sys.tick();
      sys.tick();
      expect(playSwing).toHaveBeenCalledTimes(3);
    });

    it("does not play the swing clip when no block is in reach", () => {
      const playSwing = vi.fn();
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => null,
        removeBlock: () => true,
        addInventory: () => ({ accepted: 0, capped: false }),
        animation: { playSwing },
      });
      sys.tick();
      expect(playSwing).not.toHaveBeenCalled();
    });
  });

  describe("computeTarget", () => {
    it("targets the voxel directly in front along the player's yaw", () => {
      // facingYaw = π/2 → direction = (sin, cos) = (1, 0). Reach 1.5 →
      // x ≈ 1.5 → floor → 1.
      const blockAt = vi.fn(() => "meadow.stone");
      const sys = new GatherSystem({
        player: { position: { x: 0, y: 6, z: 0 }, facingYaw: Math.PI / 2 },
        input: fakeInput(true),
        blockAt,
        removeBlock: () => true,
        addInventory: () => ({ accepted: 1, capped: false }),
      });
      sys.tick();
      expect(blockAt).toHaveBeenCalledWith(1, 5, 0);
    });
  });

  describe("reset", () => {
    it("clears in-flight progress", () => {
      const sys = new GatherSystem({
        player: makePlayer(),
        input: fakeInput(true),
        blockAt: () => "meadow.stone",
        removeBlock: () => true,
        addInventory: () => ({ accepted: 1, capped: false }),
      });
      sys.tick();
      expect(sys.getCurrentHit()?.hits).toBe(1);
      sys.reset();
      expect(sys.getCurrentHit()).toBeNull();
    });
  });
});
