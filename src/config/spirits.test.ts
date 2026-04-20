import { describe, expect, it } from "vitest";
import { __testing, getSpiritById, SPIRITS } from "./spirits";

describe("Spirits Catalog", () => {
  it("has exactly 8 spirits", () => {
    expect(SPIRITS).toHaveLength(8);
  });

  it("returns undefined for an unknown id", () => {
    expect(getSpiritById("nonexistent-spirit")).toBeUndefined();
  });

  it("every spirit has the required fields", () => {
    for (const spirit of SPIRITS) {
      expect(spirit.id).toBeTruthy();
      expect(spirit.name).toBeTruthy();
      expect(spirit.aspect).toBeTruthy();
      expect(spirit.biome).toBeTruthy();
      expect(spirit.unlockLevel).toBeGreaterThan(0);

      // dialogue shape
      expect(typeof spirit.dialogue.greeting).toBe("string");
      expect(spirit.dialogue.greeting.length).toBeGreaterThan(0);
      expect(typeof spirit.dialogue.firstMeet).toBe("string");
      expect(spirit.dialogue.firstMeet.length).toBeGreaterThan(0);
      expect(Array.isArray(spirit.dialogue.subsequent)).toBe(true);
      expect(spirit.dialogue.subsequent.length).toBeGreaterThanOrEqual(1);

      // reward shape
      expect(spirit.reward.xp).toBeGreaterThan(0);
      expect(typeof spirit.reward.cosmeticId).toBe("string");
      expect(spirit.reward.cosmeticId.length).toBeGreaterThan(0);
      expect(typeof spirit.reward.lore).toBe("string");
      expect(spirit.reward.lore.length).toBeGreaterThan(0);

      // appearance shape
      expect(spirit.appearance.orbColorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(spirit.appearance.haloColorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(spirit.appearance.scale).toBeGreaterThan(0);
    }
  });

  it("spirit-dawn exists with correct aspect and dialogue", () => {
    const dawn = getSpiritById("spirit-dawn");
    expect(dawn).toBeDefined();
    expect(dawn!.name).toBe("Dawnfall");
    expect(dawn!.aspect).toContain("sunrise");
    expect(dawn!.dialogue.greeting.length).toBeGreaterThan(10);
    expect(dawn!.dialogue.subsequent.length).toBeGreaterThanOrEqual(2);
  });

  it("spirit-harvest is the highest-XP reward", () => {
    const harvest = getSpiritById("spirit-harvest");
    expect(harvest).toBeDefined();
    const maxXp = Math.max(...SPIRITS.map((s) => s.reward.xp));
    expect(harvest!.reward.xp).toBe(maxXp);
  });

  it("all spirit ids are unique", () => {
    const ids = SPIRITS.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("unlock levels are monotonically non-decreasing", () => {
    for (let i = 1; i < SPIRITS.length; i++) {
      expect(SPIRITS[i]!.unlockLevel).toBeGreaterThanOrEqual(
        SPIRITS[i - 1]!.unlockLevel,
      );
    }
  });

  it("getSpiritById returns spirit-rain with correct biome", () => {
    const rain = getSpiritById("spirit-rain");
    expect(rain).toBeDefined();
    expect(rain!.biome).toBe("wetland");
    expect(rain!.appearance.orbColorHex).toBe("#B3E5FC");
  });

  it("runtime validator rejects a spirit missing required fields", () => {
    expect(() =>
      __testing.validateSpirit({ id: "bad" }, "test[0]"),
    ).toThrowError(/spirits\.json: test\[0\]\.name/);
  });

  it("runtime validator rejects missing dialogue object", () => {
    expect(() =>
      __testing.validateSpirit(
        {
          id: "x",
          name: "X",
          aspect: "test",
          biome: "meadow",
          unlockLevel: 1,
        },
        "test[1]",
      ),
    ).toThrowError(/spirits\.json: test\[1\]\.dialogue must be an object/);
  });

  it("runtime validator rejects empty subsequent array", () => {
    expect(() =>
      __testing.validateSpirit(
        {
          id: "x",
          name: "X",
          aspect: "test",
          biome: "meadow",
          unlockLevel: 1,
          dialogue: { greeting: "hi", firstMeet: "hello", subsequent: [] },
          reward: { xp: 100, cosmeticId: "c", lore: "l" },
          appearance: {
            orbColorHex: "#FFFFFF",
            haloColorHex: "#000000",
            scale: 1.0,
          },
        },
        "test[2]",
      ),
    ).toThrowError(/subsequent must be a non-empty array/);
  });

  it("runtime validator rejects a top-level non-array", () => {
    expect(() =>
      __testing.validateSpiritList("not-an-array"),
    ).toThrowError(/spirits must be an array/);
  });
});
