/**
 * GatherSystem swing-gate tests — Wave 14/15.
 *
 * The gather system gained stamina + combat hooks in Wave 14/15.
 * These tests cover the new wiring without re-testing the full
 * voxel-break flow (Wave 16's territory).
 */

import { describe, expect, it, vi } from "vitest";
import { GatherSystem } from "./gatherSystem";

function fakeInput(justPressed: boolean) {
  return {
    getActionState: () => ({ pressed: justPressed, justPressed }),
  };
}

function noopOpts() {
  return {
    player: { position: { x: 0, y: 0, z: 0 }, facingYaw: 0 },
    blockAt: () => null,
    removeBlock: () => false,
    addInventory: () => ({ accepted: 0, capped: false }),
  };
}

describe("GatherSystem swing gate (Wave 14/15)", () => {
  it("suppresses swing when canSwing returns false", () => {
    const onSwing = vi.fn();
    const consumeSwingStamina = vi.fn();
    const animation = { playSwing: vi.fn() };
    const sys = new GatherSystem({
      ...noopOpts(),
      input: fakeInput(true),
      canSwing: () => false,
      onSwing,
      consumeSwingStamina,
      animation,
    });
    sys.tick();
    expect(onSwing).not.toHaveBeenCalled();
    expect(consumeSwingStamina).not.toHaveBeenCalled();
    expect(animation.playSwing).not.toHaveBeenCalled();
  });

  it("fires onSwing + consumeSwingStamina when canSwing returns true", () => {
    const onSwing = vi.fn();
    const consumeSwingStamina = vi.fn();
    const sys = new GatherSystem({
      ...noopOpts(),
      input: fakeInput(true),
      canSwing: () => true,
      onSwing,
      consumeSwingStamina,
    });
    sys.tick();
    expect(onSwing).toHaveBeenCalledTimes(1);
    expect(consumeSwingStamina).toHaveBeenCalledTimes(1);
  });

  it("does not call canSwing when swing is not pressed (cheap path)", () => {
    const canSwing = vi.fn(() => true);
    const sys = new GatherSystem({
      ...noopOpts(),
      input: fakeInput(false),
      canSwing,
    });
    sys.tick();
    expect(canSwing).not.toHaveBeenCalled();
  });

  it("default (no canSwing) allows the swing path through", () => {
    const onSwing = vi.fn();
    const sys = new GatherSystem({
      ...noopOpts(),
      input: fakeInput(true),
      onSwing,
    });
    sys.tick();
    expect(onSwing).toHaveBeenCalled();
  });
});
