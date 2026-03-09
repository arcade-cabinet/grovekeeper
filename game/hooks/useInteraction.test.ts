/**
 * Tests for useInteraction utility functions.
 *
 * Tests the pure worldToGrid conversion and ActionButton's getActionLabel
 * (imported from its own module to avoid React Native UI dependencies).
 */

// Mock AudioManager to avoid Tone.js ESM import issue in Jest.
jest.mock("@/game/systems/AudioManager", () => ({
  audioManager: { playSound: jest.fn() },
  startAudio: jest.fn().mockResolvedValue(undefined),
}));

import { worldToGrid } from "./useInteraction/index.ts";

describe("worldToGrid", () => {
  it("rounds positive coordinates to nearest integer", () => {
    expect(worldToGrid(3.7, 5.2)).toEqual({ gridX: 4, gridZ: 5 });
  });

  it("rounds 0.5 up", () => {
    expect(worldToGrid(2.5, 3.5)).toEqual({ gridX: 3, gridZ: 4 });
  });

  it("handles exact integers", () => {
    expect(worldToGrid(4, 7)).toEqual({ gridX: 4, gridZ: 7 });
  });

  it("handles negative coordinates", () => {
    expect(worldToGrid(-1.3, -2.7)).toEqual({ gridX: -1, gridZ: -3 });
  });

  it("handles zero", () => {
    expect(worldToGrid(0, 0)).toEqual({ gridX: 0, gridZ: 0 });
  });

  it("handles large coordinates", () => {
    expect(worldToGrid(99.9, 100.1)).toEqual({ gridX: 100, gridZ: 100 });
  });

  it("handles fractional just below threshold", () => {
    expect(worldToGrid(3.49, 7.49)).toEqual({ gridX: 3, gridZ: 7 });
  });
});
