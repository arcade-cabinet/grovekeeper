import { describe, expect, it } from "vitest";
import {
  COLORS,
  DIFFICULTY_MULTIPLIERS,
  DROUGHT_PENALTY,
  INTERACTION_RADIUS,
  MAX_STAGE,
  PLAYER_SPEED,
  SEASON_GROWTH_MULTIPLIERS,
  STAGE_NAMES,
  STAGE_VISUALS,
  WATER_BONUS,
} from "./config";

describe("config constants", () => {
  describe("STAGE_NAMES", () => {
    it("has 5 stages matching MAX_STAGE + 1", () => {
      expect(STAGE_NAMES.length).toBe(MAX_STAGE + 1);
    });

    it("starts with Seed and ends with Old Growth", () => {
      expect(STAGE_NAMES[0]).toBe("Seed");
      expect(STAGE_NAMES[STAGE_NAMES.length - 1]).toBe("Old Growth");
    });
  });

  describe("STAGE_VISUALS", () => {
    it("has an entry for each stage", () => {
      expect(STAGE_VISUALS.length).toBe(MAX_STAGE + 1);
    });

    it("scales increase monotonically", () => {
      for (let i = 1; i < STAGE_VISUALS.length; i++) {
        expect(STAGE_VISUALS[i].scale).toBeGreaterThan(
          STAGE_VISUALS[i - 1].scale,
        );
      }
    });

    it("names match STAGE_NAMES", () => {
      for (let i = 0; i < STAGE_VISUALS.length; i++) {
        expect(STAGE_VISUALS[i].name).toBe(STAGE_NAMES[i]);
      }
    });
  });

  describe("DIFFICULTY_MULTIPLIERS", () => {
    it("level 1 is 1.0 (baseline)", () => {
      expect(DIFFICULTY_MULTIPLIERS[1]).toBe(1.0);
    });

    it("multipliers increase with difficulty level", () => {
      const levels = Object.keys(DIFFICULTY_MULTIPLIERS)
        .map(Number)
        .sort((a, b) => a - b);
      for (let i = 1; i < levels.length; i++) {
        expect(DIFFICULTY_MULTIPLIERS[levels[i]]).toBeGreaterThan(
          DIFFICULTY_MULTIPLIERS[levels[i - 1]],
        );
      }
    });
  });

  describe("SEASON_GROWTH_MULTIPLIERS", () => {
    it("has all four seasons", () => {
      expect(SEASON_GROWTH_MULTIPLIERS.spring).toBeDefined();
      expect(SEASON_GROWTH_MULTIPLIERS.summer).toBeDefined();
      expect(SEASON_GROWTH_MULTIPLIERS.autumn).toBeDefined();
      expect(SEASON_GROWTH_MULTIPLIERS.winter).toBeDefined();
    });

    it("spring is fastest, winter stops growth", () => {
      expect(SEASON_GROWTH_MULTIPLIERS.spring).toBeGreaterThan(
        SEASON_GROWTH_MULTIPLIERS.summer,
      );
      expect(SEASON_GROWTH_MULTIPLIERS.winter).toBe(0);
    });
  });

  describe("gameplay constants", () => {
    it("WATER_BONUS is a positive multiplier > 1", () => {
      expect(WATER_BONUS).toBeGreaterThan(1);
    });

    it("DROUGHT_PENALTY is between 0 and 1", () => {
      expect(DROUGHT_PENALTY).toBeGreaterThan(0);
      expect(DROUGHT_PENALTY).toBeLessThan(1);
    });

    it("PLAYER_SPEED is positive", () => {
      expect(PLAYER_SPEED).toBeGreaterThan(0);
    });

    it("INTERACTION_RADIUS is positive", () => {
      expect(INTERACTION_RADIUS).toBeGreaterThan(0);
    });
  });

  describe("COLORS", () => {
    it("all color values are valid hex strings", () => {
      for (const [, color] of Object.entries(COLORS)) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });
});
