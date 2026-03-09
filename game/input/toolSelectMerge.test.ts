/**
 * Tests for InputManager toolSelect merge behavior (Spec §23).
 *
 * toolSelect follows the same "first non-zero wins" rule as toolSwap.
 */

import { type IInputProvider, InputManager } from "@/game/input/InputManager";

describe("InputManager toolSelect merge (Spec §23)", () => {
  it("toolSelect defaults to 0 with no providers", () => {
    const manager = new InputManager();
    const frame = manager.poll(1 / 60);
    expect(frame.toolSelect).toBe(0);
  });

  it("toolSelect passes through from a single provider", () => {
    const manager = new InputManager();
    const provider: IInputProvider = {
      type: "test",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ toolSelect: 3 }),
      postFrame: () => {},
      dispose: () => {},
    };
    manager.register(provider);
    const frame = manager.poll(1 / 60);
    expect(frame.toolSelect).toBe(3);
  });

  it("toolSelect: first non-zero wins across providers", () => {
    const manager = new InputManager();
    const providerA: IInputProvider = {
      type: "a",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ toolSelect: 5 }),
      postFrame: () => {},
      dispose: () => {},
    };
    const providerB: IInputProvider = {
      type: "b",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ toolSelect: 2 }),
      postFrame: () => {},
      dispose: () => {},
    };
    manager.register(providerA);
    manager.register(providerB);
    const frame = manager.poll(1 / 60);
    expect(frame.toolSelect).toBe(5); // providerA registered first
  });

  it("toolSelect: provider with 0 is skipped, second provider wins", () => {
    const manager = new InputManager();
    const providerA: IInputProvider = {
      type: "a",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ toolSelect: 0 }),
      postFrame: () => {},
      dispose: () => {},
    };
    const providerB: IInputProvider = {
      type: "b",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ toolSelect: 7 }),
      postFrame: () => {},
      dispose: () => {},
    };
    manager.register(providerA);
    manager.register(providerB);
    const frame = manager.poll(1 / 60);
    expect(frame.toolSelect).toBe(7);
  });

  it("getFrame returns toolSelect from last poll", () => {
    const manager = new InputManager();
    const provider: IInputProvider = {
      type: "test",
      enabled: true,
      isAvailable: () => true,
      poll: () => ({ toolSelect: 4 }),
      postFrame: () => {},
      dispose: () => {},
    };
    manager.register(provider);
    manager.poll(1 / 60);
    expect(manager.getFrame().toolSelect).toBe(4);
  });
});
