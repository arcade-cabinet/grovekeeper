import {
  getWeatherGrowthMultiplier,
  getWeatherStaminaMultiplier,
  initializeWeather,
  rollWindstormDamage,
  updateWeather,
  type WeatherType,
} from "@/game/systems/weather";

describe("weather system", () => {
  // ── getWeatherGrowthMultiplier ──────────────────────────────────

  describe("getWeatherGrowthMultiplier", () => {
    it("returns 1.3 for rain", () => {
      expect(getWeatherGrowthMultiplier("rain")).toBe(1.3);
    });

    it("returns 0.5 for drought", () => {
      expect(getWeatherGrowthMultiplier("drought")).toBe(0.5);
    });

    it("returns 1.0 for clear", () => {
      expect(getWeatherGrowthMultiplier("clear")).toBe(1.0);
    });

    it("returns 1.0 for windstorm", () => {
      expect(getWeatherGrowthMultiplier("windstorm")).toBe(1.0);
    });
  });

  // ── getWeatherStaminaMultiplier ─────────────────────────────────

  describe("getWeatherStaminaMultiplier", () => {
    it("returns 1.5 for drought", () => {
      expect(getWeatherStaminaMultiplier("drought")).toBe(1.5);
    });

    it("returns 1.0 for rain", () => {
      expect(getWeatherStaminaMultiplier("rain")).toBe(1.0);
    });

    it("returns 1.0 for clear", () => {
      expect(getWeatherStaminaMultiplier("clear")).toBe(1.0);
    });

    it("returns 1.0 for windstorm", () => {
      expect(getWeatherStaminaMultiplier("windstorm")).toBe(1.0);
    });
  });

  // ── initializeWeather ──────────────────────────────────────────

  describe("initializeWeather", () => {
    it("starts with clear weather", () => {
      const state = initializeWeather(100);
      expect(state.current.type).toBe("clear");
    });

    it("sets startTime to the provided game time", () => {
      const state = initializeWeather(500);
      expect(state.current.startTime).toBe(500);
    });

    it("sets duration to the check interval (300)", () => {
      const state = initializeWeather(0);
      expect(state.current.duration).toBe(300);
    });

    it("schedules next check time at currentTime + 300", () => {
      const state = initializeWeather(200);
      expect(state.nextCheckTime).toBe(500);
    });
  });

  // ── updateWeather ──────────────────────────────────────────────

  describe("updateWeather", () => {
    it("returns same state when event is still active", () => {
      const state = initializeWeather(0);
      // At time 100, event lasts from 0 to 300 -- still active
      const result = updateWeather(state, 100, "summer", 42);
      expect(result).toBe(state);
    });

    it("transitions to clear after event expires but before next check", () => {
      // Create a state where event expires at time 100 but next check is at 300
      const state = {
        current: { type: "rain" as WeatherType, startTime: 0, duration: 100 },
        nextCheckTime: 300,
      };
      const result = updateWeather(state, 150, "summer", 42);
      expect(result.current.type).toBe("clear");
      expect(result.current.startTime).toBe(100);
      expect(result.current.duration).toBe(200); // 300 - 100
    });

    it("rolls new weather when past next check time", () => {
      const state = initializeWeather(0);
      // Jump to time 600 (past nextCheckTime 300)
      const result = updateWeather(state, 600, "spring", 42);
      expect(result.nextCheckTime).toBe(600); // 300 + 300
      expect(result.current.startTime).toBe(300); // starts at old nextCheckTime
      expect(["clear", "rain", "drought", "windstorm"]).toContain(
        result.current.type,
      );
    });

    it("produces deterministic results with same seed", () => {
      const state = initializeWeather(0);
      const r1 = updateWeather(state, 600, "spring", 42);
      const r2 = updateWeather(state, 600, "spring", 42);
      expect(r1.current.type).toBe(r2.current.type);
      expect(r1.current.duration).toBe(r2.current.duration);
    });

    it("produces different results with different seeds", () => {
      const state = initializeWeather(0);
      const results = new Set<WeatherType>();
      // Try many seeds to get different weather
      for (let seed = 0; seed < 100; seed++) {
        const r = updateWeather(state, 600, "spring", seed);
        results.add(r.current.type);
      }
      // With 100 seeds and spring probabilities, we should get at least 2 different types
      expect(results.size).toBeGreaterThanOrEqual(2);
    });

    it("respects season probabilities -- spring favors rain", () => {
      const state = initializeWeather(0);
      let rainCount = 0;
      const trials = 200;
      for (let seed = 0; seed < trials; seed++) {
        const r = updateWeather(state, 600, "spring", seed);
        if (r.current.type === "rain") rainCount++;
      }
      // Spring rain probability is 0.3 -- expect at least some rain events
      expect(rainCount).toBeGreaterThan(0);
    });
  });

  // ── rollWindstormDamage ────────────────────────────────────────

  describe("rollWindstormDamage", () => {
    it("returns true when rng value < 0.1", () => {
      expect(rollWindstormDamage(0.05)).toBe(true);
      expect(rollWindstormDamage(0.0)).toBe(true);
      expect(rollWindstormDamage(0.099)).toBe(true);
    });

    it("returns false when rng value >= 0.1", () => {
      expect(rollWindstormDamage(0.1)).toBe(false);
      expect(rollWindstormDamage(0.5)).toBe(false);
      expect(rollWindstormDamage(0.99)).toBe(false);
    });

    it("boundary: exactly 0.1 returns false", () => {
      expect(rollWindstormDamage(0.1)).toBe(false);
    });
  });
});
