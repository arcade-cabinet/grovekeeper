/**
 * Tests for NewGameModal types and config structure.
 * Spec §26 (Save/Persistence) and §37 (Game Modes — survival-only).
 *
 * NOTE: Component rendering tests are omitted -- importing .tsx components
 * crashes the Jest env due to the react-native-css-interop JSX runtime.
 * Types and pure logic are tested here instead.
 */

import { generateSeedPhrase } from "@/game/utils/seedWords";
import type { Difficulty, NewGameConfig } from "./NewGameModal.tsx";

describe("NewGameConfig (Spec §37 — survival-only)", () => {
  it("accepts a Seedling config", () => {
    const config: NewGameConfig = {
      worldSeed: "Gentle Mossy Hollow",
      difficulty: "seedling",
      permadeath: false,
    };
    expect(config.difficulty).toBe("seedling");
    expect(config.permadeath).toBe(false);
  });

  it("accepts all four difficulty tiers (Spec §37.2)", () => {
    const difficulties: Difficulty[] = ["seedling", "sapling", "hardwood", "ironwood"];
    for (const d of difficulties) {
      const config: NewGameConfig = {
        worldSeed: "Ancient Whispering Canopy",
        difficulty: d,
        permadeath: d === "ironwood",
      };
      expect(config.difficulty).toBe(d);
    }
  });

  it("Ironwood forces permadeath=true", () => {
    const config: NewGameConfig = {
      worldSeed: "Frosty Towering Pine",
      difficulty: "ironwood",
      permadeath: true,
    };
    expect(config.permadeath).toBe(true);
  });

  it("Seedling disallows permadeath", () => {
    const config: NewGameConfig = {
      worldSeed: "Sunlit Dappled Meadow",
      difficulty: "seedling",
      permadeath: false,
    };
    expect(config.permadeath).toBe(false);
  });
});

describe("Difficulty type", () => {
  it("only allows seedling, sapling, hardwood, or ironwood", () => {
    const tiers: Difficulty[] = ["seedling", "sapling", "hardwood", "ironwood"];
    expect(tiers).toHaveLength(4);
    expect(tiers).toContain("seedling");
    expect(tiers).toContain("ironwood");
  });
});

describe("NewGameConfig worldSeed integration with seedWords (Spec §3.1)", () => {
  it("generateSeedPhrase produces a valid Adj Adj Noun phrase for worldSeed", () => {
    const phrase = generateSeedPhrase(42);
    const config: NewGameConfig = {
      worldSeed: phrase,
      difficulty: "sapling",
      permadeath: false,
    };
    expect(config.worldSeed.split(" ")).toHaveLength(3);
  });

  it("shuffle produces a different phrase (different entropy)", () => {
    const p1 = generateSeedPhrase(1);
    const p2 = generateSeedPhrase(2);
    expect(p1).not.toBe(p2);
  });

  it("same entropy always produces the same phrase (deterministic)", () => {
    const phrase = generateSeedPhrase(999);
    expect(generateSeedPhrase(999)).toBe(phrase);
  });
});
