import { generateSeedPhrase, rngFromSeedPhrase, scopedRNG } from "./seedWords";

describe("seedWords", () => {
  describe("generateSeedPhrase", () => {
    it("returns 3 words separated by spaces", () => {
      const phrase = generateSeedPhrase(42);
      const words = phrase.split(" ");
      expect(words.length).toBe(3);
    });

    it("is deterministic for the same entropy", () => {
      expect(generateSeedPhrase(42)).toBe(generateSeedPhrase(42));
    });

    it("produces different phrases for different entropy", () => {
      expect(generateSeedPhrase(42)).not.toBe(generateSeedPhrase(99));
    });

    it("uses two different adjectives", () => {
      // Run many times to statistically verify
      for (let i = 0; i < 100; i++) {
        const phrase = generateSeedPhrase(i);
        const words = phrase.split(" ");
        expect(words[0]).not.toBe(words[1]);
      }
    });

    it("words are title-cased", () => {
      const phrase = generateSeedPhrase(42);
      const words = phrase.split(" ");
      for (const word of words) {
        expect(word[0]).toBe(word[0].toUpperCase());
      }
    });

    it("generates without entropy argument", () => {
      const phrase = generateSeedPhrase();
      expect(phrase.split(" ").length).toBe(3);
    });
  });

  describe("rngFromSeedPhrase", () => {
    it("produces deterministic values from the same phrase", () => {
      const rng1 = rngFromSeedPhrase("Gentle Mossy Hollow");
      const rng2 = rngFromSeedPhrase("Gentle Mossy Hollow");
      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
    });

    it("produces different values for different phrases", () => {
      const rng1 = rngFromSeedPhrase("Gentle Mossy Hollow");
      const rng2 = rngFromSeedPhrase("Ancient Whispering Canopy");
      expect(rng1()).not.toBe(rng2());
    });

    it("produces values in [0, 1)", () => {
      const rng = rngFromSeedPhrase("test seed");
      for (let i = 0; i < 100; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe("scopedRNG", () => {
    it("produces deterministic values for same scope and seed", () => {
      const rng1 = scopedRNG("quests", "Gentle Mossy Hollow", 5);
      const rng2 = scopedRNG("quests", "Gentle Mossy Hollow", 5);
      expect(rng1()).toBe(rng2());
    });

    it("produces different values for different scopes", () => {
      const rng1 = scopedRNG("quests", "Gentle Mossy Hollow", 5);
      const rng2 = scopedRNG("weather", "Gentle Mossy Hollow", 5);
      expect(rng1()).not.toBe(rng2());
    });

    it("produces different values for different extra params", () => {
      const rng1 = scopedRNG("quests", "Gentle Mossy Hollow", 5);
      const rng2 = scopedRNG("quests", "Gentle Mossy Hollow", 6);
      expect(rng1()).not.toBe(rng2());
    });

    it("handles string and number extra params", () => {
      const rng = scopedRNG("quests", "seed", "day", 3);
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });
  });
});
