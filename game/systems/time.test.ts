import {
  advanceTime,
  computeTimeState,
  getLightIntensity,
  getSkyColors,
  isNightTime,
  MICROSECONDS_PER_DAY,
  resetGameTime,
  SKY_COLORS,
  setGameTime,
} from "./time";

beforeEach(() => {
  resetGameTime();
});

describe("time system", () => {
  describe("advanceTime", () => {
    it("starts at day 0", () => {
      const state = advanceTime(0);
      expect(state.dayNumber).toBe(0);
    });

    it("increments day number at day boundary", () => {
      const state = advanceTime(MICROSECONDS_PER_DAY);
      expect(state.dayNumber).toBe(1);
    });

    it("accumulates microseconds", () => {
      advanceTime(500);
      const state = advanceTime(500);
      expect(state.totalMicroseconds).toBe(1000);
    });

    it("day progress wraps within [0, 1)", () => {
      const state = advanceTime(MICROSECONDS_PER_DAY / 2);
      expect(state.dayProgress).toBeCloseTo(0.5, 5);
    });
  });

  describe("computeTimeState", () => {
    it("returns night phase at 0% progress", () => {
      const state = computeTimeState(0);
      expect(state.phase).toBe("night");
    });

    it("returns dawn at 25% progress", () => {
      const state = computeTimeState(MICROSECONDS_PER_DAY * 0.25);
      expect(state.phase).toBe("dawn");
    });

    it("returns day at 50% progress", () => {
      const state = computeTimeState(MICROSECONDS_PER_DAY * 0.5);
      expect(state.phase).toBe("day");
    });

    it("returns dusk at 80% progress", () => {
      const state = computeTimeState(MICROSECONDS_PER_DAY * 0.8);
      expect(state.phase).toBe("dusk");
    });

    it("returns night at 90% progress", () => {
      const state = computeTimeState(MICROSECONDS_PER_DAY * 0.9);
      expect(state.phase).toBe("night");
    });
  });

  describe("seasons", () => {
    it("starts in spring", () => {
      const state = computeTimeState(0);
      expect(state.season).toBe("spring");
    });

    it("moves to summer after spring days", () => {
      const state = computeTimeState(MICROSECONDS_PER_DAY * 30);
      expect(state.season).toBe("summer");
    });

    it("cycles through all four seasons", () => {
      const spring = computeTimeState(MICROSECONDS_PER_DAY * 0);
      const summer = computeTimeState(MICROSECONDS_PER_DAY * 30);
      const autumn = computeTimeState(MICROSECONDS_PER_DAY * 60);
      const winter = computeTimeState(MICROSECONDS_PER_DAY * 90);
      expect(spring.season).toBe("spring");
      expect(summer.season).toBe("summer");
      expect(autumn.season).toBe("autumn");
      expect(winter.season).toBe("winter");
    });

    it("wraps back to spring after a full year", () => {
      const state = computeTimeState(MICROSECONDS_PER_DAY * 120);
      expect(state.season).toBe("spring");
    });

    it("respects custom season length", () => {
      const state = computeTimeState(MICROSECONDS_PER_DAY * 10, 10);
      expect(state.season).toBe("summer");
    });
  });

  describe("getLightIntensity", () => {
    it("returns 0.3 at night", () => {
      expect(getLightIntensity(0.1)).toBe(0.3);
    });

    it("returns 1.0 during the day", () => {
      expect(getLightIntensity(0.5)).toBe(1.0);
    });

    it("returns an intermediate value at dawn", () => {
      const intensity = getLightIntensity(0.25);
      expect(intensity).toBeGreaterThan(0.3);
      expect(intensity).toBeLessThan(1.0);
    });
  });

  describe("getSkyColors", () => {
    it("returns day colors during daytime", () => {
      const colors = getSkyColors(0.5);
      expect(colors).toEqual(SKY_COLORS.day);
    });

    it("returns night colors at night", () => {
      const colors = getSkyColors(0.1);
      expect(colors).toEqual(SKY_COLORS.night);
    });
  });

  describe("isNightTime", () => {
    it("returns true at night", () => {
      expect(isNightTime(0.1)).toBe(true);
    });

    it("returns false during the day", () => {
      expect(isNightTime(0.5)).toBe(false);
    });
  });

  describe("setGameTime", () => {
    it("sets absolute game time", () => {
      setGameTime(MICROSECONDS_PER_DAY * 5);
      const state = advanceTime(0);
      expect(state.dayNumber).toBe(5);
    });
  });
});
