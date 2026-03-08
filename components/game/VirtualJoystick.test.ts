/**
 * Tests for VirtualJoystick -> TouchProvider wiring helpers (Spec §23).
 *
 * Tests the pure computeJoystickZoneRect helper and the JoystickProvider
 * interface contract. The component itself is not rendered (JSX runtime
 * crash pattern — see codebase patterns in progress.md).
 *
 * Full InputFrame output is covered by TouchProvider.test.ts which exercises
 * onTouchStart / onTouchMove / onTouchEnd directly.
 */

import { computeJoystickZoneRect, type JoystickProvider } from "./joystickHandlers.ts";

describe("computeJoystickZoneRect (Spec §23)", () => {
  describe("zone origin computation", () => {
    it("computes left as pageX - locationX", () => {
      const rect = computeJoystickZoneRect(200, 400, 30, 50, 120);
      expect(rect.left).toBe(170); // 200 - 30
    });

    it("computes top as pageY - locationY", () => {
      const rect = computeJoystickZoneRect(200, 400, 30, 50, 120);
      expect(rect.top).toBe(350); // 400 - 50
    });

    it("uses baseSize for both width and height", () => {
      const rect = computeJoystickZoneRect(0, 0, 0, 0, 120);
      expect(rect.width).toBe(120);
      expect(rect.height).toBe(120);
    });

    it("respects a custom baseSize", () => {
      const rect = computeJoystickZoneRect(0, 0, 0, 0, 200);
      expect(rect.width).toBe(200);
      expect(rect.height).toBe(200);
    });
  });

  describe("center derivation matches TouchProvider expectation", () => {
    it("zone center = (pageX - locationX + baseSize/2, pageY - locationY + baseSize/2)", () => {
      const pageX = 300;
      const pageY = 600;
      const locationX = 40;
      const locationY = 20;
      const baseSize = 120;

      const rect = computeJoystickZoneRect(pageX, pageY, locationX, locationY, baseSize);

      // TouchProvider computes: center.x = rect.left + rect.width / 2
      const providerCenterX = rect.left + rect.width / 2;
      const providerCenterY = rect.top + rect.height / 2;

      // Should match what VirtualJoystick computes directly:
      const vJoyCenterX = pageX - locationX + baseSize / 2;
      const vJoyCenterY = pageY - locationY + baseSize / 2;

      expect(providerCenterX).toBe(vJoyCenterX);
      expect(providerCenterY).toBe(vJoyCenterY);
    });

    it("when touch is at component center (locationX = locationY = baseSize/2), zone center = page touch", () => {
      const baseSize = 120;
      const pageX = 500;
      const pageY = 700;
      const locationX = baseSize / 2; // 60
      const locationY = baseSize / 2; // 60

      const rect = computeJoystickZoneRect(pageX, pageY, locationX, locationY, baseSize);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      expect(centerX).toBe(pageX);
      expect(centerY).toBe(pageY);
    });

    it("when touch is at top-left corner (location = 0,0), zone center is offset by half baseSize", () => {
      const baseSize = 120;
      const pageX = 100;
      const pageY = 200;

      const rect = computeJoystickZoneRect(pageX, pageY, 0, 0, baseSize);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      expect(centerX).toBe(pageX + baseSize / 2);
      expect(centerY).toBe(pageY + baseSize / 2);
    });
  });

  describe("edge cases", () => {
    it("handles zero page coordinates", () => {
      const rect = computeJoystickZoneRect(0, 0, 0, 0, 120);
      expect(rect.left).toBe(0);
      expect(rect.top).toBe(0);
    });

    it("handles large page coordinates", () => {
      const rect = computeJoystickZoneRect(1920, 1080, 60, 60, 120);
      expect(rect.left).toBe(1860);
      expect(rect.top).toBe(1020);
    });
  });
});

describe("JoystickProvider interface contract (Spec §23)", () => {
  // These tests verify that mock providers satisfying JoystickProvider
  // are called correctly when the right methods are invoked.

  function makeProvider(): JoystickProvider {
    return {
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
    };
  }

  it("onTouchStart is callable with touch + zone args", () => {
    const provider = makeProvider();
    provider.onTouchStart(
      { identifier: 0, clientX: 100, clientY: 200 },
      { left: 50, top: 150, width: 120, height: 120 },
    );
    expect(provider.onTouchStart).toHaveBeenCalledTimes(1);
    expect(provider.onTouchStart).toHaveBeenCalledWith(
      { identifier: 0, clientX: 100, clientY: 200 },
      { left: 50, top: 150, width: 120, height: 120 },
    );
  });

  it("onTouchMove is callable with touch arg", () => {
    const provider = makeProvider();
    provider.onTouchMove({ identifier: 0, clientX: 150, clientY: 200 });
    expect(provider.onTouchMove).toHaveBeenCalledWith({
      identifier: 0,
      clientX: 150,
      clientY: 200,
    });
  });

  it("onTouchEnd is callable with no args", () => {
    const provider = makeProvider();
    provider.onTouchEnd();
    expect(provider.onTouchEnd).toHaveBeenCalledTimes(1);
  });
});
