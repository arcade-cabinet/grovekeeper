/**
 * @jest-environment jsdom
 */

/**
 * GamepadProvider tests (Spec §23)
 *
 * Mocks navigator.getGamepads to exercise axis → movement mapping,
 * button → action mapping, dead-zone, and availability logic.
 */

import { GamepadProvider } from "./GamepadProvider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal fake Gamepad object. */
function makeGamepad(
  opts: {
    index?: number;
    axes?: number[];
    buttons?: Array<{ pressed: boolean; value: number }>;
  } = {},
): Gamepad {
  return {
    index: opts.index ?? 0,
    id: "Mock Gamepad",
    mapping: "standard",
    connected: true,
    axes: opts.axes ?? [0, 0, 0, 0],
    buttons: (opts.buttons ?? []).map((b) => ({ pressed: b.pressed, value: b.value, toJSON: () => b })),
    timestamp: 0,
    vibrationActuator: null,
    hapticActuators: [],
  } as unknown as Gamepad;
}

/** Make a buttons array with 16 slots, setting specific indices. */
function makeButtons(
  overrides: Record<number, { pressed: boolean; value: number }>,
): Array<{ pressed: boolean; value: number }> {
  const btns: Array<{ pressed: boolean; value: number }> = Array.from({ length: 16 }, () => ({
    pressed: false,
    value: 0,
  }));
  for (const [idx, val] of Object.entries(overrides)) {
    btns[Number(idx)] = val;
  }
  return btns;
}

/** Build a fake GamepadEvent for testing event listeners. */
function makeGamepadEvent(type: string, pad: Gamepad): GamepadEvent {
  const event = new CustomEvent(type);
  Object.defineProperty(event, "gamepad", { value: pad });
  return event as unknown as GamepadEvent;
}

/** Install a mock getGamepads on navigator (returns provided pad at index 0). */
function mockGamepads(pads: Array<Gamepad | null>) {
  Object.defineProperty(navigator, "getGamepads", {
    value: () => pads,
    writable: true,
    configurable: true,
  });
}

/** Reset navigator.getGamepads to return empty array. */
function clearGamepads() {
  Object.defineProperty(navigator, "getGamepads", {
    value: () => [],
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let provider: GamepadProvider;

beforeEach(() => {
  clearGamepads();
  provider = new GamepadProvider();
});

afterEach(() => {
  provider.dispose();
  clearGamepads();
});

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

describe("GamepadProvider — availability (Spec §23)", () => {
  it("isAvailable() returns false when no gamepad is connected", () => {
    clearGamepads();
    expect(provider.isAvailable()).toBe(false);
  });

  it("isAvailable() returns true after gamepadconnected event fires", () => {
    const pad = makeGamepad({ index: 0 });
    mockGamepads([pad]);

    window.dispatchEvent(makeGamepadEvent("gamepadconnected", pad));

    expect(provider.isAvailable()).toBe(true);
  });

  it("isAvailable() returns false after gamepaddisconnected event fires", () => {
    const pad = makeGamepad({ index: 0 });
    mockGamepads([pad]);

    window.dispatchEvent(makeGamepadEvent("gamepadconnected", pad));

    expect(provider.isAvailable()).toBe(true);

    clearGamepads();
    window.dispatchEvent(makeGamepadEvent("gamepaddisconnected", pad));

    expect(provider.isAvailable()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// poll() returns empty frame when no gamepad
// ---------------------------------------------------------------------------

describe("GamepadProvider — poll with no gamepad (Spec §23)", () => {
  it("returns empty partial when no gamepad connected", () => {
    const frame = provider.poll(0.016);
    expect(frame).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Movement: left stick axes 0 / 1
// ---------------------------------------------------------------------------

describe("GamepadProvider — movement mapping (Spec §23)", () => {
  function pollWithAxes(axes: number[], dt = 0.016) {
    const pad = makeGamepad({ index: 0, axes });
    mockGamepads([pad]);
    window.dispatchEvent(makeGamepadEvent("gamepadconnected", pad));
    return provider.poll(dt);
  }

  it("left stick right (axis 0 = +1) produces moveX = +1", () => {
    const frame = pollWithAxes([1, 0, 0, 0]);
    expect(frame.moveX).toBeCloseTo(1);
  });

  it("left stick left (axis 0 = -1) produces moveX = -1", () => {
    const frame = pollWithAxes([-1, 0, 0, 0]);
    expect(frame.moveX).toBeCloseTo(-1);
  });

  it("left stick up (axis 1 = -1) produces moveZ = +1 (forward)", () => {
    // Screen Y-down: stick up = negative axis 1 → positive Z (forward)
    const frame = pollWithAxes([0, -1, 0, 0]);
    expect(frame.moveZ).toBeCloseTo(1);
  });

  it("left stick down (axis 1 = +1) produces moveZ = -1 (backward)", () => {
    const frame = pollWithAxes([0, 1, 0, 0]);
    expect(frame.moveZ).toBeCloseTo(-1);
  });

  it("zeroed left stick produces moveX=0, moveZ=0", () => {
    const frame = pollWithAxes([0, 0, 0, 0]);
    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Look: right stick axes 2 / 3
// ---------------------------------------------------------------------------

describe("GamepadProvider — look mapping (Spec §23)", () => {
  function pollWithAxes(axes: number[], dt = 0.016) {
    const pad = makeGamepad({ index: 0, axes });
    mockGamepads([pad]);
    window.dispatchEvent(makeGamepadEvent("gamepadconnected", pad));
    return provider.poll(dt);
  }

  it("right stick right (axis 2 = +1) produces positive lookDeltaX", () => {
    const frame = pollWithAxes([0, 0, 1, 0]);
    expect(frame.lookDeltaX).toBeGreaterThan(0);
  });

  it("right stick left (axis 2 = -1) produces negative lookDeltaX", () => {
    const frame = pollWithAxes([0, 0, -1, 0]);
    expect(frame.lookDeltaX).toBeLessThan(0);
  });

  it("right stick down (axis 3 = +1) produces positive lookDeltaY", () => {
    const frame = pollWithAxes([0, 0, 0, 1]);
    expect(frame.lookDeltaY).toBeGreaterThan(0);
  });

  it("lookDeltaX scales proportionally with dt", () => {
    const pad = makeGamepad({ index: 0, axes: [0, 0, 1, 0] });
    mockGamepads([pad]);
    window.dispatchEvent(makeGamepadEvent("gamepadconnected", pad));

    const frame1 = provider.poll(0.016);
    const frame2 = provider.poll(0.032);
    // lookDeltaX at dt=0.032 should be ~2× the value at dt=0.016
    expect(frame2.lookDeltaX!).toBeCloseTo((frame1.lookDeltaX ?? 0) * 2, 5);
  });
});

// ---------------------------------------------------------------------------
// Dead-zone
// ---------------------------------------------------------------------------

describe("GamepadProvider — dead-zone (Spec §23)", () => {
  function pollWithAxes(axes: number[]) {
    const pad = makeGamepad({ index: 0, axes });
    mockGamepads([pad]);
    window.dispatchEvent(makeGamepadEvent("gamepadconnected", pad));
    return provider.poll(0.016);
  }

  it("stick deflection below dead-zone produces zero movement", () => {
    const frame = pollWithAxes([0.05, 0.05, 0.05, 0.05]);
    expect(frame.moveX).toBe(0);
    expect(frame.moveZ).toBe(0);
    expect(frame.lookDeltaX).toBe(0);
    expect(frame.lookDeltaY).toBe(0);
  });

  it("stick deflection at exactly dead-zone boundary (0.12) produces zero", () => {
    const frame = pollWithAxes([0.12, 0, 0, 0]);
    expect(frame.moveX).toBe(0);
  });

  it("stick deflection just above dead-zone (0.13) produces non-zero movement", () => {
    const frame = pollWithAxes([0.13, 0, 0, 0]);
    expect(frame.moveX).toBeCloseTo(0.13);
  });
});

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

describe("GamepadProvider — button mapping (Spec §23)", () => {
  function pollWithButtons(
    btnsOverride: Record<number, { pressed: boolean; value: number }>,
    axes: number[] = [0, 0, 0, 0],
  ) {
    const btns = makeButtons(btnsOverride);
    const pad = makeGamepad({ index: 0, axes, buttons: btns });
    mockGamepads([pad]);
    window.dispatchEvent(makeGamepadEvent("gamepadconnected", pad));
    return provider.poll(0.016);
  }

  it("Button A (index 0) pressed → jump=true", () => {
    const frame = pollWithButtons({ 0: { pressed: true, value: 1 } });
    expect(frame.jump).toBe(true);
  });

  it("Button A not pressed → jump=false", () => {
    const frame = pollWithButtons({});
    expect(frame.jump).toBe(false);
  });

  it("Button X (index 2) pressed → interact=true", () => {
    const frame = pollWithButtons({ 2: { pressed: true, value: 1 } });
    expect(frame.interact).toBe(true);
  });

  it("Button X not pressed → interact=false", () => {
    const frame = pollWithButtons({});
    expect(frame.interact).toBe(false);
  });

  it("RB (index 5) pressed → toolSwap=+1 (next tool)", () => {
    const frame = pollWithButtons({ 5: { pressed: true, value: 1 } });
    expect(frame.toolSwap).toBe(1);
  });

  it("LB (index 4) pressed → toolSwap=-1 (previous tool)", () => {
    const frame = pollWithButtons({ 4: { pressed: true, value: 1 } });
    expect(frame.toolSwap).toBe(-1);
  });

  it("Neither LB nor RB → toolSwap=0", () => {
    const frame = pollWithButtons({});
    expect(frame.toolSwap).toBe(0);
  });

  it("RB takes priority over LB when both pressed → toolSwap=+1", () => {
    const frame = pollWithButtons({
      4: { pressed: true, value: 1 },
      5: { pressed: true, value: 1 },
    });
    expect(frame.toolSwap).toBe(1);
  });

  it("analog button with value >= 0.5 counts as pressed", () => {
    const frame = pollWithButtons({ 0: { pressed: false, value: 0.8 } });
    expect(frame.jump).toBe(true);
  });

  it("analog button with value < 0.5 does not count as pressed", () => {
    const frame = pollWithButtons({ 0: { pressed: false, value: 0.4 } });
    expect(frame.jump).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// dispose()
// ---------------------------------------------------------------------------

describe("GamepadProvider — dispose (Spec §23)", () => {
  it("isAvailable() returns false after dispose", () => {
    const pad = makeGamepad({ index: 0 });
    mockGamepads([pad]);
    window.dispatchEvent(makeGamepadEvent("gamepadconnected", pad));

    expect(provider.isAvailable()).toBe(true);

    provider.dispose();
    expect(provider.isAvailable()).toBe(false);
  });

  it("poll() returns empty frame after dispose", () => {
    const pad = makeGamepad({ index: 0, axes: [1, -1, 0, 0] });
    mockGamepads([pad]);
    window.dispatchEvent(makeGamepadEvent("gamepadconnected", pad));

    provider.dispose();
    const frame = provider.poll(0.016);
    expect(frame).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// postFrame() — no accumulators
// ---------------------------------------------------------------------------

describe("GamepadProvider — postFrame (Spec §23)", () => {
  it("postFrame does not throw", () => {
    expect(() => provider.postFrame()).not.toThrow();
  });
});
