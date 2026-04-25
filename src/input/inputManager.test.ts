/**
 * InputManager tests — verify action mapping with a mocked engine
 * `Input`. We never instantiate the real engine; the manager is
 * structured to depend only on `isKeyDown` so the test stub is a
 * 6-line object literal.
 */

import { describe, expect, it } from "vitest";
import { InputManager, type InputSource } from "./inputManager";

function fakeInput(held: ReadonlySet<string>): InputSource {
  return {
    isKeyDown: (k: string) => held.has(k),
  };
}

describe("InputManager", () => {
  describe("move action", () => {
    it("returns zero vector when no keys are held and no joystick", () => {
      const mgr = new InputManager({ input: fakeInput(new Set()) });
      expect(mgr.getActionState("move")).toEqual({ x: 0, z: 0 });
    });

    it("emits forward (-z) for KeyW", () => {
      const mgr = new InputManager({ input: fakeInput(new Set(["KeyW"])) });
      const v = mgr.getActionState("move");
      expect(v).toEqual({ x: 0, z: -1 });
    });

    it("emits forward (-z) for ArrowUp (alternate binding)", () => {
      const mgr = new InputManager({
        input: fakeInput(new Set(["ArrowUp"])),
      });
      expect(mgr.getActionState("move")).toEqual({ x: 0, z: -1 });
    });

    it("emits back (+z) for KeyS / ArrowDown", () => {
      expect(
        new InputManager({
          input: fakeInput(new Set(["KeyS"])),
        }).getActionState("move"),
      ).toEqual({ x: 0, z: 1 });
      expect(
        new InputManager({
          input: fakeInput(new Set(["ArrowDown"])),
        }).getActionState("move"),
      ).toEqual({ x: 0, z: 1 });
    });

    it("emits left (-x) and right (+x)", () => {
      expect(
        new InputManager({
          input: fakeInput(new Set(["KeyA"])),
        }).getActionState("move"),
      ).toEqual({ x: -1, z: 0 });
      expect(
        new InputManager({
          input: fakeInput(new Set(["KeyD"])),
        }).getActionState("move"),
      ).toEqual({ x: 1, z: 0 });
    });

    it("normalises diagonals so W+D is unit length, not sqrt(2)", () => {
      const mgr = new InputManager({
        input: fakeInput(new Set(["KeyW", "KeyD"])),
      });
      const v = mgr.getActionState("move");
      const len = Math.hypot(v.x, v.z);
      expect(len).toBeCloseTo(1, 5);
      expect(v.x).toBeCloseTo(Math.SQRT1_2, 5);
      expect(v.z).toBeCloseTo(-Math.SQRT1_2, 5);
    });

    it("opposite keys cancel (W+S)", () => {
      const mgr = new InputManager({
        input: fakeInput(new Set(["KeyW", "KeyS"])),
      });
      expect(mgr.getActionState("move")).toEqual({ x: 0, z: 0 });
    });
  });

  describe("joystick override", () => {
    it("uses joystick vector when set, ignoring keys", () => {
      const mgr = new InputManager({
        input: fakeInput(new Set(["KeyW"])),
      });
      mgr.setJoystickVector({ x: 0.5, z: 0.5 });
      expect(mgr.getActionState("move")).toEqual({ x: 0.5, z: 0.5 });
    });

    it("clamps an over-magnitude joystick vector to unit length", () => {
      const mgr = new InputManager({ input: fakeInput(new Set()) });
      mgr.setJoystickVector({ x: 3, z: 4 }); // magnitude 5
      const v = mgr.getActionState("move");
      expect(Math.hypot(v.x, v.z)).toBeCloseTo(1, 5);
    });

    it("preserves partial deflection (sub-unit vectors stay analog)", () => {
      const mgr = new InputManager({ input: fakeInput(new Set()) });
      mgr.setJoystickVector({ x: 0.3, z: 0.4 });
      expect(mgr.getActionState("move")).toEqual({ x: 0.3, z: 0.4 });
    });

    it("clearing with null releases joystick → keys are read again", () => {
      const mgr = new InputManager({
        input: fakeInput(new Set(["KeyD"])),
      });
      mgr.setJoystickVector({ x: 0.5, z: 0 });
      expect(mgr.getActionState("move")).toEqual({ x: 0.5, z: 0 });
      mgr.setJoystickVector(null);
      expect(mgr.getActionState("move")).toEqual({ x: 1, z: 0 });
    });

    it("near-zero joystick treated as null (no jitter forwarding)", () => {
      const mgr = new InputManager({ input: fakeInput(new Set()) });
      mgr.setJoystickVector({ x: 0.00001, z: 0 });
      expect(mgr.getActionState("move")).toEqual({ x: 0, z: 0 });
    });
  });

  describe("button actions", () => {
    it("returns released for an unbound key", () => {
      const mgr = new InputManager({ input: fakeInput(new Set()) });
      expect(mgr.getActionState("interact")).toEqual({
        pressed: false,
        justPressed: false,
      });
    });

    it("emits pressed + justPressed on rising edge", () => {
      // Mutable set so we can simulate the key going down.
      const held = new Set<string>();
      const mgr = new InputManager({ input: fakeInput(held) });

      // Frame 0: nothing held.
      expect(mgr.getActionState("interact").pressed).toBe(false);
      mgr.endFrame();

      // Frame 1: E just went down.
      held.add("KeyE");
      const s1 = mgr.getActionState("interact");
      expect(s1.pressed).toBe(true);
      expect(s1.justPressed).toBe(true);
      mgr.endFrame();

      // Frame 2: still held — pressed but not justPressed.
      const s2 = mgr.getActionState("interact");
      expect(s2.pressed).toBe(true);
      expect(s2.justPressed).toBe(false);
      mgr.endFrame();

      // Frame 3: released.
      held.delete("KeyE");
      expect(mgr.getActionState("interact")).toEqual({
        pressed: false,
        justPressed: false,
      });
    });

    it("each button action maps to its own keys (Space=swing, KeyF=place, KeyC=open-craft)", () => {
      const mgr = new InputManager({
        input: fakeInput(new Set(["Space", "KeyF", "KeyC"])),
      });
      expect(mgr.getActionState("swing").pressed).toBe(true);
      expect(mgr.getActionState("place").pressed).toBe(true);
      expect(mgr.getActionState("open-craft").pressed).toBe(true);
      expect(mgr.getActionState("interact").pressed).toBe(false);
    });
  });

  describe("custom bindings", () => {
    it("respects an override binding table", () => {
      const mgr = new InputManager({
        input: fakeInput(new Set(["KeyZ"])),
        bindings: {
          moveForward: ["KeyZ"],
          moveBack: [],
          moveLeft: [],
          moveRight: [],
          interact: [],
          swing: [],
          place: [],
          openCraft: [],
        },
      });
      expect(mgr.getActionState("move")).toEqual({ x: 0, z: -1 });
    });
  });
});
