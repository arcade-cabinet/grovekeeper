/**
 * Crop growth system tests.
 */
import {
  advanceCropGrowth,
  calculateHarvestYield,
  getCropById,
  getCrops,
  getCropsForLevel,
  replantCrop,
  type CropState,
} from "@/game/systems/cropGrowth";

describe("Crop Growth System", () => {
  describe("Config accessors", () => {
    it("should load all crops from config", () => {
      const crops = getCrops();
      expect(crops).toHaveLength(5);
    });

    it("should find a crop by id", () => {
      const apple = getCropById("apple");
      expect(apple).toBeDefined();
      expect(apple?.name).toBe("Apple");
    });

    it("should return undefined for unknown crop", () => {
      expect(getCropById("banana")).toBeUndefined();
    });

    it("should filter crops by player level", () => {
      const level1 = getCropsForLevel(1);
      expect(level1.length).toBeGreaterThan(0);
      for (const c of level1) {
        expect(c.unlockLevel).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Growth advancement", () => {
    const baseCrop: CropState = {
      cropId: "carrot",
      stage: 0,
      progress: 0,
      watered: false,
    };

    it("should advance progress within a stage", () => {
      const result = advanceCropGrowth(baseCrop, 10, "summer", 0, 0);
      expect(result.progress).toBeGreaterThan(0);
      expect(result.stage).toBe(0);
    });

    it("should advance to next stage when progress exceeds 1", () => {
      const result = advanceCropGrowth(baseCrop, 25, "summer", 0, 0);
      expect(result.stage).toBeGreaterThanOrEqual(1);
    });

    it("should cap at stage 3 (harvestable)", () => {
      const result = advanceCropGrowth(baseCrop, 999, "summer", 0, 0);
      expect(result.stage).toBe(3);
      expect(result.progress).toBe(1);
    });

    it("should not advance past stage 3", () => {
      const harvestable: CropState = {
        cropId: "carrot",
        stage: 3,
        progress: 1,
        watered: false,
      };
      const result = advanceCropGrowth(harvestable, 100, "summer", 0, 0);
      expect(result.stage).toBe(3);
    });

    it("should apply watering multiplier", () => {
      const dry = advanceCropGrowth(baseCrop, 5, "summer", 0, 0);
      const wet = advanceCropGrowth(
        { ...baseCrop, watered: true },
        5,
        "summer",
        0,
        0,
      );
      // Compare total progress: stage * 1 + progress
      const dryTotal = dry.stage + dry.progress;
      const wetTotal = wet.stage + wet.progress;
      expect(wetTotal).toBeGreaterThan(dryTotal);
    });

    it("should apply season affinity bonus", () => {
      const offSeason = advanceCropGrowth(baseCrop, 5, "summer", 0, 0);
      const inSeason = advanceCropGrowth(baseCrop, 5, "spring", 0, 0);
      const offTotal = offSeason.stage + offSeason.progress;
      const inTotal = inSeason.stage + inSeason.progress;
      expect(inTotal).toBeGreaterThan(offTotal);
    });

    it("should apply structure growth boost", () => {
      const noBoost = advanceCropGrowth(baseCrop, 5, "summer", 0, 0);
      const boosted = advanceCropGrowth(baseCrop, 5, "summer", 0.5, 0);
      const noTotal = noBoost.stage + noBoost.progress;
      const boostTotal = boosted.stage + boosted.progress;
      expect(boostTotal).toBeGreaterThan(noTotal);
    });
  });

  describe("Harvest", () => {
    it("should return harvest yield for harvestable crop", () => {
      const crop: CropState = {
        cropId: "carrot",
        stage: 3,
        progress: 1,
        watered: false,
      };
      const result = calculateHarvestYield(crop, 0, 0);
      expect(result).not.toBeNull();
      expect(result!.cropId).toBe("carrot");
      expect(result!.amount).toBeGreaterThan(0);
    });

    it("should return null for non-harvestable crop", () => {
      const crop: CropState = {
        cropId: "carrot",
        stage: 1,
        progress: 0.5,
        watered: false,
      };
      expect(calculateHarvestYield(crop, 0, 0)).toBeNull();
    });

    it("should apply tool tier bonus to yield", () => {
      const crop: CropState = {
        cropId: "carrot",
        stage: 3,
        progress: 1,
        watered: false,
      };
      const base = calculateHarvestYield(crop, 0, 0);
      const boosted = calculateHarvestYield(crop, 1.0, 0);
      expect(boosted!.amount).toBeGreaterThan(base!.amount);
    });
  });

  describe("Replanting", () => {
    it("should reset crop to seed stage", () => {
      const crop: CropState = {
        cropId: "carrot",
        stage: 3,
        progress: 1,
        watered: true,
      };
      const result = replantCrop(crop);
      expect(result).not.toBeNull();
      expect(result!.stage).toBe(0);
      expect(result!.progress).toBe(0);
      expect(result!.watered).toBe(false);
    });
  });
});
