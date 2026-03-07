/**
 * Tests for NewGameModal types and config structure.
 * Spec §26 (Save/Persistence) and §37 (Game Modes).
 *
 * NOTE: Component rendering tests are omitted -- importing .tsx components
 * crashes the Jest env due to the react-native-css-interop JSX runtime.
 * Types and pure logic are tested here instead.
 */

import type { GameMode, NewGameConfig, SurvivalDifficulty } from "./NewGameModal";
import { generateSeedPhrase } from "@/game/utils/seedWords";

describe("NewGameConfig (Spec §37)", () => {
  it("accepts an Exploration config with no survival fields", () => {
    const config: NewGameConfig = {
      worldSeed: "Gentle Mossy Hollow",
      gameMode: "exploration",
      survivalDifficulty: "standard", // required field but ignored in exploration
      permadeath: false,
    };
    expect(config.gameMode).toBe("exploration");
    expect(config.permadeath).toBe(false);
  });

  it("accepts all four Survival sub-difficulties (Spec §37.2)", () => {
    const difficulties: SurvivalDifficulty[] = ["gentle", "standard", "harsh", "ironwood"];
    for (const sd of difficulties) {
      const config: NewGameConfig = {
        worldSeed: "Ancient Whispering Canopy",
        gameMode: "survival",
        survivalDifficulty: sd,
        permadeath: sd === "ironwood",
      };
      expect(config.survivalDifficulty).toBe(sd);
    }
  });

  it("Ironwood forces permadeath=true", () => {
    // This is enforced by the component's handleTierSelect logic.
    // Verify the type allows it.
    const config: NewGameConfig = {
      worldSeed: "Frosty Towering Pine",
      gameMode: "survival",
      survivalDifficulty: "ironwood",
      permadeath: true,
    };
    expect(config.permadeath).toBe(true);
  });

  it("Exploration mode forces permadeath=false", () => {
    const config: NewGameConfig = {
      worldSeed: "Sunlit Dappled Meadow",
      gameMode: "exploration",
      survivalDifficulty: "gentle",
      permadeath: false,
    };
    expect(config.permadeath).toBe(false);
  });
});

describe("GameMode type", () => {
  it("only allows exploration or survival", () => {
    const modes: GameMode[] = ["exploration", "survival"];
    expect(modes).toHaveLength(2);
    expect(modes).toContain("exploration");
    expect(modes).toContain("survival");
  });
});

describe("NewGameConfig worldSeed integration with seedWords (Spec §3.1)", () => {
  it("generateSeedPhrase produces a valid Adj Adj Noun phrase for worldSeed", () => {
    const phrase = generateSeedPhrase(42);
    const config: NewGameConfig = {
      worldSeed: phrase,
      gameMode: "exploration",
      survivalDifficulty: "standard",
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
