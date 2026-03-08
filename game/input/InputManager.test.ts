/**
 * InputManager tests (Spec §23)
 *
 * Tests the InputFrame interface and InputManager singleton.
 * Follows the architecture spec: game code reads an InputFrame per tick,
 * never raw events.
 */

import { type IInputProvider, type InputFrame, InputManager } from "@/game/input/InputManager";

describe("InputFrame (Spec §23)", () => {
  it("getFrame returns an object with all required fields", () => {
    const manager = new InputManager();
    const frame = manager.getFrame();

    const requiredFields: (keyof InputFrame)[] = [
      "moveX",
      "moveZ",
      "lookDeltaX",
      "lookDeltaY",
      "jump",
      "interact",
      "toolSwap",
      "toolSelect",
      "sprint",
    ];

    for (const field of requiredFields) {
      expect(frame).toHaveProperty(field);
    }
  });

  it("getFrame returns zeroed/falsy initial values before first poll", () => {
    const manager = new InputManager();
    const frame = manager.getFrame();

    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
    expect(frame.lookDeltaX).toBe(0);
    expect(frame.lookDeltaY).toBe(0);
    expect(frame.jump).toBe(false);
    expect(frame.interact).toBe(false);
    expect(frame.toolSwap).toBe(0);
    expect(frame.toolSelect).toBe(0);
    expect(frame.sprint).toBe(false);
  });
});

describe("InputManager (Spec §23)", () => {
  it("poll with no providers returns zeroed frame", () => {
    const manager = new InputManager();
    const frame = manager.poll(1 / 60);

    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
    expect(frame.lookDeltaX).toBe(0);
    expect(frame.lookDeltaY).toBe(0);
    expect(frame.jump).toBe(false);
    expect(frame.interact).toBe(false);
    expect(frame.toolSwap).toBe(0);
    expect(frame.toolSelect).toBe(0);
    expect(frame.sprint).toBe(false);
  });

  it("getFrame returns the result of the last poll", () => {
    const manager = new InputManager();

    const provider: IInputProvider = {
      type: "test",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ moveX: 0.5, moveZ: 0.5, sprint: true }),
      postFrame: () => {},
      dispose: () => {},
    };

    manager.register(provider);
    manager.poll(1 / 60);

    const frame = manager.getFrame();
    expect(frame.sprint).toBe(true);
  });

  it("merges movement from multiple providers by summing", () => {
    const manager = new InputManager();

    const providerA: IInputProvider = {
      type: "a",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ moveX: 0.5, moveZ: 0 }),
      postFrame: () => {},
      dispose: () => {},
    };

    const providerB: IInputProvider = {
      type: "b",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ moveX: 0.5, moveZ: 0 }),
      postFrame: () => {},
      dispose: () => {},
    };

    manager.register(providerA);
    manager.register(providerB);

    const frame = manager.poll(1 / 60);
    // Summed movement is clamped to unit circle magnitude -- result should be 1.0 not 0.5+0.5=1.0 (already unit length)
    expect(frame.moveX).toBeCloseTo(1.0);
  });

  it("clamps movement to unit circle when sum exceeds magnitude 1", () => {
    const manager = new InputManager();

    const provider: IInputProvider = {
      type: "test",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ moveX: 1, moveZ: 1 }),
      postFrame: () => {},
      dispose: () => {},
    };

    manager.register(provider);
    const frame = manager.poll(1 / 60);

    const magnitude = Math.sqrt(frame.moveX ** 2 + frame.moveZ ** 2);
    expect(magnitude).toBeCloseTo(1.0);
  });

  it("merges booleans with OR across providers", () => {
    const manager = new InputManager();

    const providerA: IInputProvider = {
      type: "a",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ jump: false, interact: false }),
      postFrame: () => {},
      dispose: () => {},
    };

    const providerB: IInputProvider = {
      type: "b",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ jump: true }),
      postFrame: () => {},
      dispose: () => {},
    };

    manager.register(providerA);
    manager.register(providerB);

    const frame = manager.poll(1 / 60);
    expect(frame.jump).toBe(true);
    expect(frame.interact).toBe(false);
  });

  it("toolSwap: first non-zero value wins", () => {
    const manager = new InputManager();

    const providerA: IInputProvider = {
      type: "a",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ toolSwap: 1 }),
      postFrame: () => {},
      dispose: () => {},
    };

    const providerB: IInputProvider = {
      type: "b",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ toolSwap: -1 }),
      postFrame: () => {},
      dispose: () => {},
    };

    manager.register(providerA);
    manager.register(providerB);

    const frame = manager.poll(1 / 60);
    expect(frame.toolSwap).toBe(1); // providerA registered first
  });

  it("skips disabled providers", () => {
    const manager = new InputManager();

    const provider: IInputProvider = {
      type: "test",
      enabled: false,
      isAvailable: () => true,
      poll: () => ({ sprint: true, jump: true }),
      postFrame: () => {},
      dispose: () => {},
    };

    manager.register(provider);
    const frame = manager.poll(1 / 60);
    expect(frame.sprint).toBe(false);
    expect(frame.jump).toBe(false);
  });

  it("unregister removes a provider from polling", () => {
    const manager = new InputManager();

    const provider: IInputProvider = {
      type: "test",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ interact: true }),
      postFrame: () => {},
      dispose: () => {},
    };

    manager.register(provider);
    manager.unregister(provider);

    const frame = manager.poll(1 / 60);
    expect(frame.interact).toBe(false);
  });
});
