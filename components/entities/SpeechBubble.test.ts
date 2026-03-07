/**
 * Tests for SpeechBubble — floating speech bubble pure functions (Spec §33.5).
 *
 * Tests exported pure functions without WebGL/R3F context:
 *   - computeOpacity   — fade in/out opacity animation math
 *   - computeBubbleY   — vertical position above entity
 *
 * Animation constants (FADE_DURATION, BUBBLE_OFFSET) are also verified.
 * Component export is verified separately.
 */

jest.mock("@react-three/drei", () => ({
  Billboard: jest.fn(),
  Text: jest.fn(),
}));

jest.mock("@react-three/fiber", () => ({
  useFrame: jest.fn(),
}));

jest.mock("three", () => ({
  MeshBasicMaterial: jest.fn(),
}));

import {
  BUBBLE_OFFSET,
  computeBubbleY,
  computeOpacity,
  FADE_DURATION,
  SpeechBubble,
} from "./SpeechBubble.tsx";

// ---------------------------------------------------------------------------
// computeOpacity
// ---------------------------------------------------------------------------

describe("computeOpacity (Spec §33.5)", () => {
  it("increases opacity toward 1 when visible=true", () => {
    const result = computeOpacity(true, 0, 0.1, 0.3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("decreases opacity toward 0 when visible=false", () => {
    const result = computeOpacity(false, 1, 0.1, 0.3);
    expect(result).toBeLessThan(1);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("clamps to 1 when rate would exceed full visibility", () => {
    const result = computeOpacity(true, 0.99, 1.0, 0.3);
    expect(result).toBe(1);
  });

  it("clamps to 0 when rate would go below zero", () => {
    const result = computeOpacity(false, 0.01, 1.0, 0.3);
    expect(result).toBe(0);
  });

  it("stays at 1 when already fully visible", () => {
    const result = computeOpacity(true, 1, 0.016, 0.3);
    expect(result).toBe(1);
  });

  it("stays at 0 when already fully hidden", () => {
    const result = computeOpacity(false, 0, 0.016, 0.3);
    expect(result).toBe(0);
  });

  it("rate is dt/fadeDuration per step", () => {
    const result = computeOpacity(true, 0, 0.1, 0.5);
    expect(result).toBeCloseTo(0.2);
  });

  it("is symmetric: fade-in and fade-out advance at equal rate from 0.5", () => {
    const fadeIn = computeOpacity(true, 0.5, 0.1, 0.3);
    const fadeOut = computeOpacity(false, 0.5, 0.1, 0.3);
    expect(0.5 - fadeOut).toBeCloseTo(fadeIn - 0.5);
  });

  it("reaches 1 after accumulating dt steps equal to fadeDuration", () => {
    let opacity = 0;
    const dt = 0.016; // ~60fps
    const steps = Math.ceil(FADE_DURATION / dt) + 1;
    for (let i = 0; i < steps; i++) {
      opacity = computeOpacity(true, opacity, dt, FADE_DURATION);
    }
    expect(opacity).toBe(1);
  });

  it("reaches 0 after accumulating dt steps equal to fadeDuration", () => {
    let opacity = 1;
    const dt = 0.016;
    const steps = Math.ceil(FADE_DURATION / dt) + 1;
    for (let i = 0; i < steps; i++) {
      opacity = computeOpacity(false, opacity, dt, FADE_DURATION);
    }
    expect(opacity).toBe(0);
  });

  it("is not fully opaque after only half the fade duration", () => {
    let opacity = 0;
    const dt = 0.016;
    const halfSteps = Math.floor(FADE_DURATION / 2 / dt);
    for (let i = 0; i < halfSteps; i++) {
      opacity = computeOpacity(true, opacity, dt, FADE_DURATION);
    }
    expect(opacity).toBeLessThan(1);
  });

  it("returns a value between 0 and 1 for arbitrary inputs", () => {
    for (const dt of [0.001, 0.016, 0.1, 1.0]) {
      for (const start of [0, 0.25, 0.5, 0.75, 1]) {
        const r1 = computeOpacity(true, start, dt, 0.3);
        const r2 = computeOpacity(false, start, dt, 0.3);
        expect(r1).toBeGreaterThanOrEqual(0);
        expect(r1).toBeLessThanOrEqual(1);
        expect(r2).toBeGreaterThanOrEqual(0);
        expect(r2).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// computeBubbleY
// ---------------------------------------------------------------------------

describe("computeBubbleY (Spec §33.5)", () => {
  it("returns entityY + offset", () => {
    expect(computeBubbleY(1.0, 2.2)).toBeCloseTo(3.2);
  });

  it("returns offset when entityY is 0", () => {
    expect(computeBubbleY(0, BUBBLE_OFFSET)).toBeCloseTo(BUBBLE_OFFSET);
  });

  it("returns 0 when both entityY and offset are 0", () => {
    expect(computeBubbleY(0, 0)).toBe(0);
  });

  it("respects negative entityY (underground entities)", () => {
    expect(computeBubbleY(-1.0, 2.0)).toBeCloseTo(1.0);
  });

  it("matches formula: entityY + offset", () => {
    const entityY = 0.73;
    const offset = 1.85;
    expect(computeBubbleY(entityY, offset)).toBeCloseTo(entityY + offset);
  });

  it("bubble is always above the entity (result > entityY when offset > 0)", () => {
    const entityY = 0.5;
    expect(computeBubbleY(entityY, 2.2)).toBeGreaterThan(entityY);
  });
});

// ---------------------------------------------------------------------------
// FADE_DURATION
// ---------------------------------------------------------------------------

describe("FADE_DURATION (Spec §33.5)", () => {
  it("is 0.3 seconds", () => {
    expect(FADE_DURATION).toBe(0.3);
  });
});

// ---------------------------------------------------------------------------
// BUBBLE_OFFSET
// ---------------------------------------------------------------------------

describe("BUBBLE_OFFSET (Spec §33.5)", () => {
  it("is greater than 2 world units (clears entity height)", () => {
    expect(BUBBLE_OFFSET).toBeGreaterThan(2.0);
  });
});

// ---------------------------------------------------------------------------
// Component export
// ---------------------------------------------------------------------------

describe("SpeechBubble component (Spec §33.5)", () => {
  it("exports SpeechBubble as a named function component", () => {
    expect(typeof SpeechBubble).toBe("function");
  });

  it("has component name SpeechBubble", () => {
    expect(SpeechBubble.name).toBe("SpeechBubble");
  });
});
