import { describe, expect, it, vi } from "vitest";
import { getBiome, listBiomes } from "./biomes";
import { registerBiomeBlocks } from "./blockRegistry";

describe("registerBiomeBlocks", () => {
  it("calls register() once per block in the biome's definition", () => {
    const meadow = getBiome("meadow");
    const register = vi.fn();
    registerBiomeBlocks({ register }, meadow);
    expect(register).toHaveBeenCalledTimes(meadow.blocks.length);
    for (const def of meadow.blocks) {
      expect(register).toHaveBeenCalledWith(def);
    }
  });

  it("works for every biome, registering exactly that biome's blocks", () => {
    for (const biome of listBiomes()) {
      const register = vi.fn();
      registerBiomeBlocks({ register }, biome);
      expect(register).toHaveBeenCalledTimes(biome.blocks.length);
      // Every call argument should be a block belonging to *this* biome
      // (so we can't mix two biomes into one register call by accident).
      for (const call of register.mock.calls) {
        const def = call[0];
        expect(biome.blocks).toContain(def);
      }
    }
  });

  it("safely composes — registering two biomes adds both block sets", () => {
    const meadow = getBiome("meadow");
    const forest = getBiome("forest");
    const register = vi.fn();
    registerBiomeBlocks({ register }, meadow);
    registerBiomeBlocks({ register }, forest);
    expect(register).toHaveBeenCalledTimes(
      meadow.blocks.length + forest.blocks.length,
    );
  });
});
