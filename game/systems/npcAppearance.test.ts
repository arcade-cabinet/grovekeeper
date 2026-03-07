/**
 * Tests for NPC seeded appearance generation.
 * Spec: NPC appearance assembly via scopedRNG (GAME_SPEC.md NPC section).
 */

import { generateNpcAppearance } from "./npcAppearance.ts";

describe("generateNpcAppearance", () => {
  it("should return deterministic appearance for same inputs", () => {
    const a1 = generateNpcAppearance("elder-rowan", "TestSeed", "tips");
    const a2 = generateNpcAppearance("elder-rowan", "TestSeed", "tips");
    expect(a1).toEqual(a2);
  });

  it("should produce different appearances for different seeds", () => {
    const a1 = generateNpcAppearance("elder-rowan", "TestSeed", "tips");
    const a2 = generateNpcAppearance("hazel", "TestSeed", "trading");
    // At least one field should differ
    const same =
      a1.baseModel === a2.baseModel &&
      a1.colorPalette === a2.colorPalette &&
      JSON.stringify(a1.items) === JSON.stringify(a2.items);
    expect(same).toBe(false);
  });

  it("should produce different appearances for different world seeds", () => {
    const a1 = generateNpcAppearance("elder-rowan", "SeedA", "tips");
    const a2 = generateNpcAppearance("elder-rowan", "SeedB", "tips");
    const same =
      a1.baseModel === a2.baseModel &&
      a1.colorPalette === a2.colorPalette &&
      JSON.stringify(a1.items) === JSON.stringify(a2.items);
    expect(same).toBe(false);
  });

  it("should always have a valid base model", () => {
    const validBases = ["basemesh", "archer", "knight", "merchant", "ninja", "student"];
    for (let i = 0; i < 20; i++) {
      const appearance = generateNpcAppearance(`npc-${i}`, "TestSeed", "trading");
      expect(validBases).toContain(appearance.baseModel);
    }
  });

  it("should never include allinone as base model", () => {
    for (let i = 0; i < 50; i++) {
      const appearance = generateNpcAppearance(`npc-${i}`, "TestSeed", "crafting");
      expect(appearance.baseModel).not.toBe("allinone");
    }
  });

  it("should always have a colorPalette as hex string", () => {
    const appearance = generateNpcAppearance("test", "TestSeed", "lore");
    expect(appearance.colorPalette).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("should have useEmission as boolean", () => {
    const appearance = generateNpcAppearance("test", "TestSeed", "tips");
    expect(typeof appearance.useEmission).toBe("boolean");
  });

  it("should only assign items to valid slots", () => {
    const validSlots = ["head", "torso", "legs", "feet", "accessory"];
    for (let i = 0; i < 20; i++) {
      const appearance = generateNpcAppearance(`npc-${i}`, "TestSeed", "quests");
      for (const slot of Object.keys(appearance.items)) {
        expect(validSlots).toContain(slot);
      }
    }
  });

  it("should not assign incompatible items together", () => {
    const incompatibleSets = [
      ["ninjassuit", "greenoutfit", "amorplastron", "amorarm"],
      ["ninjassuitthigh", "armorlegs", "armorthigh", "armorceinturethighs"],
      ["ninjassuitshoe", "armorshoe", "bottes", "bottesgreen"],
      ["ninjassuitmask", "hat", "armorhelmet"],
    ];

    for (let i = 0; i < 50; i++) {
      const appearance = generateNpcAppearance(`npc-${i}`, "TestSeed", "crafting");
      const itemIds = Object.values(appearance.items) as string[];
      for (const set of incompatibleSets) {
        const matches = itemIds.filter((id) => set.includes(id));
        expect(matches.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("should produce all 6 base models across enough seeds", () => {
    const reached = new Set<string>();
    const roles = ["trading", "quests", "tips", "seeds", "crafting", "lore"];
    for (let i = 0; i < 500; i++) {
      const role = roles[i % roles.length];
      const appearance = generateNpcAppearance(`npc-${i}`, `Seed${i}`, role);
      reached.add(appearance.baseModel);
    }
    const expected = ["basemesh", "archer", "knight", "merchant", "ninja", "student"];
    for (const model of expected) {
      expect(reached).toContain(model);
    }
  });

  it("should favor role-appropriate base models", () => {
    const tradingBases: string[] = [];
    for (let i = 0; i < 100; i++) {
      const appearance = generateNpcAppearance(`trader-${i}`, "TestSeed", "trading");
      tradingBases.push(appearance.baseModel);
    }
    const merchantCount = tradingBases.filter((b) => b === "merchant").length;
    // merchant should appear more than 10% of the time for trading role
    expect(merchantCount).toBeGreaterThan(10);
  });
});
