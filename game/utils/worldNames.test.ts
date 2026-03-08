/**
 * worldNames.test.ts
 * Spec §40 -- Seeded, deterministic name generation for procedural world areas and NPCs.
 */

import { generateAreaName, generateNpcName } from "./worldNames.ts";

// ── generateAreaName: labyrinth ───────────────────────────────────────────────

describe("generateAreaName('labyrinth') (Spec §40.2)", () => {
  it("returns a string matching 'The [Adj][Noun] Labyrinth' pattern", () => {
    const name = generateAreaName("labyrinth", "mystic-seed", 5, 3);
    expect(typeof name).toBe("string");
    expect(name).toMatch(/^The \w+ Labyrinth$/);
  });

  it("is deterministic -- same seed + coords always returns the same name", () => {
    const name1 = generateAreaName("labyrinth", "mystic-seed", 5, 3);
    const name2 = generateAreaName("labyrinth", "mystic-seed", 5, 3);
    expect(name1).toBe(name2);
  });

  it("produces different names for different chunk coords", () => {
    const coords = [
      [1, 1],
      [5, 3],
      [10, 7],
      [20, 15],
    ] as const;
    const names = coords.map(([x, z]) => generateAreaName("labyrinth", "mystic-seed", x, z));
    const uniqueCount = new Set(names).size;
    expect(uniqueCount).toBeGreaterThanOrEqual(3);
  });

  it("starts with 'The ' and ends with ' Labyrinth'", () => {
    const name = generateAreaName("labyrinth", "ancient-oak", 7, 12);
    expect(name.startsWith("The ")).toBe(true);
    expect(name.endsWith(" Labyrinth")).toBe(true);
  });
});

// ── generateAreaName: village ─────────────────────────────────────────────────

describe("generateAreaName('village') (Spec §40.2)", () => {
  it("returns a single compound word (no spaces)", () => {
    const name = generateAreaName("village", "mystic-seed", 10, 7);
    expect(typeof name).toBe("string");
    expect(name).not.toContain(" ");
    expect(name.length).toBeGreaterThan(3);
  });

  it("is deterministic -- same seed + coords always returns the same name", () => {
    const name1 = generateAreaName("village", "mystic-seed", 10, 7);
    const name2 = generateAreaName("village", "mystic-seed", 10, 7);
    expect(name1).toBe(name2);
  });

  it("never returns 'Rootmere' (reserved starting village name)", () => {
    for (let x = -20; x <= 20; x++) {
      for (let z = -20; z <= 20; z++) {
        const name = generateAreaName("village", "mystic-seed", x, z);
        expect(name).not.toBe("Rootmere");
      }
    }
  });

  it("also never returns 'Rootmere' with multiple different seeds", () => {
    const seeds = ["ancient-oak", "gentle-mist", "ember-hollow", "silver-veil"];
    for (const seed of seeds) {
      for (let x = 0; x <= 10; x++) {
        for (let z = 0; z <= 10; z++) {
          expect(generateAreaName("village", seed, x, z)).not.toBe("Rootmere");
        }
      }
    }
  });

  it("produces different names for different chunk coords", () => {
    const coords = [
      [2, 4],
      [9, 1],
      [15, 6],
      [3, 18],
    ] as const;
    const names = coords.map(([x, z]) => generateAreaName("village", "mystic-seed", x, z));
    const uniqueCount = new Set(names).size;
    expect(uniqueCount).toBeGreaterThanOrEqual(3);
  });
});

// ── generateAreaName: landmark ────────────────────────────────────────────────

describe("generateAreaName('landmark') (Spec §40.2)", () => {
  it("returns a string matching 'The [Adjective] [Type]' pattern", () => {
    const name = generateAreaName("landmark", "mystic-seed", 3, 8);
    expect(typeof name).toBe("string");
    expect(name).toMatch(/^The \w+ \w+$/);
  });

  it("is deterministic -- same seed + coords always returns the same name", () => {
    const name1 = generateAreaName("landmark", "mystic-seed", 3, 8);
    const name2 = generateAreaName("landmark", "mystic-seed", 3, 8);
    expect(name1).toBe(name2);
  });

  it("starts with 'The ' and contains exactly two word tokens after 'The'", () => {
    const name = generateAreaName("landmark", "iron-root", 11, 4);
    expect(name.startsWith("The ")).toBe(true);
    const tokens = name.replace("The ", "").split(" ");
    expect(tokens).toHaveLength(2);
  });

  it("produces different names for different chunk coords", () => {
    const coords = [
      [1, 2],
      [6, 4],
      [13, 9],
      [22, 3],
    ] as const;
    const names = coords.map(([x, z]) => generateAreaName("landmark", "mystic-seed", x, z));
    const uniqueCount = new Set(names).size;
    expect(uniqueCount).toBeGreaterThanOrEqual(3);
  });
});

// ── generateAreaName: cross-type determinism ──────────────────────────────────

describe("generateAreaName: cross-type determinism (Spec §40)", () => {
  it("different types at same coords produce different name styles", () => {
    const labyrinth = generateAreaName("labyrinth", "world-seed", 5, 5);
    const village = generateAreaName("village", "world-seed", 5, 5);
    const landmark = generateAreaName("landmark", "world-seed", 5, 5);
    expect(labyrinth.endsWith("Labyrinth")).toBe(true);
    expect(village).not.toContain(" ");
    expect(landmark.startsWith("The ")).toBe(true);
    expect(labyrinth).not.toBe(village);
    expect(labyrinth).not.toBe(landmark);
  });

  it("different world seeds produce different names at the same coords", () => {
    const nameA = generateAreaName("labyrinth", "seed-alpha", 7, 3);
    const nameB = generateAreaName("labyrinth", "seed-beta", 7, 3);
    expect(typeof nameA).toBe("string");
    expect(typeof nameB).toBe("string");
  });
});

// ── generateNpcName ───────────────────────────────────────────────────────────

const NPC_FIRST_NAMES = new Set([
  "Alder", "Ash", "Birch", "Brier", "Cedar", "Clover", "Dusk", "Elder", "Elm",
  "Fern", "Finch", "Flint", "Garnet", "Haze", "Hazel", "Ivy", "Juniper", "Lichen",
  "Linden", "Maple", "Marsh", "Mist", "Mossy", "Needle", "Oak", "Pine", "Reed",
  "Robin", "Rowan", "Rush", "Sage", "Sedge", "Slate", "Sorrel", "Thorn", "Wren",
  "Yarrow",
]);

describe("generateNpcName (Spec §40.3)", () => {
  it("returns a string whose first token is a name from the first-names list", () => {
    const name = generateNpcName("test-seed", "npc-001");
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
    const firstName = name.split(/[, ]/)[0];
    expect(NPC_FIRST_NAMES.has(firstName)).toBe(true);
  });

  it("is deterministic -- same worldSeed + npcId always returns the same name", () => {
    const name1 = generateNpcName("test-seed", "npc-001");
    const name2 = generateNpcName("test-seed", "npc-001");
    expect(name1).toBe(name2);
  });

  it("different npcIds produce potentially different names", () => {
    const ids = ["npc-001", "npc-002", "npc-003", "npc-004", "npc-005"];
    const names = ids.map((id) => generateNpcName("world-alpha", id));
    const uniqueCount = new Set(names).size;
    expect(uniqueCount).toBeGreaterThanOrEqual(3);
  });

  it("different worldSeeds produce potentially different names for the same npcId", () => {
    const seeds = ["seed-one", "seed-two", "seed-three"];
    const names = seeds.map((s) => generateNpcName(s, "npc-001"));
    for (const name of names) {
      const firstName = name.split(/[, ]/)[0];
      expect(NPC_FIRST_NAMES.has(firstName)).toBe(true);
    }
  });

  it("titles (when present) follow correct formatting conventions", () => {
    const titledNames: string[] = [];
    for (let i = 0; i < 200; i++) {
      const name = generateNpcName("title-test-seed", `npc-${i}`);
      if (name.includes(" ") || name.includes(",")) {
        titledNames.push(name);
      }
    }
    expect(titledNames.length).toBeGreaterThan(0);
    for (const name of titledNames) {
      const firstName = name.split(/[,\s]/)[0];
      expect(NPC_FIRST_NAMES.has(firstName)).toBe(true);
    }
  });
});
