import {
  calcGrowthRate,
  type GrowthRateParams,
  getStageScale,
  MAX_STAGE,
  SEASON_GROWTH_MULTIPLIERS,
  STAGE_VISUALS,
  WATER_BONUS,
} from "@/game/systems/growth";

describe("growth system", () => {
  // ── getStageScale ────────────────────────────────────────────────

  describe("getStageScale", () => {
    it("returns base scale at progress 0", () => {
      for (let stage = 0; stage <= MAX_STAGE; stage++) {
        expect(getStageScale(stage, 0)).toBe(STAGE_VISUALS[stage].scale);
      }
    });

    it("interpolates partially toward next stage scale", () => {
      // At stage 0, progress 0.5: baseScale + (nextScale - baseScale) * 0.5 * 0.3
      const base = STAGE_VISUALS[0].scale; // 0.08
      const next = STAGE_VISUALS[1].scale; // 0.15
      const expected = base + (next - base) * 0.5 * 0.3;
      expect(getStageScale(0, 0.5)).toBeCloseTo(expected, 6);
    });

    it("returns max stage scale when at max stage regardless of progress", () => {
      const maxScale = STAGE_VISUALS[MAX_STAGE].scale;
      expect(getStageScale(MAX_STAGE, 0)).toBe(maxScale);
      expect(getStageScale(MAX_STAGE, 0.5)).toBe(maxScale);
      expect(getStageScale(MAX_STAGE, 1.0)).toBe(maxScale);
    });

    it("clamps negative stage to 0", () => {
      expect(getStageScale(-1, 0)).toBe(STAGE_VISUALS[0].scale);
    });

    it("clamps stage above max to max", () => {
      expect(getStageScale(MAX_STAGE + 5, 0)).toBe(STAGE_VISUALS[MAX_STAGE].scale);
    });

    it("floors fractional stage values", () => {
      // Stage 1.7 should behave like stage 1
      const base = STAGE_VISUALS[1].scale;
      expect(getStageScale(1.7, 0)).toBe(base);
    });

    it("approaches 30% of next scale at progress 1.0", () => {
      const base = STAGE_VISUALS[2].scale;
      const next = STAGE_VISUALS[3].scale;
      const expected = base + (next - base) * 1.0 * 0.3;
      expect(getStageScale(2, 1.0)).toBeCloseTo(expected, 6);
    });
  });

  // ── calcGrowthRate ───────────────────────────────────────────────

  describe("calcGrowthRate", () => {
    const baseParams: GrowthRateParams = {
      baseTime: 10,
      difficulty: 1,
      season: "summer",
      watered: false,
      evergreen: false,
    };

    it("returns basic growth rate in summer without water", () => {
      // summer mult = 1.0, no water, difficulty 1 = 1.0
      // rate = 1.0 * 1.0 / (10 * 1.0) = 0.1
      const rate = calcGrowthRate(baseParams);
      expect(rate).toBeCloseTo(0.1, 6);
    });

    it("applies spring season multiplier", () => {
      const rate = calcGrowthRate({ ...baseParams, season: "spring" });
      // spring mult = 1.5 => 1.5 / 10 = 0.15
      expect(rate).toBeCloseTo(SEASON_GROWTH_MULTIPLIERS.spring / baseParams.baseTime, 6);
    });

    it("applies autumn season multiplier", () => {
      const rate = calcGrowthRate({ ...baseParams, season: "autumn" });
      expect(rate).toBeCloseTo(SEASON_GROWTH_MULTIPLIERS.autumn / baseParams.baseTime, 6);
    });

    it("returns 0 in winter for non-evergreen trees", () => {
      const rate = calcGrowthRate({ ...baseParams, season: "winter" });
      expect(rate).toBe(0);
    });

    it("applies evergreen override in winter (0.3 multiplier)", () => {
      const rate = calcGrowthRate({
        ...baseParams,
        season: "winter",
        evergreen: true,
      });
      // 0.3 * 1.0 / (10 * 1.0) = 0.03
      expect(rate).toBeCloseTo(0.03, 6);
    });

    it("gives ghost-birch 0.5 multiplier in winter", () => {
      const rate = calcGrowthRate({
        ...baseParams,
        season: "winter",
        speciesId: "ghost-birch",
      });
      // 0.5 / 10 = 0.05
      expect(rate).toBeCloseTo(0.05, 6);
    });

    it("applies water bonus multiplier", () => {
      const rate = calcGrowthRate({ ...baseParams, watered: true });
      // 1.0 * WATER_BONUS / 10 = 1.3 / 10 = 0.13
      expect(rate).toBeCloseTo(WATER_BONUS / baseParams.baseTime, 6);
    });

    it("applies difficulty scaling", () => {
      const rate = calcGrowthRate({ ...baseParams, difficulty: 3 });
      // difficulty 3 => mult 1.5; rate = 1.0 / (10 * 1.5) = 0.0667
      expect(rate).toBeCloseTo(1.0 / (10 * 1.5), 4);
    });

    it("applies difficulty 5 (hardest)", () => {
      const rate = calcGrowthRate({ ...baseParams, difficulty: 5 });
      // difficulty 5 => mult 2.5; rate = 1.0 / (10 * 2.5) = 0.04
      expect(rate).toBeCloseTo(0.04, 6);
    });

    it("combines season, water, and difficulty", () => {
      const rate = calcGrowthRate({
        baseTime: 20,
        difficulty: 2,
        season: "spring",
        watered: true,
        evergreen: false,
      });
      // 1.5 * 1.3 / (20 * 1.2) = 1.95 / 24 = 0.08125
      expect(rate).toBeCloseTo((1.5 * 1.3) / (20 * 1.2), 6);
    });

    it("returns 0 for baseTime <= 0", () => {
      expect(calcGrowthRate({ ...baseParams, baseTime: 0 })).toBe(0);
      expect(calcGrowthRate({ ...baseParams, baseTime: -5 })).toBe(0);
    });

    it("defaults to 1.0 for unknown difficulty", () => {
      const rate = calcGrowthRate({ ...baseParams, difficulty: 99 });
      // unknown difficulty => mult 1.0
      expect(rate).toBeCloseTo(0.1, 6);
    });

    it("defaults to 1.0 for unknown season", () => {
      const rate = calcGrowthRate({ ...baseParams, season: "monsoon" });
      // unknown season => mult 1.0 (same as summer)
      expect(rate).toBeCloseTo(0.1, 6);
    });
  });
});
