/**
 * Tests for mainMenuAnimations.ts (Spec S26 polish).
 *
 * Tests pure utility functions for leaf generation and animation factory outputs.
 */
import { Animated } from "react-native";
import {
  animateButtonPressIn,
  animateButtonPressOut,
  createButtonScale,
  createEmberPulse,
  createGlowPulse,
  createTierPulse,
  generateVariedLeaves,
  interpolateGlowOpacity,
  interpolateGlowRadius,
  interpolateTierBorderWidth,
  interpolateTierShadowOpacity,
  startTierPulse,
} from "./mainMenuAnimations.ts";

describe("mainMenuAnimations", () => {
  describe("generateVariedLeaves", () => {
    it("should generate the requested number of leaf configs", () => {
      const leaves = generateVariedLeaves(8);
      expect(leaves).toHaveLength(8);
    });

    it("should produce leaves with valid position ranges", () => {
      const leaves = generateVariedLeaves(10);
      for (const leaf of leaves) {
        expect(leaf.startX).toBeGreaterThanOrEqual(0);
        expect(leaf.startX).toBeLessThanOrEqual(1);
        expect(leaf.startY).toBeGreaterThanOrEqual(0);
        expect(leaf.startY).toBeLessThan(1);
      }
    });

    it("should produce varied sizes (not all the same)", () => {
      const leaves = generateVariedLeaves(6);
      const sizes = new Set(leaves.map((l) => l.size));
      expect(sizes.size).toBeGreaterThan(1);
    });

    it("should produce varied emojis", () => {
      const leaves = generateVariedLeaves(5);
      const emojis = new Set(leaves.map((l) => l.emoji));
      expect(emojis.size).toBeGreaterThan(1);
    });

    it("should produce deterministic output for same count", () => {
      const a = generateVariedLeaves(4);
      const b = generateVariedLeaves(4);
      expect(a).toEqual(b);
    });

    it("should handle zero count", () => {
      expect(generateVariedLeaves(0)).toEqual([]);
    });

    it("should produce leaves with positive duration", () => {
      const leaves = generateVariedLeaves(8);
      for (const leaf of leaves) {
        expect(leaf.duration).toBeGreaterThan(0);
      }
    });
  });

  describe("createGlowPulse", () => {
    it("should create animation refs", () => {
      const refs = createGlowPulse(false);
      expect(refs.anim).toBeInstanceOf(Animated.Value);
      expect(refs.loop).toBeDefined();
    });

    it("should create with reduce motion flag", () => {
      const refs = createGlowPulse(true);
      expect(refs.anim).toBeInstanceOf(Animated.Value);
    });
  });

  describe("createButtonScale", () => {
    it("should create a scale value starting at 1", () => {
      const refs = createButtonScale();
      expect(refs.scale).toBeInstanceOf(Animated.Value);
      // @ts-expect-error: accessing private _value for test
      expect(refs.scale._value).toBe(1);
    });

    it("animateButtonPressIn should not throw", () => {
      const { scale } = createButtonScale();
      expect(() => animateButtonPressIn(scale)).not.toThrow();
    });

    it("animateButtonPressOut should not throw", () => {
      const { scale } = createButtonScale();
      expect(() => animateButtonPressOut(scale)).not.toThrow();
    });
  });

  describe("createTierPulse", () => {
    it("should create an Animated.Value", () => {
      const anim = createTierPulse();
      expect(anim).toBeInstanceOf(Animated.Value);
    });

    it("startTierPulse should return a composite animation", () => {
      const anim = createTierPulse();
      const loop = startTierPulse(anim, false);
      expect(loop).toBeDefined();
      expect(typeof loop.start).toBe("function");
      expect(typeof loop.stop).toBe("function");
    });

    it("interpolateTierBorderWidth should return interpolation", () => {
      const anim = createTierPulse();
      const interp = interpolateTierBorderWidth(anim);
      expect(interp).toBeDefined();
    });

    it("interpolateTierShadowOpacity should return interpolation", () => {
      const anim = createTierPulse();
      const interp = interpolateTierShadowOpacity(anim);
      expect(interp).toBeDefined();
    });
  });

  describe("createEmberPulse", () => {
    it("should create an Animated.Value", () => {
      const anim = createEmberPulse();
      expect(anim).toBeInstanceOf(Animated.Value);
    });
  });

  describe("interpolateGlowRadius", () => {
    it("should return an interpolation", () => {
      const anim = new Animated.Value(0);
      const interp = interpolateGlowRadius(anim);
      expect(interp).toBeDefined();
    });
  });

  describe("interpolateGlowOpacity", () => {
    it("should return an interpolation", () => {
      const anim = new Animated.Value(0);
      const interp = interpolateGlowOpacity(anim);
      expect(interp).toBeDefined();
    });
  });
});
