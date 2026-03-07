/**
 * Crop growth system tests.
 */
import {
  advanceCropGrowth,
  calculateHarvestYield,
  getCropById,
  getCrops,
  getCropsForLevel,
  harvestCropEntity,
  replantCrop,
  tickCropGrowth,
  type CropState,
  type CropTickEntity,
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

// ---------------------------------------------------------------------------
// ECS Tick (Spec §8)
// ---------------------------------------------------------------------------

function makeCropEntity(overrides?: Partial<CropTickEntity["crop"]>): CropTickEntity {
  return {
    id: "entity_test_1",
    crop: {
      cropId: "carrot",
      stage: 0,
      progress: 0,
      watered: false,
      modelPath: "assets/models/crops/carrot.glb",
      ...overrides,
    },
    position: { x: 0, y: 0, z: 0 },
  };
}

describe("tickCropGrowth (Spec §8)", () => {
  it("advances progress within a stage", () => {
    const entity = makeCropEntity();
    tickCropGrowth([entity], "summer", 1.0, 10);
    expect(entity.crop.progress).toBeGreaterThan(0);
    expect(entity.crop.stage).toBe(0);
  });

  it("advances stage when progress exceeds 1", () => {
    const entity = makeCropEntity();
    tickCropGrowth([entity], "summer", 1.0, 25);
    expect(entity.crop.stage).toBeGreaterThanOrEqual(1);
  });

  it("skips crops at stage 3 (harvestable)", () => {
    const entity = makeCropEntity({ stage: 3, progress: 1 });
    tickCropGrowth([entity], "summer", 1.0, 100);
    expect(entity.crop.stage).toBe(3);
    expect(entity.crop.progress).toBe(1);
  });

  it("applies weather multiplier — higher multiplier means more growth", () => {
    const slow = makeCropEntity();
    const fast = makeCropEntity();
    tickCropGrowth([slow], "summer", 0.5, 5);
    tickCropGrowth([fast], "summer", 2.0, 5);
    const slowTotal = slow.crop.stage + slow.crop.progress;
    const fastTotal = fast.crop.stage + fast.crop.progress;
    expect(fastTotal).toBeGreaterThan(slowTotal);
  });

  it("applies season affinity bonus (spring is carrot season)", () => {
    const off = makeCropEntity();
    const in_ = makeCropEntity();
    tickCropGrowth([off], "summer", 1.0, 5);
    tickCropGrowth([in_], "spring", 1.0, 5);
    const offTotal = off.crop.stage + off.crop.progress;
    const inTotal = in_.crop.stage + in_.crop.progress;
    expect(inTotal).toBeGreaterThan(offTotal);
  });

  it("watered crop grows faster than dry crop", () => {
    const dry = makeCropEntity({ watered: false });
    const wet = makeCropEntity({ watered: true });
    tickCropGrowth([dry], "summer", 1.0, 5);
    tickCropGrowth([wet], "summer", 1.0, 5);
    const dryTotal = dry.crop.stage + dry.crop.progress;
    const wetTotal = wet.crop.stage + wet.crop.progress;
    expect(wetTotal).toBeGreaterThan(dryTotal);
  });

  it("clears watered flag on stage advance", () => {
    const entity = makeCropEntity({ watered: true });
    // Force stage advance with enough dt
    tickCropGrowth([entity], "spring", 1.0, 999);
    // Stage should have advanced past 0 and watered should be cleared
    expect(entity.crop.stage).toBeGreaterThan(0);
    expect(entity.crop.watered).toBe(false);
  });

  it("processes multiple entities independently", () => {
    const a = makeCropEntity({ cropId: "carrot" });
    const b = makeCropEntity({ cropId: "pumpkin" });
    tickCropGrowth([a, b], "summer", 1.0, 10);
    // Both should have progressed; pumpkin is slower so a > b
    expect(a.crop.progress).toBeGreaterThan(0);
    expect(b.crop.progress).toBeGreaterThan(0);
    // Carrot is faster than pumpkin (20s vs 40s stage time)
    expect(a.crop.progress).toBeGreaterThan(b.crop.progress);
  });

  it("zero dt does not change crop state", () => {
    const entity = makeCropEntity({ stage: 0, progress: 0.5 });
    tickCropGrowth([entity], "summer", 1.0, 0);
    expect(entity.crop.progress).toBe(0.5);
    expect(entity.crop.stage).toBe(0);
  });
});

describe("harvestCropEntity (Spec §8)", () => {
  it("returns harvest result for stage-3 crop", () => {
    const entity = makeCropEntity({ stage: 3, progress: 1 });
    const result = harvestCropEntity(entity);
    expect(result).not.toBeNull();
    expect(result!.cropId).toBe("carrot");
    expect(result!.amount).toBeGreaterThan(0);
  });

  it("returns null for non-harvestable crop", () => {
    const entity = makeCropEntity({ stage: 1, progress: 0.5 });
    expect(harvestCropEntity(entity)).toBeNull();
  });

  it("replants crop in-place after harvest (carrot is replantable)", () => {
    const entity = makeCropEntity({ stage: 3, progress: 1 });
    harvestCropEntity(entity);
    expect(entity.crop.stage).toBe(0);
    expect(entity.crop.progress).toBe(0);
    expect(entity.crop.watered).toBe(false);
  });

  it("applies tool tier bonus to yield", () => {
    const base = makeCropEntity({ stage: 3, progress: 1 });
    const boosted = makeCropEntity({ stage: 3, progress: 1 });
    const baseResult = harvestCropEntity(base, 0);
    const boostedResult = harvestCropEntity(boosted, 1.0);
    expect(boostedResult!.amount).toBeGreaterThan(baseResult!.amount);
  });
});
