/**
 * @jest-environment jsdom
 */

/**
 * TouchProvider tests (Spec §23)
 *
 * Tests that virtual joystick drag, viewport swipe, and action buttons
 * produce correct InputFrame values. The provider exposes a call-based API
 * that React overlay components invoke directly (no window event listeners).
 */

import { TouchProvider } from "@/game/input/TouchProvider";

function touch(identifier: number, clientX: number, clientY: number) {
  return { identifier, clientX, clientY };
}

function rect(left: number, top: number, width: number, height: number) {
  return { left, top, width, height };
}

describe("TouchProvider (Spec §23)", () => {
  let provider: TouchProvider;

  beforeEach(() => {
    provider = new TouchProvider();
  });

  afterEach(() => {
    provider.dispose();
  });

  // ── Idle ─────────────────────────────────────────

  it("idle poll returns zero movement and no actions", () => {
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
    expect(frame.lookDeltaX).toBe(0);
    expect(frame.lookDeltaY).toBe(0);
    expect(frame.interact).toBe(false);
    expect(frame.toolSwap).toBe(0);
  });

  // ── Joystick movement ──────────────────────────────

  it("joystick push right produces moveX = 1", () => {
    // zone center = (64, 64), touch at (104, 64) = 40px right = max radius
    provider.onTouchStart(touch(1, 104, 64), rect(0, 0, 128, 128));
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBeCloseTo(1);
    expect(frame.moveZ).toBeCloseTo(0);
  });

  it("joystick push left produces moveX = -1", () => {
    // 40px left of center
    provider.onTouchStart(touch(1, 24, 64), rect(0, 0, 128, 128));
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBeCloseTo(-1);
  });

  it("joystick push up (screen Y -) produces moveZ = 1 (world forward)", () => {
    // dy = -40 -> moveZ = -(-40/40) = 1
    provider.onTouchStart(touch(1, 64, 24), rect(0, 0, 128, 128));
    const frame = provider.poll(1 / 60);
    expect(frame.moveZ).toBeCloseTo(1);
  });

  it("joystick push down (screen Y +) produces moveZ = -1 (world backward)", () => {
    // dy = 40 -> moveZ = -(40/40) = -1
    provider.onTouchStart(touch(1, 64, 104), rect(0, 0, 128, 128));
    const frame = provider.poll(1 / 60);
    expect(frame.moveZ).toBeCloseTo(-1);
  });

  it("joystick displacement beyond maxRadius is clamped to [-1, 1]", () => {
    // 200px right -- far beyond maxRadius (40)
    provider.onTouchStart(touch(1, 264, 64), rect(0, 0, 128, 128));
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBeCloseTo(1);
    expect(Math.abs(frame.moveX ?? 0)).toBeLessThanOrEqual(1);
  });

  it("partial joystick displacement produces fractional moveX", () => {
    // 20px right -> 20/40 = 0.5
    provider.onTouchStart(touch(1, 84, 64), rect(0, 0, 128, 128));
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBeCloseTo(0.5);
  });

  it("onTouchMove updates movement while dragging", () => {
    provider.onTouchStart(touch(1, 64, 64), rect(0, 0, 128, 128)); // center
    provider.onTouchMove(touch(1, 84, 64)); // 20px right
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBeCloseTo(0.5);
  });

  it("onTouchMove without prior onTouchStart has no effect", () => {
    provider.onTouchMove(touch(1, 200, 200));
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
  });

  it("onTouchEnd resets movement to 0", () => {
    provider.onTouchStart(touch(1, 104, 64), rect(0, 0, 128, 128));
    provider.onTouchEnd();
    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
  });

  it("joystick movement persists across postFrame (held, not edge-triggered)", () => {
    provider.onTouchStart(touch(1, 104, 64), rect(0, 0, 128, 128));
    provider.poll(1 / 60);
    provider.postFrame();
    const frame2 = provider.poll(1 / 60);
    expect(frame2.moveX).toBeCloseTo(1); // still held
  });

  // ── Viewport look ─────────────────────────────────

  it("viewport swipe right produces lookDeltaX > 0", () => {
    provider.onViewportTouchStart(touch(2, 200, 300));
    provider.onViewportTouchMove(touch(2, 300, 300)); // 100px right
    const frame = provider.poll(1 / 60);
    expect(frame.lookDeltaX).toBeCloseTo(0.3); // 100 * 0.003
    expect(frame.lookDeltaY).toBeCloseTo(0);
  });

  it("viewport swipe down produces lookDeltaY > 0", () => {
    provider.onViewportTouchStart(touch(2, 200, 200));
    provider.onViewportTouchMove(touch(2, 200, 250)); // 50px down
    const frame = provider.poll(1 / 60);
    expect(frame.lookDeltaY).toBeCloseTo(0.15); // 50 * 0.003
  });

  it("look deltas accumulate across multiple touchmove events per frame", () => {
    provider.onViewportTouchStart(touch(2, 0, 0));
    provider.onViewportTouchMove(touch(2, 100, 0)); // +100px
    provider.onViewportTouchMove(touch(2, 200, 0)); // +100px more
    const frame = provider.poll(1 / 60);
    expect(frame.lookDeltaX).toBeCloseTo(0.6); // 200 * 0.003 total
  });

  it("look deltas reset to 0 after postFrame", () => {
    provider.onViewportTouchStart(touch(2, 0, 0));
    provider.onViewportTouchMove(touch(2, 100, 0));
    provider.poll(1 / 60);
    provider.postFrame();
    const frame2 = provider.poll(1 / 60);
    expect(frame2.lookDeltaX).toBe(0);
    expect(frame2.lookDeltaY).toBe(0);
  });

  it("touchmove with wrong identifier is ignored", () => {
    provider.onViewportTouchStart(touch(2, 0, 0));
    provider.onViewportTouchMove(touch(99, 100, 0)); // wrong ID
    const frame = provider.poll(1 / 60);
    expect(frame.lookDeltaX).toBe(0);
  });

  it("onViewportTouchEnd clears look state", () => {
    provider.onViewportTouchStart(touch(2, 0, 0));
    provider.onViewportTouchMove(touch(2, 100, 0));
    provider.onViewportTouchEnd(touch(2, 100, 0));
    const frame = provider.poll(1 / 60);
    expect(frame.lookDeltaX).toBe(0);
  });

  it("onViewportTouchEnd with wrong identifier does not clear look state", () => {
    provider.onViewportTouchStart(touch(2, 0, 0));
    provider.onViewportTouchMove(touch(2, 100, 0));
    provider.onViewportTouchEnd(touch(99, 0, 0)); // wrong ID
    const frame = provider.poll(1 / 60);
    expect(frame.lookDeltaX).toBeCloseTo(0.3); // not cleared
  });

  // ── Action buttons ────────────────────────────────

  it("onInteractStart sets interact = true", () => {
    provider.onInteractStart();
    const frame = provider.poll(1 / 60);
    expect(frame.interact).toBe(true);
  });

  it("interact is edge-triggered: resets to false after postFrame", () => {
    provider.onInteractStart();
    provider.poll(1 / 60);
    provider.postFrame();
    const frame2 = provider.poll(1 / 60);
    expect(frame2.interact).toBe(false);
  });

  it("onToolCycleStart sets toolSwap = 1", () => {
    provider.onToolCycleStart();
    const frame = provider.poll(1 / 60);
    expect(frame.toolSwap).toBe(1);
  });

  it("toolSwap resets to 0 after postFrame", () => {
    provider.onToolCycleStart();
    provider.poll(1 / 60);
    provider.postFrame();
    const frame2 = provider.poll(1 / 60);
    expect(frame2.toolSwap).toBe(0);
  });

  it("no button press produces interact = false, toolSwap = 0", () => {
    const frame = provider.poll(1 / 60);
    expect(frame.interact).toBe(false);
    expect(frame.toolSwap).toBe(0);
  });

  // ── isAvailable ───────────────────────────────────

  it("isAvailable returns true when ontouchstart exists on window", () => {
    Object.defineProperty(window, "ontouchstart", {
      configurable: true,
      value: null, // defined but null = touch supported
    });
    expect(provider.isAvailable()).toBe(true);
    // Restore: redefine as not-present (delete via reconfigure)
    Object.defineProperty(window, "ontouchstart", {
      configurable: true,
      value: undefined,
    });
  });

  it("isAvailable returns true when navigator.maxTouchPoints > 0", () => {
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      get: () => 5,
    });
    expect(provider.isAvailable()).toBe(true);
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      get: () => 0,
    });
  });

  // ── dispose ───────────────────────────────────────

  it("dispose zeros all state so subsequent poll returns zeroed frame", () => {
    provider.onTouchStart(touch(1, 104, 64), rect(0, 0, 128, 128));
    provider.onViewportTouchStart(touch(2, 0, 0));
    provider.onViewportTouchMove(touch(2, 100, 0));
    provider.onInteractStart();
    provider.onToolCycleStart();
    provider.dispose();

    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
    expect(frame.lookDeltaX).toBe(0);
    expect(frame.lookDeltaY).toBe(0);
    expect(frame.interact).toBe(false);
    expect(frame.toolSwap).toBe(0);
  });

  // ── Multi-touch isolation ─────────────────────────

  it("joystick and viewport look work simultaneously (different touch IDs)", () => {
    // Joystick touch ID=1, look touch ID=2
    provider.onTouchStart(touch(1, 104, 64), rect(0, 0, 128, 128)); // moveX = 1
    provider.onViewportTouchStart(touch(2, 200, 300));
    provider.onViewportTouchMove(touch(2, 300, 300)); // lookDeltaX = 0.3

    const frame = provider.poll(1 / 60);
    expect(frame.moveX).toBeCloseTo(1);
    expect(frame.lookDeltaX).toBeCloseTo(0.3);
  });
});
