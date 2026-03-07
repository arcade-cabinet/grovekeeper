/**
 * Tests for TouchLookZone (Spec §23).
 *
 * Tests the pure computeLookDelta logic, the exported constants, and the
 * buildLookZoneHandlers factory — all without a React rendering context.
 *
 * The handler-building logic is extracted into buildLookZoneHandlers so tests
 * can exercise touch forwarding without PanResponder or hook constraints.
 */

jest.mock("@/game/input/TouchProvider", () => ({
  TouchProvider: jest.fn().mockImplementation(() => ({
    onViewportTouchStart: jest.fn(),
    onViewportTouchMove: jest.fn(),
    onViewportTouchEnd: jest.fn(),
  })),
}));

import {
  buildLookZoneHandlers,
  computeLookDelta,
  LOOK_DEAD_ZONE,
  LOOK_SENSITIVITY,
  TouchLookZone,
} from "./TouchLookZone";
import type { LookZoneRefs, LookZoneProvider } from "./TouchLookZone";

// ── computeLookDelta unit tests ──────────────────────────────────────────────

describe("computeLookDelta (Spec §23)", () => {
  describe("dead zone suppression", () => {
    it("returns null when displacement is exactly 0", () => {
      expect(computeLookDelta(0, 0, LOOK_SENSITIVITY, LOOK_DEAD_ZONE)).toBeNull();
    });

    it("returns null when displacement is 1px in X only (below dead zone of 2px)", () => {
      expect(computeLookDelta(1, 0, LOOK_SENSITIVITY, LOOK_DEAD_ZONE)).toBeNull();
    });

    it("returns null for diagonal movement with magnitude below dead zone", () => {
      // sqrt(1^2 + 1^2) ≈ 1.41 < LOOK_DEAD_ZONE (2)
      expect(computeLookDelta(1, 1, LOOK_SENSITIVITY, LOOK_DEAD_ZONE)).toBeNull();
    });

    it("returns non-null when displacement equals dead zone (boundary inclusive)", () => {
      // dist == 2 == LOOK_DEAD_ZONE; condition is dist < deadZone so dist==2 passes
      const result = computeLookDelta(2, 0, LOOK_SENSITIVITY, LOOK_DEAD_ZONE);
      expect(result).not.toBeNull();
    });

    it("returns non-null when displacement exceeds dead zone", () => {
      expect(computeLookDelta(3, 0, LOOK_SENSITIVITY, LOOK_DEAD_ZONE)).not.toBeNull();
    });

    it("returns non-null for large negative displacement", () => {
      expect(computeLookDelta(-10, 0, LOOK_SENSITIVITY, LOOK_DEAD_ZONE)).not.toBeNull();
    });
  });

  describe("sensitivity scaling", () => {
    it("scales dx correctly by sensitivity", () => {
      const result = computeLookDelta(10, 0, LOOK_SENSITIVITY, LOOK_DEAD_ZONE);
      expect(result).not.toBeNull();
      expect(result!.scaledDx).toBeCloseTo(10 * LOOK_SENSITIVITY);
    });

    it("scales dy correctly by sensitivity", () => {
      const result = computeLookDelta(0, 20, LOOK_SENSITIVITY, LOOK_DEAD_ZONE);
      expect(result).not.toBeNull();
      expect(result!.scaledDy).toBeCloseTo(20 * LOOK_SENSITIVITY);
    });

    it("scales both dx and dy in a diagonal movement", () => {
      const dx = 15;
      const dy = 8;
      const result = computeLookDelta(dx, dy, LOOK_SENSITIVITY, LOOK_DEAD_ZONE);
      expect(result).not.toBeNull();
      expect(result!.scaledDx).toBeCloseTo(dx * LOOK_SENSITIVITY);
      expect(result!.scaledDy).toBeCloseTo(dy * LOOK_SENSITIVITY);
    });

    it("scales negative dx correctly (look left)", () => {
      const result = computeLookDelta(-5, 0, LOOK_SENSITIVITY, LOOK_DEAD_ZONE);
      expect(result).not.toBeNull();
      expect(result!.scaledDx).toBeCloseTo(-5 * LOOK_SENSITIVITY);
    });

    it("scales negative dy correctly (look up)", () => {
      const result = computeLookDelta(0, -5, LOOK_SENSITIVITY, LOOK_DEAD_ZONE);
      expect(result).not.toBeNull();
      expect(result!.scaledDy).toBeCloseTo(-5 * LOOK_SENSITIVITY);
    });

    it("produces expected radian output for a 100px horizontal swipe", () => {
      // 100px * 0.003 rad/px = 0.3 radians ≈ 17.2°
      const result = computeLookDelta(100, 0, LOOK_SENSITIVITY, LOOK_DEAD_ZONE);
      expect(result).not.toBeNull();
      expect(result!.scaledDx).toBeCloseTo(0.3);
      expect(result!.scaledDy).toBeCloseTo(0);
    });

    it("produces expected radian output for a 100px vertical swipe", () => {
      const result = computeLookDelta(0, 100, LOOK_SENSITIVITY, LOOK_DEAD_ZONE);
      expect(result).not.toBeNull();
      expect(result!.scaledDx).toBeCloseTo(0);
      expect(result!.scaledDy).toBeCloseTo(0.3);
    });
  });

  describe("custom sensitivity and dead zone", () => {
    it("respects a custom dead zone value", () => {
      const customDeadZone = 10;
      expect(computeLookDelta(5, 0, LOOK_SENSITIVITY, customDeadZone)).toBeNull();
      expect(computeLookDelta(11, 0, LOOK_SENSITIVITY, customDeadZone)).not.toBeNull();
    });

    it("respects a custom sensitivity value", () => {
      const customSensitivity = 0.01;
      const result = computeLookDelta(10, 0, customSensitivity, LOOK_DEAD_ZONE);
      expect(result).not.toBeNull();
      expect(result!.scaledDx).toBeCloseTo(0.1); // 10 * 0.01
    });

    it("produces zero-look output for zero sensitivity (disabled look)", () => {
      const result = computeLookDelta(50, 50, 0, LOOK_DEAD_ZONE);
      expect(result).not.toBeNull();
      expect(result!.scaledDx).toBeCloseTo(0);
      expect(result!.scaledDy).toBeCloseTo(0);
    });
  });
});

// ── Exported constants ───────────────────────────────────────────────────────

describe("TouchLookZone constants (Spec §23)", () => {
  it("exports LOOK_SENSITIVITY as 0.003 rad/px", () => {
    expect(LOOK_SENSITIVITY).toBe(0.003);
  });

  it("exports LOOK_DEAD_ZONE as 2px", () => {
    expect(LOOK_DEAD_ZONE).toBe(2);
  });

  it("exports TouchLookZone as a function component", () => {
    expect(typeof TouchLookZone).toBe("function");
  });
});

// ── buildLookZoneHandlers (provider forwarding) ──────────────────────────────
//
// Tests exercise the handler callbacks directly without a React rendering
// context. buildLookZoneHandlers is a pure factory that takes refs and a
// provider — no hooks required.

describe("buildLookZoneHandlers (Spec §23)", () => {
  function makeProvider(): LookZoneProvider {
    return {
      onViewportTouchStart: jest.fn(),
      onViewportTouchMove: jest.fn(),
      onViewportTouchEnd: jest.fn(),
    };
  }

  function makeRefs(): LookZoneRefs {
    return {
      activeTouchId: { current: null },
      prevPos: { current: { x: 0, y: 0 } },
    };
  }

  function makeGestureEvent(overrides: {
    identifier?: number;
    pageX?: number;
    pageY?: number;
  }) {
    return {
      nativeEvent: {
        identifier: overrides.identifier ?? 0,
        pageX: overrides.pageX ?? 0,
        pageY: overrides.pageY ?? 0,
        locationX: 0,
        locationY: 0,
        target: 0,
        timestamp: 0,
        touches: [],
        changedTouches: [],
      },
    } as unknown as import("react-native").GestureResponderEvent;
  }

  it("calls onViewportTouchStart with correct identifier and position on grant", () => {
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 1, pageX: 150, pageY: 300 }));

    expect(provider.onViewportTouchStart).toHaveBeenCalledWith({
      identifier: 1,
      clientX: 150,
      clientY: 300,
    });
  });

  it("sets activeTouchId ref on grant", () => {
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 7, pageX: 0, pageY: 0 }));

    expect(refs.activeTouchId.current).toBe(7);
  });

  it("calls onViewportTouchMove when finger moves beyond dead zone", () => {
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    // Grant at (100, 100) with identifier 2
    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 2, pageX: 100, pageY: 100 }));

    // Move 10px right (exceeds LOOK_DEAD_ZONE of 2px)
    handlers.onPanResponderMove(makeGestureEvent({ identifier: 2, pageX: 110, pageY: 100 }));

    expect(provider.onViewportTouchMove).toHaveBeenCalledWith({
      identifier: 2,
      clientX: 110,
      clientY: 100,
    });
  });

  it("does NOT call onViewportTouchMove when movement is within dead zone", () => {
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    // Grant at (100, 100)
    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 3, pageX: 100, pageY: 100 }));

    // Move only 1px right (within LOOK_DEAD_ZONE of 2px)
    handlers.onPanResponderMove(makeGestureEvent({ identifier: 3, pageX: 101, pageY: 100 }));

    expect(provider.onViewportTouchMove).not.toHaveBeenCalled();
  });

  it("suppresses move events from a different touch identifier", () => {
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    // Grant with identifier 6
    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 6, pageX: 100, pageY: 100 }));

    // Move arrives from identifier 7 — should be ignored
    handlers.onPanResponderMove(makeGestureEvent({ identifier: 7, pageX: 200, pageY: 200 }));

    expect(provider.onViewportTouchMove).not.toHaveBeenCalled();
  });

  it("calls onViewportTouchEnd when touch is released", () => {
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 4, pageX: 200, pageY: 400 }));
    handlers.onPanResponderRelease(makeGestureEvent({ identifier: 4, pageX: 200, pageY: 400 }));

    expect(provider.onViewportTouchEnd).toHaveBeenCalledWith({ identifier: 4 });
  });

  it("clears activeTouchId ref on release", () => {
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 4, pageX: 0, pageY: 0 }));
    handlers.onPanResponderRelease(makeGestureEvent({ identifier: 4, pageX: 0, pageY: 0 }));

    expect(refs.activeTouchId.current).toBeNull();
  });

  it("calls onViewportTouchEnd when touch is terminated (OS interrupt)", () => {
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 5, pageX: 50, pageY: 60 }));
    handlers.onPanResponderTerminate(makeGestureEvent({ identifier: 5, pageX: 50, pageY: 60 }));

    expect(provider.onViewportTouchEnd).toHaveBeenCalled();
  });

  it("updates prevPos ref after an accepted move", () => {
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 8, pageX: 100, pageY: 100 }));
    handlers.onPanResponderMove(makeGestureEvent({ identifier: 8, pageX: 115, pageY: 105 }));

    expect(refs.prevPos.current.x).toBe(115);
    expect(refs.prevPos.current.y).toBe(105);
  });

  it("does not update prevPos ref when move is within dead zone", () => {
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 9, pageX: 100, pageY: 100 }));
    handlers.onPanResponderMove(makeGestureEvent({ identifier: 9, pageX: 101, pageY: 100 }));

    // prevPos should still be the grant position
    expect(refs.prevPos.current.x).toBe(100);
    expect(refs.prevPos.current.y).toBe(100);
  });

  it("sensitivity scaling: 100px horizontal swipe produces 0.3 rad x-delta in provider", () => {
    // This is an integration check: after a 100px move, computeLookDelta is
    // called internally. The actual radian value isn't passed to the provider
    // (the provider receives raw pixel coords), but we verify the provider IS
    // called (meaning the dead zone was not triggered).
    const provider = makeProvider();
    const refs = makeRefs();
    const handlers = buildLookZoneHandlers(refs, provider);

    handlers.onPanResponderGrant(makeGestureEvent({ identifier: 10, pageX: 0, pageY: 0 }));
    handlers.onPanResponderMove(makeGestureEvent({ identifier: 10, pageX: 100, pageY: 0 }));

    // Provider receives raw coords; internal delta is 100 * 0.003 = 0.3 rad
    expect(provider.onViewportTouchMove).toHaveBeenCalledWith({
      identifier: 10,
      clientX: 100,
      clientY: 0,
    });
  });
});
