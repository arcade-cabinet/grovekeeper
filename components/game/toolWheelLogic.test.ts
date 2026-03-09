/** @jest-environment jsdom */
/**
 * Tests for toolWheelLogic -- shouldToggleToolWheel (Spec §11).
 *
 * Tests the pure key-predicate function directly (no React / RN / jsdom needed).
 * The useToolWheelTabKey hook wires this predicate into document.addEventListener
 * and is smoke-tested by the integration in ToolWheel.tsx.
 */

import { shouldToggleToolWheel } from "./toolWheelLogic.ts";

// ---------------------------------------------------------------------------
// shouldToggleToolWheel (Spec §11)
// ---------------------------------------------------------------------------

describe("shouldToggleToolWheel (Spec §11)", () => {
  function makeEvent(
    key: string,
    target: EventTarget | null = null,
  ): Pick<KeyboardEvent, "key" | "target"> {
    return { key, target };
  }

  it("returns true for Tab key with no focused element", () => {
    expect(shouldToggleToolWheel(makeEvent("Tab"))).toBe(true);
  });

  it("returns false for non-Tab keys", () => {
    expect(shouldToggleToolWheel(makeEvent("w"))).toBe(false);
    expect(shouldToggleToolWheel(makeEvent("Escape"))).toBe(false);
    expect(shouldToggleToolWheel(makeEvent("Enter"))).toBe(false);
    expect(shouldToggleToolWheel(makeEvent(" "))).toBe(false);
  });

  it("returns false when focus is on an input element", () => {
    const input = document.createElement("input");
    expect(shouldToggleToolWheel(makeEvent("Tab", input))).toBe(false);
  });

  it("returns false when focus is on a textarea element", () => {
    const textarea = document.createElement("textarea");
    expect(shouldToggleToolWheel(makeEvent("Tab", textarea))).toBe(false);
  });

  it("returns true when focus is on a non-input element (e.g. div)", () => {
    const div = document.createElement("div");
    expect(shouldToggleToolWheel(makeEvent("Tab", div))).toBe(true);
  });

  it("returns true when target is null (no focused element)", () => {
    expect(shouldToggleToolWheel(makeEvent("Tab", null))).toBe(true);
  });
});
