/**
 * codexPanelLogic.test.ts -- Tests for Species Codex display logic.
 * Spec §8 (Species Codex), §25 (Discovery)
 */

import type { SpeciesProgress } from "@/game/systems/speciesDiscovery";
import {
  buildCodexRows,
  formatDifficulty,
  formatDiscoveryProgress,
  getTierLabel,
  type SpeciesInput,
} from "./codexPanelLogic.ts";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_SPECIES: SpeciesInput[] = [
  {
    id: "white-oak",
    name: "White Oak",
    biome: "Temperate",
    difficulty: 1,
    meshParams: { color: { trunk: "#8B6914", canopy: "#2E7D32" } },
  },
  {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    biome: "Temperate",
    difficulty: 2,
    meshParams: { color: { trunk: "#6D4C41", canopy: "#F48FB1" } },
  },
  {
    id: "crystal-oak",
    name: "Crystal Oak",
    biome: "Enchanted",
    difficulty: 4,
    meshParams: { color: { trunk: "#B0BEC5", canopy: "#E1F5FE" } },
    requiredPrestiges: 1,
  },
];

function makeProgress(tier: 0 | 1 | 2 | 3 | 4): SpeciesProgress {
  return {
    timesPlanted: tier >= 1 ? 1 : 0,
    maxStageReached: tier >= 3 ? 4 : tier >= 2 ? 3 : 0,
    timesHarvested: tier >= 4 ? 10 : 0,
    totalYield: 0,
    discoveryTier: tier,
    seenInWild: false,
  };
}

// ---------------------------------------------------------------------------
// buildCodexRows
// ---------------------------------------------------------------------------

describe("buildCodexRows (Spec §8)", () => {
  it("should return a row for each species", () => {
    const rows = buildCodexRows({}, MOCK_SPECIES);
    expect(rows).toHaveLength(3);
  });

  it("should mark undiscovered species with tier 0 and isDiscovered=false", () => {
    const rows = buildCodexRows({}, MOCK_SPECIES);
    for (const row of rows) {
      expect(row.discoveryTier).toBe(0);
      expect(row.isDiscovered).toBe(false);
    }
  });

  it("should pick up discovery tier from speciesProgress", () => {
    const progress: Record<string, SpeciesProgress> = {
      "white-oak": makeProgress(2),
      "cherry-blossom": makeProgress(1),
    };
    const rows = buildCodexRows(progress, MOCK_SPECIES);
    const oak = rows.find((r) => r.speciesId === "white-oak");
    const cherry = rows.find((r) => r.speciesId === "cherry-blossom");
    expect(oak?.discoveryTier).toBe(2);
    expect(oak?.isDiscovered).toBe(true);
    expect(cherry?.discoveryTier).toBe(1);
    expect(cherry?.isDiscovered).toBe(true);
  });

  it("should sort discovered species before undiscovered", () => {
    const progress: Record<string, SpeciesProgress> = {
      "cherry-blossom": makeProgress(1),
    };
    const rows = buildCodexRows(progress, MOCK_SPECIES);
    expect(rows[0].speciesId).toBe("cherry-blossom");
    // Undiscovered sorted alphabetically
    expect(rows[1].isDiscovered).toBe(false);
    expect(rows[2].isDiscovered).toBe(false);
  });

  it("should sort alphabetically within discovered and undiscovered groups", () => {
    const progress: Record<string, SpeciesProgress> = {
      "white-oak": makeProgress(1),
      "cherry-blossom": makeProgress(1),
    };
    const rows = buildCodexRows(progress, MOCK_SPECIES);
    // Both discovered, sorted alphabetically
    expect(rows[0].name).toBe("Cherry Blossom");
    expect(rows[1].name).toBe("White Oak");
  });

  it("should flag prestige species correctly", () => {
    const rows = buildCodexRows({}, MOCK_SPECIES);
    const crystal = rows.find((r) => r.speciesId === "crystal-oak");
    const oak = rows.find((r) => r.speciesId === "white-oak");
    expect(crystal?.isPrestige).toBe(true);
    expect(oak?.isPrestige).toBe(false);
  });

  it("should include color data from meshParams", () => {
    const rows = buildCodexRows({}, MOCK_SPECIES);
    const oak = rows.find((r) => r.speciesId === "white-oak");
    expect(oak?.trunkColor).toBe("#8B6914");
    expect(oak?.canopyColor).toBe("#2E7D32");
  });
});

// ---------------------------------------------------------------------------
// formatDiscoveryProgress
// ---------------------------------------------------------------------------

describe("formatDiscoveryProgress (Spec §8)", () => {
  it("should format as 'X / Y Discovered'", () => {
    expect(formatDiscoveryProgress(5, 15)).toBe("5 / 15 Discovered");
  });

  it("should handle zero discovered", () => {
    expect(formatDiscoveryProgress(0, 15)).toBe("0 / 15 Discovered");
  });

  it("should handle all discovered", () => {
    expect(formatDiscoveryProgress(15, 15)).toBe("15 / 15 Discovered");
  });
});

// ---------------------------------------------------------------------------
// getTierLabel
// ---------------------------------------------------------------------------

describe("getTierLabel (Spec §8)", () => {
  it("should return correct labels for each tier", () => {
    expect(getTierLabel(0)).toBe("Unknown");
    expect(getTierLabel(1)).toBe("Discovered");
    expect(getTierLabel(2)).toBe("Studied");
    expect(getTierLabel(3)).toBe("Mastered");
    expect(getTierLabel(4)).toBe("Legendary");
  });
});

// ---------------------------------------------------------------------------
// formatDifficulty
// ---------------------------------------------------------------------------

describe("formatDifficulty (Spec §8)", () => {
  it("should return stars matching difficulty", () => {
    expect(formatDifficulty(1)).toBe("\u2605");
    expect(formatDifficulty(3)).toBe("\u2605\u2605\u2605");
    expect(formatDifficulty(5)).toBe("\u2605\u2605\u2605\u2605\u2605");
  });

  it("should clamp to 1-5 range", () => {
    expect(formatDifficulty(0)).toBe("\u2605");
    expect(formatDifficulty(7)).toBe("\u2605\u2605\u2605\u2605\u2605");
  });
});
