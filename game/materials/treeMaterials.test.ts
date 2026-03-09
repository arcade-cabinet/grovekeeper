/**
 * Tree material mapping tests (Spec §47)
 *
 * Covers:
 * - All 18 species IDs from species.json resolve to a valid bark key
 * - Birch group, pine group, sakura group, and oak-default group
 * - Unknown species default to bark/oak
 * - getFoliageMaterialKey: evergreen returns green in winter
 * - getFoliageMaterialKey: deciduous returns null in winter (bare branches)
 * - getFoliageMaterialKey: autumn returns leaves_autumn for all species
 * - getFoliageMaterialKey: spring/summer return leaves_green for deciduous
 */

import {
  BARK_TEXTURE_KEYS,
  FOLIAGE_TEXTURE_KEYS,
  getBarkMaterialKey,
  getFoliageMaterialKey,
} from "./treeMaterials.ts";

// All 18 species IDs from config/game/species.json (base + prestige)
const ALL_SPECIES = [
  "white-oak",
  "weeping-willow",
  "elder-pine",
  "cherry-blossom",
  "ghost-birch",
  "redwood",
  "flame-maple",
  "baobab",
  "silver-birch",
  "ironbark",
  "golden-apple",
  "mystic-fern",
  "birch",
  "elm",
  "ash",
  "maple",
  "cedar",
  "crystal-oak",
  "moonwood-ash",
  "worldtree",
];

const CONIFERS = ["elder-pine", "cedar"];
const BIRCH_GROUP = ["birch", "silver-birch", "ghost-birch"];
const PINE_GROUP = ["elder-pine", "cedar"];
const SAKURA_GROUP = ["cherry-blossom", "flame-maple", "mystic-fern"];

describe("Tree Materials — bark mapping (Spec §47.4)", () => {
  it("birch group maps to bark/birch", () => {
    for (const species of BIRCH_GROUP) {
      expect(getBarkMaterialKey(species)).toBe("bark/birch");
    }
  });

  it("pine group maps to bark/pine", () => {
    for (const species of PINE_GROUP) {
      expect(getBarkMaterialKey(species)).toBe("bark/pine");
    }
  });

  it("sakura group maps to bark/sakura", () => {
    for (const species of SAKURA_GROUP) {
      expect(getBarkMaterialKey(species)).toBe("bark/sakura");
    }
  });

  it("remaining species default to bark/oak", () => {
    const oakDefaults = ALL_SPECIES.filter(
      (s) => !BIRCH_GROUP.includes(s) && !PINE_GROUP.includes(s) && !SAKURA_GROUP.includes(s),
    );
    for (const species of oakDefaults) {
      expect(getBarkMaterialKey(species)).toBe("bark/oak");
    }
  });

  it("unknown species defaults to bark/oak", () => {
    expect(getBarkMaterialKey("unknown_tree")).toBe("bark/oak");
    expect(getBarkMaterialKey("")).toBe("bark/oak");
  });

  it("all species return a key in BARK_TEXTURE_KEYS", () => {
    for (const species of ALL_SPECIES) {
      const key = getBarkMaterialKey(species);
      expect(BARK_TEXTURE_KEYS).toContain(key);
    }
  });
});

describe("Tree Materials — foliage mapping (Spec §47.4)", () => {
  it("conifers return foliage/leaves_green in winter (evergreen)", () => {
    for (const species of CONIFERS) {
      expect(getFoliageMaterialKey(species, "winter")).toBe("foliage/leaves_green");
    }
  });

  it("deciduous species return null in winter (bare branches)", () => {
    const deciduous = ALL_SPECIES.filter((s) => !CONIFERS.includes(s));
    for (const species of deciduous) {
      expect(getFoliageMaterialKey(species, "winter")).toBeNull();
    }
  });

  it("all species return foliage/leaves_autumn in autumn", () => {
    for (const species of ALL_SPECIES) {
      expect(getFoliageMaterialKey(species, "autumn")).toBe("foliage/leaves_autumn");
    }
  });

  it("all species return foliage/leaves_green in spring", () => {
    for (const species of ALL_SPECIES) {
      expect(getFoliageMaterialKey(species, "spring")).toBe("foliage/leaves_green");
    }
  });

  it("all species return foliage/leaves_green in summer", () => {
    for (const species of ALL_SPECIES) {
      expect(getFoliageMaterialKey(species, "summer")).toBe("foliage/leaves_green");
    }
  });

  it("non-null return values exist in FOLIAGE_TEXTURE_KEYS", () => {
    const seasons = ["spring", "summer", "autumn", "winter"];
    for (const species of ALL_SPECIES) {
      for (const season of seasons) {
        const key = getFoliageMaterialKey(species, season);
        if (key !== null) {
          expect(FOLIAGE_TEXTURE_KEYS).toContain(key);
        }
      }
    }
  });
});
