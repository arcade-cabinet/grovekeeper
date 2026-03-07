/**
 * Tests for SeedSelect types and helper logic.
 * (Component rendering tests require @testing-library/react-native)
 */

import type { SeedSelectSpecies } from "./SeedSelect.tsx";

describe("SeedSelectSpecies type", () => {
  it("accepts a valid species object", () => {
    const species: SeedSelectSpecies = {
      id: "white-oak",
      name: "White Oak",
      difficulty: 1,
      unlockLevel: 1,
      biome: "forest",
      special: "Hardy and fast-growing",
      seedCost: {},
      trunkColor: "#8B4513",
      canopyColor: "#81C784",
    };
    expect(species.id).toBe("white-oak");
    expect(species.difficulty).toBe(1);
  });
});
