/**
 * @jest-environment jsdom
 */

/**
 * Tests for number key tool selection (Spec §11, §23).
 *
 * Pressing digit keys 1-9 should select the corresponding tool
 * from the player's unlocked tools list via the InputFrame.toolSelect field.
 */

import { KeyboardMouseProvider } from "@/game/input/KeyboardMouseProvider";

function keydown(code: string): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
}

function keyup(code: string): void {
  window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
}

describe("KeyboardMouseProvider number key tool selection (Spec §11, §23)", () => {
  let provider: KeyboardMouseProvider;

  beforeEach(() => {
    provider = new KeyboardMouseProvider();
  });

  afterEach(() => {
    provider.dispose();
  });

  it("Digit1 produces toolSelect = 1", () => {
    keydown("Digit1");
    const frame = provider.poll(1 / 60);
    expect(frame.toolSelect).toBe(1);
    keyup("Digit1");
  });

  it("Digit9 produces toolSelect = 9", () => {
    keydown("Digit9");
    const frame = provider.poll(1 / 60);
    expect(frame.toolSelect).toBe(9);
    keyup("Digit9");
  });

  it("Digit5 produces toolSelect = 5", () => {
    keydown("Digit5");
    const frame = provider.poll(1 / 60);
    expect(frame.toolSelect).toBe(5);
    keyup("Digit5");
  });

  it("no digit key produces toolSelect = 0 (no selection)", () => {
    const frame = provider.poll(1 / 60);
    expect(frame.toolSelect).toBe(0);
  });

  it("toolSelect is edge-triggered: resets to 0 after postFrame", () => {
    keydown("Digit3");
    provider.poll(1 / 60);
    provider.postFrame();

    const frame2 = provider.poll(1 / 60);
    expect(frame2.toolSelect).toBe(0);
    keyup("Digit3");
  });

  it("only the last digit key pressed in a frame wins", () => {
    keydown("Digit2");
    keydown("Digit7");
    const frame = provider.poll(1 / 60);
    expect(frame.toolSelect).toBe(7);
    keyup("Digit2");
    keyup("Digit7");
  });

  it("digit keys do not interfere with movement", () => {
    keydown("KeyW");
    keydown("Digit3");
    const frame = provider.poll(1 / 60);
    expect(frame.moveZ).toBe(1);
    expect(frame.toolSelect).toBe(3);
    keyup("KeyW");
    keyup("Digit3");
  });

  it("Digit0 does NOT produce a toolSelect (only 1-9)", () => {
    keydown("Digit0");
    const frame = provider.poll(1 / 60);
    expect(frame.toolSelect).toBe(0);
    keyup("Digit0");
  });
});
