import { describe, expect, it } from "vitest";
import {
  BIOME_CODEX,
  DISCOVERY_TIERS,
  getAllCodexEntries,
  getBiomeEntry,
  getCodexEntry,
} from "./codex";
import { PRESTIGE_TREE_SPECIES, TREE_SPECIES } from "./trees";

const ALL_SPECIES_IDS = [
  ...TREE_SPECIES.map((s) => s.id),
  ...PRESTIGE_TREE_SPECIES.map((s) => s.id),
];

describe("codex constants", () => {
  // =========================================================================
  // Discovery tier definitions
  // =========================================================================
  describe("DISCOVERY_TIERS", () => {
    it("defines all 5 tiers (0-4)", () => {
      for (let tier = 0; tier <= 4; tier++) {
        expect(DISCOVERY_TIERS[tier]).toBeDefined();
        expect(DISCOVERY_TIERS[tier].tier).toBe(tier);
      }
    });

    it("each tier has a non-empty name and description", () => {
      for (let tier = 0; tier <= 4; tier++) {
        expect(DISCOVERY_TIERS[tier].name.length).toBeGreaterThan(0);
        expect(DISCOVERY_TIERS[tier].description.length).toBeGreaterThan(0);
      }
    });

    it("tier names are unique", () => {
      const names = Object.values(DISCOVERY_TIERS).map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  // =========================================================================
  // Species codex entries
  // =========================================================================
  describe("species codex entries", () => {
    it("has an entry for every species in trees.ts", () => {
      for (const speciesId of ALL_SPECIES_IDS) {
        const entry = getCodexEntry(speciesId);
        expect(
          entry,
          `Missing codex entry for species: ${speciesId}`,
        ).toBeDefined();
      }
    });

    it("every entry has all 4 lore tiers", () => {
      const entries = getAllCodexEntries();
      for (const entry of entries) {
        expect(
          entry.lore.tier1.length,
          `${entry.speciesId} tier1 lore is empty`,
        ).toBeGreaterThan(0);
        expect(
          entry.lore.tier2.length,
          `${entry.speciesId} tier2 lore is empty`,
        ).toBeGreaterThan(0);
        expect(
          entry.lore.tier3.length,
          `${entry.speciesId} tier3 lore is empty`,
        ).toBeGreaterThan(0);
        expect(
          entry.lore.tier4.length,
          `${entry.speciesId} tier4 lore is empty`,
        ).toBeGreaterThan(0);
      }
    });

    it("every entry has a non-empty habitat", () => {
      const entries = getAllCodexEntries();
      for (const entry of entries) {
        expect(
          entry.habitat.length,
          `${entry.speciesId} habitat is empty`,
        ).toBeGreaterThan(0);
      }
    });

    it("every entry has a non-empty growthTip", () => {
      const entries = getAllCodexEntries();
      for (const entry of entries) {
        expect(
          entry.growthTip.length,
          `${entry.speciesId} growthTip is empty`,
        ).toBeGreaterThan(0);
      }
    });

    it("every entry has a non-empty funFact", () => {
      const entries = getAllCodexEntries();
      for (const entry of entries) {
        expect(
          entry.funFact.length,
          `${entry.speciesId} funFact is empty`,
        ).toBeGreaterThan(0);
      }
    });

    it("species IDs in codex match species IDs in trees.ts exactly", () => {
      const entries = getAllCodexEntries();
      const codexIds = entries.map((e) => e.speciesId).sort();
      const treeIds = [...ALL_SPECIES_IDS].sort();
      expect(codexIds).toEqual(treeIds);
    });

    it("no duplicate species IDs in codex", () => {
      const entries = getAllCodexEntries();
      const ids = entries.map((e) => e.speciesId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("total entry count matches total species count (15)", () => {
      const entries = getAllCodexEntries();
      expect(entries.length).toBe(15);
    });
  });

  // =========================================================================
  // getCodexEntry helper
  // =========================================================================
  describe("getCodexEntry", () => {
    it("returns entry for known species", () => {
      const entry = getCodexEntry("white-oak");
      expect(entry).toBeDefined();
      expect(entry!.speciesId).toBe("white-oak");
    });

    it("returns undefined for unknown species", () => {
      expect(getCodexEntry("nonexistent-tree")).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      expect(getCodexEntry("")).toBeUndefined();
    });
  });

  // =========================================================================
  // Biome codex entries
  // =========================================================================
  describe("biome codex entries", () => {
    it("has at least one biome entry", () => {
      expect(BIOME_CODEX.length).toBeGreaterThan(0);
    });

    it("every biome has a non-empty name, description, and climate", () => {
      for (const biome of BIOME_CODEX) {
        expect(biome.name.length, `${biome.id} name is empty`).toBeGreaterThan(
          0,
        );
        expect(
          biome.description.length,
          `${biome.id} description is empty`,
        ).toBeGreaterThan(0);
        expect(
          biome.climate.length,
          `${biome.id} climate is empty`,
        ).toBeGreaterThan(0);
      }
    });

    it("every biome has at least one native species", () => {
      for (const biome of BIOME_CODEX) {
        expect(
          biome.nativeSpecies.length,
          `${biome.id} has no native species`,
        ).toBeGreaterThan(0);
      }
    });

    it("all native species references exist in trees.ts", () => {
      for (const biome of BIOME_CODEX) {
        for (const speciesId of biome.nativeSpecies) {
          expect(
            ALL_SPECIES_IDS,
            `Biome ${biome.id} references unknown species: ${speciesId}`,
          ).toContain(speciesId);
        }
      }
    });

    it("no duplicate biome IDs", () => {
      const ids = BIOME_CODEX.map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("every species biome from trees.ts has a matching biome codex entry", () => {
      const biomeIds = BIOME_CODEX.map((b) => b.id);
      const speciesBiomes = new Set(
        [...TREE_SPECIES, ...PRESTIGE_TREE_SPECIES].map((s) =>
          s.biome.toLowerCase().replace(/\s+/g, "-"),
        ),
      );
      for (const biome of speciesBiomes) {
        expect(biomeIds, `No biome codex entry for biome: ${biome}`).toContain(
          biome,
        );
      }
    });
  });

  // =========================================================================
  // getBiomeEntry helper
  // =========================================================================
  describe("getBiomeEntry", () => {
    it("returns entry for known biome", () => {
      const entry = getBiomeEntry("temperate");
      expect(entry).toBeDefined();
      expect(entry!.id).toBe("temperate");
    });

    it("normalizes biome names with spaces", () => {
      const entry = getBiomeEntry("Tundra Edge");
      expect(entry).toBeDefined();
      expect(entry!.id).toBe("tundra-edge");
    });

    it("returns undefined for unknown biome", () => {
      expect(getBiomeEntry("nonexistent-biome")).toBeUndefined();
    });
  });
});
