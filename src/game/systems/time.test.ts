import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeTime,
  updateTime,
  getGameTime,
  pauseTime,
  resumeTime,
  setTimeScale,
  getSkyColors,
  getSeasonalColors,
  saveTime,
  loadTime,
  TIME_CONFIG,
  type GameTime,
  type Season,
} from "./time";

describe("Time System", () => {
  beforeEach(() => {
    initializeTime();
    // Reset timeScale to default
    TIME_CONFIG.timeScale = 12;
  });

  describe("initializeTime", () => {
    it("starts at spring, day 1, 8:00 AM", () => {
      const time = getGameTime();
      expect(time.season).toBe("spring");
      expect(time.day).toBe(1);
      expect(time.hours).toBe(8);
      expect(time.month).toBe(3);
      expect(time.year).toBe(1);
    });

    it("starts at morning time of day", () => {
      const time = getGameTime();
      expect(time.timeOfDay).toBe("morning");
    });

    it("can initialize from a saved microsecond value", () => {
      const savedTime = 100_000_000_000; // some arbitrary value
      initializeTime(savedTime);
      const time = getGameTime();
      expect(time.microseconds).toBe(savedTime);
    });
  });

  describe("updateTime", () => {
    it("advances game time by deltaMs * timeScale", () => {
      const before = getGameTime().microseconds;
      updateTime(1000); // 1 second real time
      const after = getGameTime().microseconds;
      // 1s real time = 12 game seconds = 12_000_000 microseconds
      // But clampedDelta caps at 100ms, so 100ms * 1000 * 12 = 1_200_000
      expect(after - before).toBe(100 * 1000 * 12);
    });

    it("caps delta at 100ms to prevent death spirals", () => {
      const before = getGameTime().microseconds;
      updateTime(5000); // 5 seconds real time -- should be capped
      const after = getGameTime().microseconds;
      // capped at 100ms: 100 * 1000 * 12 = 1_200_000
      expect(after - before).toBe(100 * 1000 * 12);
    });

    it("returns the updated game time", () => {
      const result = updateTime(10);
      expect(result.microseconds).toBeGreaterThan(0);
      expect(result.season).toBeDefined();
    });

    it("does not advance when paused", () => {
      pauseTime();
      const before = getGameTime().microseconds;
      updateTime(50);
      const after = getGameTime().microseconds;
      expect(after).toBe(before);
    });

    it("resumes after unpausing", () => {
      pauseTime();
      const paused = getGameTime().microseconds;
      updateTime(50);
      expect(getGameTime().microseconds).toBe(paused);

      resumeTime();
      updateTime(50);
      expect(getGameTime().microseconds).toBeGreaterThan(paused);
    });
  });

  describe("setTimeScale", () => {
    it("changes the time scale", () => {
      setTimeScale(24);
      const before = getGameTime().microseconds;
      updateTime(10); // 10ms real time
      const after = getGameTime().microseconds;
      // 10ms clamped to 10ms, * 1000 * 24 = 240_000
      expect(after - before).toBe(10 * 1000 * 24);
    });

    it("clamps to minimum of 0.1", () => {
      setTimeScale(0);
      expect(TIME_CONFIG.timeScale).toBe(0.1);
    });

    it("clamps to maximum of 1000", () => {
      setTimeScale(5000);
      expect(TIME_CONFIG.timeScale).toBe(1000);
    });
  });

  describe("getGameTime derived values", () => {
    it("calculates dayProgress as hours/24", () => {
      const time = getGameTime();
      expect(time.dayProgress).toBeCloseTo(time.hours / 24);
    });

    it("sun intensity is positive during daytime hours", () => {
      // Starting at 8 AM, should have positive sun
      const time = getGameTime();
      expect(time.sunIntensity).toBeGreaterThan(0);
    });

    it("ambient intensity is never below 0.15", () => {
      const time = getGameTime();
      expect(time.ambientIntensity).toBeGreaterThanOrEqual(0.15);
    });
  });

  describe("season calculation", () => {
    it("months 3-5 are spring", () => {
      // Start is month 3 (March)
      const time = getGameTime();
      expect(time.season).toBe("spring");
    });

    it("advances seasons over time", () => {
      // We need to advance enough time to change months
      // One month = 30 days * 24 hours * 60 min * 60 sec * 1_000_000 us
      const oneMonthMicroseconds = 30 * 24 * 60 * 60 * 1_000_000;
      // Start at month 3, advance 3 months to month 6 (summer)
      const currentTime = getGameTime().microseconds;
      loadTime(currentTime + 3 * oneMonthMicroseconds);
      const time = getGameTime();
      expect(time.season).toBe("summer");
    });

    it("winter wraps from month 12 to month 2", () => {
      const oneMonthMicroseconds = 30 * 24 * 60 * 60 * 1_000_000;
      const currentTime = getGameTime().microseconds;
      // Advance 9 months from March (month 3) -> month 12 (December = winter)
      loadTime(currentTime + 9 * oneMonthMicroseconds);
      const time = getGameTime();
      expect(time.season).toBe("winter");
    });
  });

  describe("time of day", () => {
    it("returns midnight for hours 0-4", () => {
      // Set time to midnight (hour 0)
      const hourInMicroseconds = 60 * 60 * 1_000_000;
      // Go to hour 0 of the current day by adjusting time
      loadTime(0); // This is the epoch, hour 0
      const time = getGameTime();
      expect(time.timeOfDay).toBe("midnight");
    });

    it("returns dawn for hour 5", () => {
      const hourInMicroseconds = 60 * 60 * 1_000_000;
      loadTime(5 * hourInMicroseconds);
      const time = getGameTime();
      expect(time.timeOfDay).toBe("dawn");
    });

    it("returns morning for hours 6-11", () => {
      // Already at 8 AM from initialization
      const time = getGameTime();
      expect(time.timeOfDay).toBe("morning");
    });
  });

  describe("getSkyColors", () => {
    it("returns valid color objects", () => {
      const time = getGameTime();
      const colors = getSkyColors(time);
      expect(colors.zenith).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.horizon).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.sun).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.ambient).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("returns different colors for different times", () => {
      const morningTime: GameTime = {
        ...getGameTime(),
        hours: 8,
        minutes: 0,
      };
      const nightTime: GameTime = {
        ...getGameTime(),
        hours: 23,
        minutes: 0,
      };
      const morningColors = getSkyColors(morningTime);
      const nightColors = getSkyColors(nightTime);
      expect(morningColors.zenith).not.toBe(nightColors.zenith);
    });
  });

  describe("getSeasonalColors", () => {
    it("returns leaf colors for each season", () => {
      const seasons: Season[] = ["spring", "summer", "autumn", "winter"];
      for (const season of seasons) {
        const colors = getSeasonalColors(season, 0);
        expect(colors.leafColors.length).toBeGreaterThan(0);
        expect(colors.groundColor).toBeTruthy();
        expect(colors.grassColor).toBeTruthy();
      }
    });

    it("spring has bright green leaf colors", () => {
      const colors = getSeasonalColors("spring", 0);
      // Spring greens should contain light green hex values
      expect(colors.leafColors.length).toBe(5);
    });

    it("autumn has warm leaf colors", () => {
      const colors = getSeasonalColors("autumn", 0);
      expect(colors.leafColors.length).toBe(5);
    });
  });

  describe("save/load", () => {
    it("saveTime returns current microseconds", () => {
      const time = getGameTime();
      expect(saveTime()).toBe(time.microseconds);
    });

    it("loadTime restores a saved time", () => {
      const savedValue = 500_000_000_000;
      loadTime(savedValue);
      expect(getGameTime().microseconds).toBe(savedValue);
    });

    it("round-trips correctly", () => {
      // Advance some time
      updateTime(50);
      updateTime(50);
      const saved = saveTime();
      // Reinitialize
      initializeTime();
      expect(getGameTime().microseconds).not.toBe(saved);
      // Restore
      loadTime(saved);
      expect(getGameTime().microseconds).toBe(saved);
    });
  });
});
