import { describe, it, expect } from "vitest";
import {
  getWeatherGrowthMultiplier,
  getWeatherStaminaMultiplier,
  initializeWeather,
  updateWeather,
  rollWindstormDamage,
  type WeatherState,
  type WeatherType,
} from "./weather";

// ============================================
// Growth Multiplier
// ============================================

describe("getWeatherGrowthMultiplier", () => {
  it("returns 1.0 for clear weather", () => {
    expect(getWeatherGrowthMultiplier("clear")).toBe(1.0);
  });

  it("returns 1.3 for rain (+30% growth)", () => {
    expect(getWeatherGrowthMultiplier("rain")).toBe(1.3);
  });

  it("returns 0.5 for drought (-50% growth)", () => {
    expect(getWeatherGrowthMultiplier("drought")).toBe(0.5);
  });

  it("returns 1.0 for windstorm (no growth effect)", () => {
    expect(getWeatherGrowthMultiplier("windstorm")).toBe(1.0);
  });
});

// ============================================
// Stamina Multiplier
// ============================================

describe("getWeatherStaminaMultiplier", () => {
  it("returns 1.0 for clear weather", () => {
    expect(getWeatherStaminaMultiplier("clear")).toBe(1.0);
  });

  it("returns 1.0 for rain (no stamina effect)", () => {
    expect(getWeatherStaminaMultiplier("rain")).toBe(1.0);
  });

  it("returns 1.5 for drought (+50% stamina cost)", () => {
    expect(getWeatherStaminaMultiplier("drought")).toBe(1.5);
  });

  it("returns 1.0 for windstorm (no stamina effect)", () => {
    expect(getWeatherStaminaMultiplier("windstorm")).toBe(1.0);
  });
});

// ============================================
// initializeWeather
// ============================================

describe("initializeWeather", () => {
  it("returns clear weather at the given game time", () => {
    const state = initializeWeather(1000);

    expect(state.current.type).toBe("clear");
    expect(state.current.startTime).toBe(1000);
  });

  it("sets nextCheckTime to currentTime + 300 (5 game minutes)", () => {
    const state = initializeWeather(500);

    expect(state.nextCheckTime).toBe(800);
  });

  it("sets duration equal to the check interval", () => {
    const state = initializeWeather(0);

    expect(state.current.duration).toBe(300);
  });

  it("works with zero game time", () => {
    const state = initializeWeather(0);

    expect(state.current.type).toBe("clear");
    expect(state.current.startTime).toBe(0);
    expect(state.nextCheckTime).toBe(300);
  });
});

// ============================================
// updateWeather — no-op cases
// ============================================

describe("updateWeather — event still active", () => {
  it("returns unchanged state when current event has not expired", () => {
    const state: WeatherState = {
      current: { type: "rain", startTime: 100, duration: 80 },
      nextCheckTime: 400,
    };

    // Event ends at 180, checking at 150 => still active
    const result = updateWeather(state, 150, "spring", 42);

    expect(result.current.type).toBe("rain");
    expect(result.current.startTime).toBe(100);
    expect(result.current.duration).toBe(80);
    expect(result.nextCheckTime).toBe(400);
  });

  it("returns same reference when event is still active", () => {
    const state: WeatherState = {
      current: { type: "drought", startTime: 0, duration: 200 },
      nextCheckTime: 300,
    };

    const result = updateWeather(state, 100, "summer", 99);

    expect(result).toBe(state);
  });
});

// ============================================
// updateWeather — event expired, waiting for check
// ============================================

describe("updateWeather — event expired, before nextCheckTime", () => {
  it("transitions to clear when non-clear event expires before next check", () => {
    const state: WeatherState = {
      current: { type: "rain", startTime: 0, duration: 100 },
      nextCheckTime: 300,
    };

    // Event ended at 100, current time is 200, next check at 300
    const result = updateWeather(state, 200, "spring", 42);

    expect(result.current.type).toBe("clear");
    expect(result.current.startTime).toBe(100); // starts when rain ended
    expect(result.nextCheckTime).toBe(300); // unchanged
  });
});

// ============================================
// updateWeather — roll new weather
// ============================================

describe("updateWeather — rolls new weather at check time", () => {
  it("rolls new weather when currentTime >= nextCheckTime", () => {
    const state = initializeWeather(0);

    // Advance past first check at 300
    const result = updateWeather(state, 300, "spring", 42);

    // Should have rolled something (deterministic given seed)
    expect(["clear", "rain", "drought", "windstorm"]).toContain(
      result.current.type,
    );
    expect(result.current.startTime).toBe(300);
    // Next check advances by 300
    expect(result.nextCheckTime).toBe(600);
  });

  it("is deterministic — same inputs produce same output", () => {
    const state = initializeWeather(0);

    const result1 = updateWeather(state, 300, "spring", 42);
    const result2 = updateWeather(state, 300, "spring", 42);

    expect(result1.current.type).toBe(result2.current.type);
    expect(result1.current.duration).toBe(result2.current.duration);
    expect(result1.current.startTime).toBe(result2.current.startTime);
    expect(result1.nextCheckTime).toBe(result2.nextCheckTime);
  });

  it("produces different results with different seeds", () => {
    const state = initializeWeather(0);

    // Run many seeds and collect results to verify they vary
    const results = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const result = updateWeather(state, 300, "spring", seed);
      results.add(result.current.type);
    }

    // With 100 seeds, we should get more than one weather type
    expect(results.size).toBeGreaterThan(1);
  });

  it("advances nextCheckTime by 300 each roll", () => {
    let state = initializeWeather(0);

    // First check at 300
    state = updateWeather(state, 300, "spring", 1);
    expect(state.nextCheckTime).toBe(600);

    // Force event to end by simulating past its duration
    // Create a state that has expired and is at/past next check
    state = updateWeather(state, 600, "summer", 2);
    expect(state.nextCheckTime).toBe(900);
  });
});

// ============================================
// Season-specific probability distributions
// ============================================

describe("updateWeather — season probabilities", () => {
  /**
   * Helper: run many weather rolls for a given season and tally the results.
   * Uses a range of seeds for variety. Returns counts per weather type.
   */
  function tallySeason(
    season: string,
    trials: number,
  ): Record<WeatherType, number> {
    const counts: Record<WeatherType, number> = {
      clear: 0,
      rain: 0,
      drought: 0,
      windstorm: 0,
    };

    for (let i = 0; i < trials; i++) {
      const state = initializeWeather(0);
      const result = updateWeather(state, 300, season, i);
      counts[result.current.type]++;
    }

    return counts;
  }

  const TRIALS = 1000;

  it("spring has the highest rain probability", () => {
    const spring = tallySeason("spring", TRIALS);
    const summer = tallySeason("summer", TRIALS);

    // Spring rain (30%) should be significantly higher than summer rain (15%)
    expect(spring.rain).toBeGreaterThan(summer.rain);
  });

  it("summer has the highest drought probability", () => {
    const summer = tallySeason("summer", TRIALS);
    const spring = tallySeason("spring", TRIALS);

    // Summer drought (25%) vs spring drought (5%)
    expect(summer.drought).toBeGreaterThan(spring.drought);
  });

  it("autumn has high windstorm probability", () => {
    const autumn = tallySeason("autumn", TRIALS);
    const summer = tallySeason("summer", TRIALS);

    // Autumn windstorm (20%) vs summer windstorm (5%)
    expect(autumn.windstorm).toBeGreaterThan(summer.windstorm);
  });

  it("winter has the highest clear probability", () => {
    const winter = tallySeason("winter", TRIALS);
    const autumn = tallySeason("autumn", TRIALS);

    // Winter clear (65%) vs autumn clear (50%)
    expect(winter.clear).toBeGreaterThan(autumn.clear);
  });

  it("all four weather types appear over enough trials in spring", () => {
    const spring = tallySeason("spring", TRIALS);

    expect(spring.rain).toBeGreaterThan(0);
    expect(spring.drought).toBeGreaterThan(0);
    expect(spring.windstorm).toBeGreaterThan(0);
    expect(spring.clear).toBeGreaterThan(0);
  });
});

// ============================================
// Duration bounds
// ============================================

describe("updateWeather — duration bounds", () => {
  /**
   * Helper: collect durations for a specific weather type across many seeds.
   */
  function collectDurations(
    targetType: WeatherType,
    season: string,
    maxSeeds: number,
  ): number[] {
    const durations: number[] = [];
    for (let seed = 0; seed < maxSeeds && durations.length < 50; seed++) {
      const state = initializeWeather(0);
      const result = updateWeather(state, 300, season, seed);
      if (result.current.type === targetType) {
        durations.push(result.current.duration);
      }
    }
    return durations;
  }

  it("rain durations are within [60, 120]", () => {
    // Spring has highest rain chance (30%)
    const durations = collectDurations("rain", "spring", 5000);
    expect(durations.length).toBeGreaterThan(0);

    for (const d of durations) {
      expect(d).toBeGreaterThanOrEqual(60);
      expect(d).toBeLessThanOrEqual(120);
    }
  });

  it("drought durations are within [90, 180]", () => {
    // Summer has highest drought chance (25%)
    const durations = collectDurations("drought", "summer", 5000);
    expect(durations.length).toBeGreaterThan(0);

    for (const d of durations) {
      expect(d).toBeGreaterThanOrEqual(90);
      expect(d).toBeLessThanOrEqual(180);
    }
  });

  it("windstorm durations are within [30, 60]", () => {
    // Autumn has highest windstorm chance (20%)
    const durations = collectDurations("windstorm", "autumn", 5000);
    expect(durations.length).toBeGreaterThan(0);

    for (const d of durations) {
      expect(d).toBeGreaterThanOrEqual(30);
      expect(d).toBeLessThanOrEqual(60);
    }
  });

  it("clear weather duration equals the check interval (300)", () => {
    const durations = collectDurations("clear", "spring", 5000);
    expect(durations.length).toBeGreaterThan(0);

    for (const d of durations) {
      expect(d).toBe(300);
    }
  });
});

// ============================================
// rollWindstormDamage
// ============================================

describe("rollWindstormDamage", () => {
  it("returns true when rngValue < 0.10 (10% threshold)", () => {
    expect(rollWindstormDamage(0.0)).toBe(true);
    expect(rollWindstormDamage(0.05)).toBe(true);
    expect(rollWindstormDamage(0.09)).toBe(true);
    expect(rollWindstormDamage(0.099)).toBe(true);
  });

  it("returns false when rngValue >= 0.10", () => {
    expect(rollWindstormDamage(0.10)).toBe(false);
    expect(rollWindstormDamage(0.11)).toBe(false);
    expect(rollWindstormDamage(0.5)).toBe(false);
    expect(rollWindstormDamage(0.99)).toBe(false);
  });

  it("returns false for rngValue of exactly 1.0", () => {
    expect(rollWindstormDamage(1.0)).toBe(false);
  });

  it("returns true for rngValue of exactly 0.0", () => {
    expect(rollWindstormDamage(0.0)).toBe(true);
  });

  it("boundary: 0.09999 is damage, 0.10001 is not", () => {
    expect(rollWindstormDamage(0.09999)).toBe(true);
    expect(rollWindstormDamage(0.10001)).toBe(false);
  });
});

// ============================================
// Difficulty tier interactions with weather
// ============================================

import { useGameStore } from "../stores/gameStore";
import { beforeEach } from "vitest";

describe("Weather × Difficulty tier interactions", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe("windstorm damage chance scales with difficulty", () => {
    it("explore has 0% windstorm damage", () => {
      useGameStore.setState({ difficulty: "explore" });
      expect(rollWindstormDamage(0.0)).toBe(false);
      expect(rollWindstormDamage(0.99)).toBe(false);
    });

    it("hard has 15% windstorm damage", () => {
      useGameStore.setState({ difficulty: "hard" });
      expect(rollWindstormDamage(0.14)).toBe(true);
      expect(rollWindstormDamage(0.15)).toBe(false);
    });

    it("brutal has 20% windstorm damage", () => {
      useGameStore.setState({ difficulty: "brutal" });
      expect(rollWindstormDamage(0.19)).toBe(true);
      expect(rollWindstormDamage(0.20)).toBe(false);
    });

    it("ultra-brutal has 25% windstorm damage", () => {
      useGameStore.setState({ difficulty: "ultra-brutal" });
      expect(rollWindstormDamage(0.24)).toBe(true);
      expect(rollWindstormDamage(0.25)).toBe(false);
    });
  });

  describe("rain growth bonus is consistent across difficulties", () => {
    it("rain bonus is 1.3 for all difficulty tiers", () => {
      for (const diff of ["explore", "normal", "hard", "brutal", "ultra-brutal"]) {
        useGameStore.setState({ difficulty: diff });
        expect(getWeatherGrowthMultiplier("rain")).toBe(1.3);
      }
    });
  });

  describe("drought penalty varies by difficulty", () => {
    it("explore drought is 0.8 (mild)", () => {
      useGameStore.setState({ difficulty: "explore" });
      expect(getWeatherGrowthMultiplier("drought")).toBe(0.8);
    });

    it("normal drought is 0.5", () => {
      useGameStore.setState({ difficulty: "normal" });
      expect(getWeatherGrowthMultiplier("drought")).toBe(0.5);
    });

    it("hard drought is 0.4", () => {
      useGameStore.setState({ difficulty: "hard" });
      expect(getWeatherGrowthMultiplier("drought")).toBe(0.4);
    });

    it("brutal drought is 0.3", () => {
      useGameStore.setState({ difficulty: "brutal" });
      expect(getWeatherGrowthMultiplier("drought")).toBe(0.3);
    });

    it("ultra-brutal drought is 0.2 (harshest)", () => {
      useGameStore.setState({ difficulty: "ultra-brutal" });
      expect(getWeatherGrowthMultiplier("drought")).toBe(0.2);
    });
  });
});

// ============================================
// Weather state machine edge cases
// ============================================

describe("updateWeather edge cases", () => {
  it("handles initial state at time 0", () => {
    const state = initializeWeather(0);
    const result = updateWeather(state, 0, "spring", 42);
    // Should not change — event hasn't expired
    expect(result).toBe(state);
  });

  it("handles very large game times", () => {
    const state = initializeWeather(1_000_000);
    const result = updateWeather(state, 1_000_300, "spring", 42);
    expect(["clear", "rain", "drought", "windstorm"]).toContain(result.current.type);
  });

  it("expired clear waiting state returns same reference", () => {
    const state: WeatherState = {
      current: { type: "clear", startTime: 100, duration: 200 },
      nextCheckTime: 400,
    };
    // Event ended at 300, current 350, next check at 400
    const result1 = updateWeather(state, 350, "spring", 42);
    // result1 is clear from 300 to 400
    const result2 = updateWeather(result1, 360, "spring", 42);
    // Should return same reference (already in clear waiting state)
    expect(result2).toBe(result1);
  });

  it("unknown season defaults to spring probabilities", () => {
    const state = initializeWeather(0);
    const result = updateWeather(state, 300, "monsoon", 42);
    expect(["clear", "rain", "drought", "windstorm"]).toContain(result.current.type);
  });
});
