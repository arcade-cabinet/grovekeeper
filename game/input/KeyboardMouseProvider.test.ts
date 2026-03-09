/**
 * @jest-environment jsdom
 */

/**
 * KeyboardMouseProvider tests (Spec §23)
 *
 * Tests that keyboard events map to correct InputFrame values and that
 * mouse deltas accumulate only when pointer lock is active.
 */

import { KeyboardMouseProvider } from "@/game/input/KeyboardMouseProvider";

// Helper to dispatch keyboard events on window
function keydown(code: string): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
}

function keyup(code: string): void {
  window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
}

function mousemove(movementX: number, movementY: number): void {
  // jsdom does not support movementX/movementY in the MouseEvent init dict;
  // use Object.defineProperty to inject the values after construction.
  const event = new MouseEvent("mousemove", { bubbles: true });
  Object.defineProperty(event, "movementX", { value: movementX });
  Object.defineProperty(event, "movementY", { value: movementY });
  window.dispatchEvent(event);
}

function wheel(deltaY: number): void {
  window.dispatchEvent(new WheelEvent("wheel", { deltaY, bubbles: true }));
}

describe("KeyboardMouseProvider (Spec §23)", () => {
  let provider: KeyboardMouseProvider;

  beforeEach(() => {
    provider = new KeyboardMouseProvider();
  });

  afterEach(() => {
    provider.dispose();
  });

  // ── Movement ─────────────────────────────────────

  it("W produces moveZ = 1 (forward)", () => {
    keydown("KeyW");
    const frame = provider.poll(1 / 60);
    expect(frame.moveZ).toBe(1);
    keyup("KeyW");
  });

  it("S produces moveZ = -1 (backward)", () => {
    keydown("KeyS");
    const frame = provider.poll(1 / 60);
    expect(frame.moveZ).toBe(-1);
    keyup("KeyS");
  });

  it("A produces moveX = -1 (left)", () => {
    keydown("KeyA");
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBe(-1);
    keyup("KeyA");
  });

  it("D produces moveX = 1 (right)", () => {
    keydown("KeyD");
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBe(1);
    keyup("KeyD");
  });

  it("ArrowUp produces moveZ = 1", () => {
    keydown("ArrowUp");
    const frame = provider.poll(1 / 60);
    expect(frame.moveZ).toBe(1);
    keyup("ArrowUp");
  });

  it("ArrowLeft produces moveX = -1", () => {
    keydown("ArrowLeft");
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBe(-1);
    keyup("ArrowLeft");
  });

  it("no keys held produces moveX = 0, moveZ = 0", () => {
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
  });

  it("opposing keys cancel out (W+S = 0)", () => {
    keydown("KeyW");
    keydown("KeyS");
    const frame = provider.poll(1 / 60);
    expect(frame.moveZ).toBe(0);
    keyup("KeyW");
    keyup("KeyS");
  });

  it("key release stops movement", () => {
    keydown("KeyD");
    keyup("KeyD");
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBe(0);
  });

  // ── Jump ─────────────────────────────────────────

  it("Space triggers jump = true", () => {
    keydown("Space");
    const frame = provider.poll(1 / 60);
    expect(frame.jump).toBe(true);
    keyup("Space");
  });

  it("jump is edge-triggered: resets to false after postFrame", () => {
    keydown("Space");
    provider.poll(1 / 60);
    provider.postFrame();

    // Still holding Space, but postFrame cleared the edge-trigger
    const frame2 = provider.poll(1 / 60);
    expect(frame2.jump).toBe(false);
    keyup("Space");
  });

  it("jump re-triggers after key release and re-press", () => {
    keydown("Space");
    provider.poll(1 / 60);
    provider.postFrame();
    keyup("Space");

    keydown("Space");
    const frame = provider.poll(1 / 60);
    expect(frame.jump).toBe(true);
    keyup("Space");
  });

  // ── Interact ──────────────────────────────────────

  it("E triggers interact = true", () => {
    keydown("KeyE");
    const frame = provider.poll(1 / 60);
    expect(frame.interact).toBe(true);
    keyup("KeyE");
  });

  it("interact is edge-triggered: resets after postFrame", () => {
    keydown("KeyE");
    provider.poll(1 / 60);
    provider.postFrame();

    const frame2 = provider.poll(1 / 60);
    expect(frame2.interact).toBe(false);
    keyup("KeyE");
  });

  // ── Sprint ────────────────────────────────────────

  it("ShiftLeft triggers sprint = true", () => {
    keydown("ShiftLeft");
    const frame = provider.poll(1 / 60);
    expect(frame.sprint).toBe(true);
    keyup("ShiftLeft");
  });

  it("ShiftRight triggers sprint = true", () => {
    keydown("ShiftRight");
    const frame = provider.poll(1 / 60);
    expect(frame.sprint).toBe(true);
    keyup("ShiftRight");
  });

  it("sprint resets when key released", () => {
    keydown("ShiftLeft");
    keyup("ShiftLeft");
    const frame = provider.poll(1 / 60);
    expect(frame.sprint).toBe(false);
  });

  // ── Mouse look ────────────────────────────────────

  it("mouse move without pointer lock does NOT accumulate look deltas", () => {
    // jsdom: document.pointerLockElement is null by default
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => null,
    });

    mousemove(100, 50);
    const frame = provider.poll(1 / 60);
    expect(frame.lookDeltaX).toBe(0);
    expect(frame.lookDeltaY).toBe(0);
  });

  it("mouse move WITH pointer lock accumulates lookDeltaX and lookDeltaY", () => {
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => document.body, // non-null = locked
    });

    mousemove(100, 50); // 100px * 0.002 = 0.2 rad, 50px * 0.002 = 0.1 rad
    const frame = provider.poll(1 / 60);
    expect(frame.lookDeltaX).toBeCloseTo(0.2);
    expect(frame.lookDeltaY).toBeCloseTo(0.1);

    // Restore
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => null,
    });
  });

  it("look deltas accumulate across multiple mousemove events per frame", () => {
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => document.body,
    });

    mousemove(100, 0);
    mousemove(100, 0);
    const frame = provider.poll(1 / 60);
    expect(frame.lookDeltaX).toBeCloseTo(0.4);

    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => null,
    });
  });

  it("look deltas reset to 0 after postFrame", () => {
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => document.body,
    });

    mousemove(200, 100);
    provider.poll(1 / 60);
    provider.postFrame();

    const frame2 = provider.poll(1 / 60);
    expect(frame2.lookDeltaX).toBe(0);
    expect(frame2.lookDeltaY).toBe(0);

    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => null,
    });
  });

  // ── Tool swap ────────────────────────────────────

  it("scroll down produces toolSwap = 1", () => {
    wheel(100);
    const frame = provider.poll(1 / 60);
    expect(frame.toolSwap).toBe(1);
  });

  it("scroll up produces toolSwap = -1", () => {
    wheel(-100);
    const frame = provider.poll(1 / 60);
    expect(frame.toolSwap).toBe(-1);
  });

  it("toolSwap resets to 0 after postFrame", () => {
    wheel(100);
    provider.poll(1 / 60);
    provider.postFrame();

    const frame2 = provider.poll(1 / 60);
    expect(frame2.toolSwap).toBe(0);
  });

  it("no scroll produces toolSwap = 0", () => {
    const frame = provider.poll(1 / 60);
    expect(frame.toolSwap).toBe(0);
  });

  // ── Lifecycle ────────────────────────────────────

  it("isAvailable returns true", () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it("dispose removes event listeners so keys no longer affect polling", () => {
    provider.dispose();
    keydown("KeyW");
    const frame = provider.poll(1 / 60);
    expect(frame.moveZ).toBe(0);
  });
});
