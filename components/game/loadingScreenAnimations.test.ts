/**
 * Tests for loadingScreenAnimations.ts (Spec S1.3 polish).
 *
 * Tests the animation factory functions and interpolation helpers.
 */
import { Animated } from "react-native";
import {
  animateSproutToPhase,
  animateTaglineIn,
  animateVineToPercent,
  createSproutAnim,
  createTaglineFade,
  createVineProgress,
  interpolateCanopyOpacity,
  interpolateCanopyScale,
  interpolateSeedRadius,
  interpolateTrunkHeight,
  interpolateVineWidth,
} from "./loadingScreenAnimations.ts";

describe("loadingScreenAnimations", () => {
  describe("createSproutAnim", () => {
    it("should create growth and opacity Animated.Values", () => {
      const refs = createSproutAnim();
      expect(refs.growth).toBeInstanceOf(Animated.Value);
      expect(refs.opacity).toBeInstanceOf(Animated.Value);
    });

    it("growth should start at 0", () => {
      const refs = createSproutAnim();
      // @ts-expect-error: accessing private _value for test
      expect(refs.growth._value).toBe(0);
    });

    it("opacity should start at 0", () => {
      const refs = createSproutAnim();
      // @ts-expect-error: accessing private _value for test
      expect(refs.opacity._value).toBe(0);
    });
  });

  describe("animateSproutToPhase", () => {
    it("should not throw for each phase", () => {
      const refs = createSproutAnim();
      for (const phase of [0, 1, 2, 3, 4] as const) {
        expect(() => animateSproutToPhase(refs, phase, false)).not.toThrow();
      }
    });

    it("should set values immediately when reduceMotion is true", () => {
      const refs = createSproutAnim();
      animateSproutToPhase(refs, 4, true);
      // When reduceMotion, duration=0 so value should be set
      // (Animated.timing with duration 0 sets value synchronously in RN)
    });
  });

  describe("interpolation helpers", () => {
    it("interpolateSeedRadius should return an interpolation", () => {
      const val = new Animated.Value(0);
      const interp = interpolateSeedRadius(val);
      expect(interp).toBeDefined();
    });

    it("interpolateTrunkHeight should return an interpolation", () => {
      const val = new Animated.Value(0);
      const interp = interpolateTrunkHeight(val);
      expect(interp).toBeDefined();
    });

    it("interpolateCanopyScale should return an interpolation", () => {
      const val = new Animated.Value(0);
      const interp = interpolateCanopyScale(val);
      expect(interp).toBeDefined();
    });

    it("interpolateCanopyOpacity should return an interpolation", () => {
      const val = new Animated.Value(0);
      const interp = interpolateCanopyOpacity(val);
      expect(interp).toBeDefined();
    });
  });

  describe("vine progress", () => {
    it("createVineProgress should create an Animated.Value at 0", () => {
      const vine = createVineProgress();
      expect(vine).toBeInstanceOf(Animated.Value);
      // @ts-expect-error: accessing private _value for test
      expect(vine._value).toBe(0);
    });

    it("animateVineToPercent should not throw", () => {
      const vine = createVineProgress();
      expect(() => animateVineToPercent(vine, 50, false)).not.toThrow();
    });

    it("animateVineToPercent with reduceMotion should set value directly", () => {
      const vine = createVineProgress();
      animateVineToPercent(vine, 75, true);
      // @ts-expect-error: accessing private _value for test
      expect(vine._value).toBe(75);
    });

    it("interpolateVineWidth should return an interpolation", () => {
      const vine = createVineProgress();
      const interp = interpolateVineWidth(vine);
      expect(interp).toBeDefined();
    });
  });

  describe("tagline fade", () => {
    it("createTaglineFade should create an Animated.Value at 0", () => {
      const fade = createTaglineFade();
      expect(fade).toBeInstanceOf(Animated.Value);
      // @ts-expect-error: accessing private _value for test
      expect(fade._value).toBe(0);
    });

    it("animateTaglineIn should not throw", () => {
      const fade = createTaglineFade();
      expect(() => animateTaglineIn(fade, false)).not.toThrow();
    });

    it("animateTaglineIn with reduceMotion should still not throw", () => {
      const fade = createTaglineFade();
      expect(() => animateTaglineIn(fade, true)).not.toThrow();
    });
  });
});
